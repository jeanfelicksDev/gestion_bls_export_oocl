const fs = require('fs');
const path = require('path');

const root = 'c:/Users/HP/AntiGravity';
const urls = new Set();

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        walk(fullPath);
      }
    } else if (file.startsWith('.env')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/postgresql:\/\/[^\s"']+/g);
      if (matches) {
        matches.forEach(m => urls.add(m));
      }
    }
  }
}

walk(root);
console.log('Found URLs:');
urls.forEach(u => console.log(u));
