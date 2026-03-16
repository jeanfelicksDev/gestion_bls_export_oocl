const fs = require('fs');

try {
  const content = fs.readFileSync('import_log.txt', 'utf8'); // It's utf-16 unfortunately because Powershell `>` uses utf-16
} catch(e) {}
