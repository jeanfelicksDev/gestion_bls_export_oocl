const fs = require('fs');
const xlsx = require('xlsx');

// Load the exported JSON
const data = JSON.parse(fs.readFileSync('cloud_data_export_2026-05-12.json', 'utf8'));

const { navires, voyages, bls, autreCharges } = data;

// Create maps for quick lookup
const navireMap = new Map(navires.map(n => [n.id, n.nom]));
const chargeMap = new Map();
autreCharges.forEach(c => {
  if (!chargeMap.has(c.blId)) chargeMap.set(c.blId, []);
  chargeMap.get(c.blId).push(c);
});

// Group BLs by Voyage
const voyageGroups = new Map();
bls.forEach(bl => {
  if (!voyageGroups.has(bl.voyageId)) voyageGroups.set(bl.voyageId, []);
  voyageGroups.get(bl.voyageId).push(bl);
});

const wb = xlsx.utils.book_new();

// Process each voyage
voyages.forEach(v => {
  const vBls = voyageGroups.get(v.id) || [];
  if (vBls.length === 0) return;

  const navireNom = navireMap.get(v.navireId) || 'Unknown';
  let sheetName = `${navireNom} ${v.numero}`.substring(0, 31); // Excel sheet name limit

  const sheetData = vBls.map(bl => {
    const blCharges = chargeMap.get(bl.id) || [];
    const det = blCharges.find(c => c.type === 'DET')?.montant || '';
    const reno = blCharges.find(c => c.type === 'RENO')?.montant || '';
    const laf = blCharges.find(c => c.type === 'LAF')?.montant || '';

    return {
      'BKG': bl.booking,
      'POD': bl.pod,
      'SHIPPER': bl.shipper,
      'FRET': bl.statutFret,
      'OK PRINT': bl.statutCorrection,
      'RETRAIT': bl.statut,
      'TIMBRE': bl.numTimbre,
      'D. RETRAIT': bl.dateRetrait ? new Date(bl.dateRetrait).toLocaleDateString() : '',
      'DET': det,
      'RENO': reno,
      'LAF': laf,
      'REMARQUE': bl.commentaire
    };
  });

  // Sort by BKG
  sheetData.sort((a, b) => a.BKG.localeCompare(b.BKG));

  const ws = xlsx.utils.json_to_sheet(sheetData);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
});

const outputFilename = 'RECOVERY_CLOUD_DATA_APRIL_2026.xlsx';
xlsx.writeFile(wb, outputFilename);

console.log(`\n✅ Excel recovery file created: ${outputFilename}`);
console.log(`Processed ${voyages.length} voyages and ${bls.length} BLs.`);
