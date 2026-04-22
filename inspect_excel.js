const xlsx = require('xlsx');

const filename = 'SUIVI-RELACHE-1ER TRIM 2026.xlsx';
const workbook = xlsx.readFile(filename);

console.log('Total Sheets:', workbook.SheetNames.length);

// Just look at the first few sheets and "TABLO DE BORD" if it exists
const sheetsToInspect = workbook.SheetNames.slice(0, 5);
if (workbook.SheetNames.includes('TABLO DE BORD')) {
  sheetsToInspect.push('TABLO DE BORD');
}

sheetsToInspect.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(jsonData[i]));
  }
});
