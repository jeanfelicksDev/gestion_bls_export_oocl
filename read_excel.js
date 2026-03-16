const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('SUIVI-RELACHE-BLS 2025.xlsx');
let output = [];
output.push('Feuilles disponibles : ' + workbook.SheetNames.join(', '));

workbook.SheetNames.forEach(sheetName => {
  output.push(`\n\n=== DÉBUT DE LA FEUILLE: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0, raw: false });
  
  output.push('Nombre de lignes : ' + jsonData.length);
  output.push('\nEn-têtes :\n' + JSON.stringify(jsonData[0] || []));
  output.push('\nLigne 2 :\n' + JSON.stringify(jsonData[1] || []));
  output.push('\nLigne 3 :\n' + JSON.stringify(jsonData[2] || []));
  
  output.push('\n--- Premières lignes (4 à 10) ---');
  for (let i = 3; i < Math.min(10, jsonData.length); i++) {
    output.push(`Ligne ${i + 1}: ` + JSON.stringify(jsonData[i]));
  }
});

fs.writeFileSync('excel_output.json', JSON.stringify(output, null, 2), 'utf-8');
