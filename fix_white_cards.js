const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remplacer les classes dark par leurs équivalents clairs pour redonner l'aspect "blanc" aux cartes
  content = content.replace(/bg-brand-card/g, "bg-white");
  
  // Pour le texte dans les cartes, il faut s'assurer qu'il soit foncé.
  // text-brand-text est souvent utilisé pour le gris clair. On le remplace par text-slate-700
  content = content.replace(/text-brand-text/g, "text-slate-700");
  
  // Quelques autres classes potentielles
  content = content.replace(/bg-brand-surface/g, "bg-slate-50");
  content = content.replace(/text-brand-text-muted/g, "text-slate-500");
  content = content.replace(/text-brand-text-dim/g, "text-slate-400");
  content = content.replace(/border-brand-border-highlight/g, "border-slate-200");
  content = content.replace(/border-brand-border/g, "border-slate-100");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

const filesToUpdate = [
  path.join(__dirname, 'src', 'app', 'page.tsx'),
  path.join(__dirname, 'src', 'components', 'VoyageCard.tsx'),
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    replaceInFile(file);
  }
});
