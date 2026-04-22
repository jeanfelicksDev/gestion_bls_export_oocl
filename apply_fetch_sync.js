const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'components');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('fetch(') && !content.includes('fetchSync')) {
         // Replace fetch( with fetchSync(
         // but only standalone fetch calls. Note: using word boundaries or regex.
         const originalContent = content;

         // Let's replace ' fetch(' or 'await fetch(' or 'return fetch(' -> ' fetchSync('
         content = content.replace(/\bfetch\(/g, 'fetchSync(');

         if (content !== originalContent) {
           // Insert import at the top after the first line or so
           // Find the last import line to append it
           const lines = content.split('\n');
           const lastImportIndex = lines.reduce((acc, line, idx) => line.startsWith('import ') ? idx : acc, -1);
           
           if (lastImportIndex !== -1) {
             lines.splice(lastImportIndex + 1, 0, 'import { fetchSync } from "@/lib/fetchSync";');
           } else {
             lines.unshift('import { fetchSync } from "@/lib/fetchSync";');
           }

           fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
           console.log(`Updated fetch in ${fullPath}`);
         }
      }
    }
  }
}

processDirectory(srcDir);
console.log('Fetch sync replacements complete.');
