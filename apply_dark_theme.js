const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = {
  // Backgrounds
  'bg-white': 'bg-brand-card',
  'bg-slate-50': 'bg-brand-bg',
  'bg-gray-50': 'bg-brand-bg',
  'bg-slate-100': 'bg-brand-surface',
  // Texts
  'text-slate-800': 'text-brand-text',
  'text-slate-700': 'text-brand-text',
  'text-slate-600': 'text-brand-text-dim',
  'text-slate-500': 'text-brand-text-muted',
  'text-slate-400': 'text-brand-text-muted',
  'text-gray-800': 'text-brand-text',
  'text-gray-700': 'text-brand-text',
  'text-gray-600': 'text-brand-text-dim',
  'text-gray-500': 'text-brand-text-muted',
  // Borders
  'border-slate-100': 'border-brand-border',
  'border-slate-200': 'border-brand-border-highlight',
  'border-slate-300': 'border-brand-border-highlight',
  'border-gray-100': 'border-brand-border',
  'border-gray-200': 'border-brand-border-highlight',
  'border-gray-300': 'border-brand-border-highlight',
  // Specific shadows
  'shadow-slate-200': 'shadow-black/50',
  'shadow-gray-200': 'shadow-black/50',
  'shadow-slate-100': 'shadow-black/30',
  // Misc
  'bg-blue-50': 'bg-brand-surface',
  'text-blue-900': 'text-blue-400',
  'text-blue-800': 'text-blue-400',
  'text-blue-700': 'text-blue-400',
  'text-blue-600': 'text-blue-400',
};

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      // We will perform regex replacements with word boundaries to avoid replacing parts of other classes
      // Note: for classes like 'bg-white/50', '\b' matched before '/' so we need a cautious regex
      
      for (const [search, replace] of Object.entries(replacements)) {
        // Regex: match the exact class name
        // Negative lookahead to ensure it's not part of another class like `bg-white/80` unless we want to replace it.
        // Wait, if it is `bg-white/50`, it will replace `bg-white` and become `bg-brand-card/50` which is valid in Tailwind v4!
        // We use (?<![\w-]) to ensure it's not part of `hover:bg-white` (wait, if it's `hover:bg-white` we DO want to replace it -> `hover:bg-brand-card`).
        // So we just replace the exact word.
        const regex = new RegExp(`(?<![\\w-])` + search.replace(/-/g, '\\-') + `(?![\\w-])`, 'g');
        content = content.replace(regex, replace);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Class replacement complete.');
