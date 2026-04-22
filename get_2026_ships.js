const xlsx = require('xlsx');

const filename = 'SUIVI-RELACHE-1ER TRIM 2026.xlsx';
const workbook = xlsx.readFile(filename);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  if (jsonData.length === 0) return;

  const headers = jsonData[0];
  console.log('Headers:', headers);

  // Find column indices
  const navireIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('navire'));
  const voyageIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('voyage'));
  const etdIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('etd'));

  if (navireIdx === -1) {
    console.log('Could not find Navire column');
    return;
  }

  const ships2026 = [];
  
  // Data starts from index 1
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    const etdValue = row[etdIdx];
    
    // Check if ETD is in 2026
    let year = null;
    if (etdValue) {
      if (typeof etdValue === 'number') {
        // Excel date serial
        const date = xlsx.utils.format_cell({ v: etdValue, t: 'd' });
        // sheet_to_json with raw: false/true might handle this differently, 
        // but let's try to parse common formats or use the string value if raw: false was used.
      }
      
      const etdStr = etdValue.toString();
      const match = etdStr.match(/2026/);
      if (match) {
        year = 2026;
      }
    }

    if (year === 2026 || (etdValue && etdValue.toString().includes('2026'))) {
      ships2026.push({
        navire: row[navireIdx],
        voyage: voyageIdx !== -1 ? row[voyageIdx] : 'N/A',
        etd: etdValue
      });
    }
  }

  // Deduplicate and count
  const uniqueShips = [];
  const seen = new Set();
  
  ships2026.forEach(s => {
    const key = `${s.navire}|${s.voyage}|${s.etd}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueShips.push(s);
    }
  });

  console.log(`Found ${uniqueShips.length} ships for 2026:`);
  console.table(uniqueShips);
});
