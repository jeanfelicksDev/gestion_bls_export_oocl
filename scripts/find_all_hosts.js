const fs = require('fs');
const path = require('path');

const root = 'c:/Users/HP/AntiGravity';
const hosts = new Set();

function walk(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
            walk(fullPath);
          }
        } else {
          // Read first 1000 chars of files to find URLs
          const fd = fs.openSync(fullPath, 'r');
          const buffer = Buffer.alloc(2000);
          fs.readSync(fd, buffer, 0, 2000, 0);
          fs.closeSync(fd);
          const content = buffer.toString('utf8');
          const matches = content.match(/ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech/g);
          if (matches) {
            matches.forEach(m => hosts.add(m));
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

walk(root);
console.log('Found Neon Hosts:');
hosts.forEach(h => console.log(h));
