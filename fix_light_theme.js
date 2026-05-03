const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      // Safe replacements
      // border-white/10 -> border-brand-border
      content = content.replace(/border-white\/(10|20|30|40|50|60|70|80)/g, 'border-brand-border');
      // hover:bg-white/10 -> hover:bg-brand-surface
      content = content.replace(/hover:bg-white\/(10|20)/g, 'hover:bg-brand-surface');
      // bg-white/10 -> bg-brand-surface
      content = content.replace(/bg-white\/(5|10|20)/g, 'bg-brand-surface');
      
      // text-gray-xxx -> text-brand-text-muted
      content = content.replace(/text-gray-400/g, 'text-brand-text-muted');
      content = content.replace(/text-gray-500/g, 'text-brand-text-muted');
      content = content.replace(/text-slate-400/g, 'text-brand-text-muted');
      content = content.replace(/text-slate-500/g, 'text-brand-text-muted');
      
      // text-white -> text-brand-text
      // But avoid replacing if the line contains bg-primary, bg-blue, bg-red, bg-amber, bg-emerald
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('text-white')) {
          if (!line.match(/bg-(primary|blue-[567]00|red-[56]00|amber-[56]00|emerald-[56]00|rose-[56]00|purple-[56]00|indigo-[56]00)/)) {
            lines[i] = line.replace(/text-white/g, 'text-brand-text');
          }
        }
      }
      content = lines.join('\n');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Light theme fixes applied.');
