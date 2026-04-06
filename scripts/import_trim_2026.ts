import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as xlsx from 'xlsx';
import path from "path";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function setupTypeCharges() {
  const types = ['DET', 'RENO', 'LAF'];
  for (const t of types) {
    await prisma.typeCharge.upsert({
      where: { nom: t },
      update: {},
      create: { nom: t }
    });
  }
}

function excelDateToJS(serial: any) {
  if (!serial || typeof serial !== 'number') return null;
  return new Date((serial - 25569) * 86400 * 1000);
}

function parseDate(val: any) {
  if (!val) return null;
  if (typeof val === 'number') return excelDateToJS(val);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function importer() {
  await setupTypeCharges();
  console.log("Lecture du fichier Excel (1ER TRIM 2026)...");
  const workbook = xlsx.readFile('SUIVI-RELACHE-1ER TRIM 2026.xlsx');

  let totalVoyages = 0;
  let totalBLs = 0;

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'TABLO DE BORD') continue;

    try {
      const sheet = workbook.Sheets[sheetName];
      const sheetJson = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
      
      if (sheetJson.length < 2) continue;

      const shipVoyageRow = sheetJson[0];
      const etdRow = sheetJson[1];

      // BETTER VESSEL/VOYAGE DETECTION FROM ROW 0
      let nomNavire = shipVoyageRow?.[0]?.toString()?.trim();
      let numVoyage = shipVoyageRow?.[1]?.toString()?.trim() || "UNKNOWN";
      
      // Fallback to sheet name if Row 0 is weird
      if (!nomNavire || nomNavire.length < 3) {
        nomNavire = sheetName.trim();
        const parts = nomNavire.split(/\s+/);
        if (parts.length > 1) {
          numVoyage = parts.pop()!;
          nomNavire = parts.join(' ');
        }
      }

      // Handle "ETD" or "ETD "
      let etdValue = null;
      if (etdRow && etdRow[0] && etdRow[0].toString().trim().toUpperCase() === 'ETD') {
        etdValue = etdRow[1];
      }

      const etdParsed = parseDate(etdValue);

      // STRICT FILTER: Only 2026
      if (!etdParsed || etdParsed.getFullYear() !== 2026) {
        console.log(`Skipping [${nomNavire}] (${numVoyage}) - Date ${etdParsed ? etdParsed.getFullYear() : 'INCONNUE'} is NOT 2026`);
        continue;
      }

      console.log(`\nImport de [${nomNavire}] (V. ${numVoyage}) - ETD: ${etdParsed.toISOString().split('T')[0]}`);

      const navire = await prisma.navire.upsert({
        where: { nom: nomNavire },
        update: {},
        create: { nom: nomNavire }
      });

      let dbVoyage = await prisma.voyage.findFirst({
          where: { navireId: navire.id, numero: numVoyage }
      });
      if (!dbVoyage) {
          dbVoyage = await prisma.voyage.create({
              data: { navireId: navire.id, numero: numVoyage, etd: etdParsed }
          });
      } else {
          dbVoyage = await prisma.voyage.update({
              where: { id: dbVoyage.id },
              data: { etd: etdParsed }
          });
      }
      
      totalVoyages++;

      // Find Headers
      let headerIdx = -1;
      for (let i = 2; i < Math.min(20, sheetJson.length); i++) {
        const row = sheetJson[i];
        if (row && row.some(c => typeof c === 'string' && (c.toUpperCase().includes('BKG') || c.toUpperCase().includes('BOOKING')))) {
            headerIdx = i;
            break;
        }
      }

      if (headerIdx === -1) {
         console.log(`-> Skipped (Pas de colonne BKG trouvée)`);
         continue;
      }

      const headers = sheetJson[headerIdx].map(h => h ? h.toString().toUpperCase().replace(/[\s_]/g, '').replace(/\(LISTE\)/g, '') : '');
      const findCol = (searchTerms: string[]) => headers.findIndex(h => searchTerms.some(term => h.includes(term)));

      const colMap = {
        bkg: findCol(['BKG', 'BOOKING']),
        pod: findCol(['POD']),
        shipper: findCol(['SHIPPER']),
        fret: findCol(['RATE', 'STATUTBL', 'FRET']), // STATUT BL (LISTE) or RATE (LISTE)
        okprint: findCol(['OKPRINT', 'STATUTBL']),  // STATUT BL (LISTE) can also mean correction status
        retrait: findCol(['RETRAIT']),
        timbre: findCol(['TIMBRE']),
        dretrait: findCol(['DRETRAIT', 'D.RETRAIT']),
        connais: findCol(['CONNAIS']), // Type Connaissement
        det: findCol(['DET']),
        reno: findCol(['RENO']),
        laf: findCol(['LAF']),
        remarque: findCol(['REMARQUE', 'COMMENTAIRE'])
      };

      let count = 0;
      for (let i = headerIdx + 1; i < sheetJson.length; i++) {
          const row = sheetJson[i];
          if (!row || colMap.bkg === -1) continue;
          
          let booking = row[colMap.bkg];
          if (!booking) continue;
          booking = booking.toString().trim().toUpperCase();
          if (booking.length < 3) continue;

          const pod = colMap.pod !== -1 && row[colMap.pod] ? row[colMap.pod].toString().trim() : null;
          const shipper = colMap.shipper !== -1 && row[colMap.shipper] ? row[colMap.shipper].toString().trim() : null;
          const statutFret = colMap.fret !== -1 && row[colMap.fret] ? row[colMap.fret].toString().trim() : null;
          
          // Statut correction can be in a separate column or inferred
          let statutCorrection = colMap.okprint !== -1 && row[colMap.okprint] ? row[colMap.okprint].toString().trim() : null;
          if (statutCorrection === statutFret) {
              // Usually the spreadsheet has "Statut BL (liste)" as correction if "Rate(liste)" is there
              const rateCol = findCol(['RATE']);
              const statutBlCol = findCol(['STATUTBL']);
              if (rateCol !== -1 && statutBlCol !== -1) {
                  // If both exist, use them correctly
                  statutCorrection = row[statutBlCol]?.toString().trim() || null;
              }
          }

          const statut = colMap.retrait !== -1 && row[colMap.retrait] ? row[colMap.retrait].toString().trim() : null;
          const numTimbre = colMap.timbre !== -1 && row[colMap.timbre] ? row[colMap.timbre].toString().trim() : null;
          const dretraitVal = colMap.dretrait !== -1 && row[colMap.dretrait] ? row[colMap.dretrait] : null;
          const dateRetrait = parseDate(dretraitVal);
          const remarque = colMap.remarque !== -1 && row[colMap.remarque] ? row[colMap.remarque].toString().trim() : null;

          // TYPE CONNAISSEMENT
          let rawType = colMap.connais !== -1 && row[colMap.connais] ? row[colMap.connais].toString().trim() : null;
          let typeConnaissement = null;
          if (rawType) {
              if (rawType.toUpperCase().includes('OBL')) typeConnaissement = 'OBL';
              else if (rawType.toUpperCase().includes('SWB')) typeConnaissement = 'SWB';
              else typeConnaissement = rawType;
          }

          const getCharge = (idx: number) => {
             if (idx === -1) return null;
             let val = row[idx];
             if (!val) return null;
             val = val.toString().trim();
             if (val === '0' || val.toLowerCase() === 'ok' || val === '-') return null;
             return val;
          };

          const cDET = getCharge(colMap.det);
          const cRENO = getCharge(colMap.reno);
          const cLAF = getCharge(colMap.laf);

          const blData = { 
              booking, 
              voyageId: dbVoyage.id, 
              pod, 
              shipper, 
              statutFret, 
              statutCorrection, 
              statut, 
              numTimbre, 
              dateRetrait, 
              typeConnaissement,
              commentaire: remarque 
          };

          const bl = await prisma.bL.upsert({
              where: { booking },
              create: blData,
              update: blData
          });
          
          count++;

          const upsertCharge = async (type: string, montant: string) => {
             if (!montant) return;
             const existing = await prisma.autreCharge.findFirst({ where: { blId: bl.id, type } });
             if (existing) {
                 await prisma.autreCharge.update({ where: { id: existing.id }, data: { montant } });
             } else {
                 await prisma.autreCharge.create({ data: { blId: bl.id, type, montant } });
             }
          };

          if (cDET) await upsertCharge('DET', cDET);
          if (cRENO) await upsertCharge('RENO', cRENO);
          if (cLAF) await upsertCharge('LAF', cLAF);
      }
      
      console.log(`-> Ajout/Mise à jour de ${count} BLs.`);
      totalBLs += count;

    } catch (e: any) {
       console.error(`Error on sheet ${sheetName}:`, e.message);
    }
  }

  console.log(`\n✅ IMPORTATION TERMINÉE !`);
  console.log(`- Voyages importés: ${totalVoyages}`);
  console.log(`- BLs importés: ${totalBLs}`);
}

importer().catch(e => {
  console.error("Erreur critique:", e.message);
}).finally(() => pool.end());
