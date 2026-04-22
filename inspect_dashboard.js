const xlsx = require('xlsx');

const filename = 'SUIVI-RELACHE-1ER TRIM 2026.xlsx';
const workbook = xlsx.readFile(filename);

const sheetName = 'TABLO DE BORD';
if (workbook.SheetNames.includes(sheetName)) {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  for (let i = 0; i < Math.min(20, jsonData.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(jsonData[i]));
  }
} else {
  console.log('TABLO DE BORD not found');
}
