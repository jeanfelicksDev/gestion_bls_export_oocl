const xlsx = require('xlsx');

const filename = 'SUIVI-RELACHE-1ER TRIM 2026.xlsx';
const workbook = xlsx.readFile(filename);

const results = [];

// Helper to convert Excel serial date to JS Date
function excelDateToJS(serial) {
  if (!serial || typeof serial !== 'number') return serial;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date;
}

workbook.SheetNames.forEach(sheetName => {
  if (sheetName === 'TABLO DE BORD') return; // Skip dashboard for individual sheet scan

  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  if (jsonData.length < 2) return;

  const shipVoyageRow = jsonData[0];
  const etdRow = jsonData[1];

  let ship = null;
  let voyage = null;
  let etd = null;

  // Simple heuristic based on NORDMAAS observation
  if (shipVoyageRow && shipVoyageRow.length >= 2) {
    ship = shipVoyageRow[0];
    voyage = shipVoyageRow[1];
  }

  if (etdRow && etdRow[0] && etdRow[0].toString().trim().toUpperCase() === 'ETD') {
    etd = etdRow[1];
  }

  if (ship && etd) {
    const etdDate = excelDateToJS(etd);
    if (etdDate instanceof Date && !isNaN(etdDate)) {
      if (etdDate.getFullYear() === 2026) {
        results.push({
          navire: ship,
          voyage: voyage,
          etd: etdDate.toISOString().split('T')[0]
        });
      }
    } else if (typeof etd === 'string' && etd.includes('2026')) {
        results.push({
          navire: ship,
          voyage: voyage,
          etd: etd
        });
    }
  }
});

// Also check TABLO DE BORD if we didn't find anything or just for completeness
const dashboard = workbook.Sheets['TABLO DE BORD'];
if (dashboard) {
    const dashData = xlsx.utils.sheet_to_json(dashboard, { header: 1 });
    // Look for rows where the date column is in 2026
    // Based on Row 1: ["VslName","ETA","ETD", ...]
    // VslName is Col A (0), ETA is B (1), ETD is C (2), Voyage is G (6)
    
    for (let i = 2; i < dashData.length; i++) {
        const row = dashData[i];
        const vslName = row[0];
        const etdVal = row[2];
        const voyVal = row[6];
        
        if (vslName && etdVal) {
            const etdDate = excelDateToJS(etdVal);
            if (etdDate instanceof Date && !isNaN(etdDate) && etdDate.getFullYear() === 2026) {
                results.push({
                    navire: vslName,
                    voyage: voyVal,
                    etd: etdDate.toISOString().split('T')[0]
                });
            }
        }
    }
}

// Deduplicate
const final = [];
const seen = new Set();
results.forEach(r => {
    const key = `${r.navire}|${r.voyage}|${r.etd}`;
    if (!seen.has(key)) {
        seen.add(key);
        final.push(r);
    }
});

// Sort by date
final.sort((a, b) => a.etd.localeCompare(b.etd));

console.log(JSON.stringify(final, null, 2));
