const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

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

function parseDateStr(str) {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d)) return d;
  return null;
}

async function importer() {
  await setupTypeCharges();
  console.log("Lecture du fichier Excel...");
  const workbook = xlsx.readFile('SUIVI-RELACHE-BLS 2025.xlsx');

  for (const sheetName of workbook.SheetNames) {
    try {
      let nomNavire = sheetName.trim();
      let numVoyage = "UNKNOWN";
      
      const parts = nomNavire.split(/\s+/);
      if (parts.length > 1) {
         let last = parts.pop();
         if (last.toUpperCase() === 'V.') {
             numVoyage = 'V.';
             nomNavire = parts.join(' ');
         } else {
             const prev = parts[parts.length - 1];
             if (prev && prev.toUpperCase() === 'V.') {
                 parts.pop();
                 numVoyage = 'V. ' + last;
             } else {
                 numVoyage = last;
             }
             nomNavire = parts.join(' ');
         }
      }

      console.log(`\nImport de [${nomNavire}] (V. ${numVoyage}) - Feuille: ${sheetName}`);

      const navire = await prisma.navire.upsert({
        where: { nom: nomNavire },
        update: {},
        create: { nom: nomNavire }
      });

      const sheet = workbook.Sheets[sheetName];
      const sheetJson = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
      
      let etdValue = null;
      let headerIdx = -1;

      for (let i = 0; i < Math.min(20, sheetJson.length); i++) {
        const row = sheetJson[i];
        if (!row) continue;
        if (row[0] === 'ETD') {
            for (let j = 1; j < row.length; j++) {
                if (typeof row[j] === 'string' && row[j].match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
                    etdValue = row[j];
                    break;
                }
            }
        }
        if (headerIdx === -1 && row.some(c => typeof c === 'string' && c.toUpperCase().includes('BKG'))) {
            headerIdx = i;
        }
      }

      const etdParsed = parseDateStr(etdValue);

      let voyage = await prisma.voyage.findFirst({
         where: { navireId: navire.id, numero: numVoyage }
      });

      if (!voyage) {
         voyage = await prisma.voyage.create({
            data: {
               navireId: navire.id,
               numero: numVoyage,
               etd: etdParsed,
            }
         });
      } else if (etdParsed && !voyage.etd) {
         await prisma.voyage.update({
            where: { id: voyage.id },
            data: { etd: etdParsed }
         });
      }

      if (headerIdx === -1) {
         console.log(`-> Skipped (Pas de colonne BKG trouvée)`);
         continue;
      }

      const headers = sheetJson[headerIdx].map(h => typeof h === 'string' ? h.toUpperCase().replace(/[\s_]/g, '') : '');
      const findCol = (searchTerms) => {
         return headers.findIndex(h => searchTerms.some(term => h.includes(term)));
      };

      const colMap = {
        bkg: findCol(['BKG']),
        pod: findCol(['POD']),
        shipper: findCol(['SHIPPER']),
        fret: findCol(['FRET']),
        okprint: findCol(['OKPRINT']),
        retrait: findCol(['RETRAITCONNAIST', 'RETRAIT']),
        timbre: findCol(['TIMBRE']),
        dretrait: findCol(['DRETRAIT', 'D.RETRAIT']),
        det: findCol(['DET']),
        reno: findCol(['RENO']),
        laf: findCol(['LAF']),
        remarque: findCol(['REMARQUE'])
      };

      let count = 0;

      for (let i = headerIdx + 1; i < sheetJson.length; i++) {
          const row = sheetJson[i];
          if (!row || colMap.bkg === -1) continue;
          
          let booking = row[colMap.bkg];
          if (!booking) continue; // Skip empty
          
          if (typeof booking !== 'string') booking = String(booking);
          booking = booking.trim().toUpperCase();
          if (booking.length < 3) continue; // skip anomalies (e.g. empty spaces)

          const pod = colMap.pod !== -1 && row[colMap.pod] ? String(row[colMap.pod]).trim() : null;
          const shipper = colMap.shipper !== -1 && row[colMap.shipper] ? String(row[colMap.shipper]).trim() : null;
          const statutFret = colMap.fret !== -1 && row[colMap.fret] ? String(row[colMap.fret]).trim() : null;
          const statutCorrection = colMap.okprint !== -1 && row[colMap.okprint] ? String(row[colMap.okprint]).trim() : null;
          const statut = colMap.retrait !== -1 && row[colMap.retrait] ? String(row[colMap.retrait]).trim() : null;
          const numTimbre = colMap.timbre !== -1 && row[colMap.timbre] ? String(row[colMap.timbre]).trim() : null;
          const dretraitStr = colMap.dretrait !== -1 && row[colMap.dretrait] ? String(row[colMap.dretrait]).trim() : null;
          const dateRetrait = parseDateStr(dretraitStr);
          const remarque = colMap.remarque !== -1 && row[colMap.remarque] ? String(row[colMap.remarque]).trim() : null;

          const getCharge = (idx) => {
             if (idx === -1) return null;
             let val = row[idx];
             if (!val) return null;
             val = String(val).trim();
             if (val === '0' || val.toLowerCase() === 'ok' || val === '-') return null;
             return val;
          };

          const cDET = getCharge(colMap.det);
          const cRENO = getCharge(colMap.reno);
          const cLAF = getCharge(colMap.laf);

          let bl = await prisma.bL.findUnique({ where: { booking } });
          if (!bl) {
             bl = await prisma.bL.create({
                data: { booking, voyageId: voyage.id, pod, shipper, statutFret, statutCorrection, statut, numTimbre, dateRetrait, commentaire: remarque }
             });
          } else {
             bl = await prisma.bL.update({
                where: { booking },
                data: { voyageId: voyage.id, pod, shipper, statutFret, statutCorrection, statut, numTimbre, dateRetrait, commentaire: remarque }
             });
          }
          
          count++;

          const upsertCharge = async (type, montant) => {
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

    } catch (e) {
       console.error(`Error on sheet ${sheetName}:`, e.message);
    }
  }

  console.log("\n✅ IMPORTATION TERMINÉE AVEC SUCCÈS !");
}

importer().catch(e => {
  console.error("Erreur critique:", e.message);
  console.error(e.stack);
}).finally(() => prisma.$disconnect());
