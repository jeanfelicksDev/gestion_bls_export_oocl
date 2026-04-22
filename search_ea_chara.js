const xlsx = require('xlsx');

const filename = 'SUIVI-RELACHE-1ER TRIM 2026.xlsx';
const workbook = xlsx.readFile(filename);

const matchingSheets = workbook.SheetNames.filter(name => 
  name.toLowerCase().includes('ea chara')
);

console.log('Matching Sheets:', matchingSheets);

matchingSheets.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== Content of ${sheetName} ===`);
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(jsonData[i]));
  }
});
