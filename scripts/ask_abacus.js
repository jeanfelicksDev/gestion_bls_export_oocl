const { exec } = require('child_process');

/**
 * Ce script permet d'envoyer des instructions à Abacus AI 
 * et de récupérer les conseils pour les intégrer dans le projet.
 */

const prompt = process.argv.slice(2).join(' ');

if (!prompt) {
  console.log("Usage: node scripts/ask_abacus.js \"Votre question ici\"");
  process.exit(1);
}

console.log(`\x1b[35m[Abacus AI Request]\x1b[0m ${prompt}`);
console.log("Consultation de l'expert en cours...");

// On utilise 'abacusai' (la commande globale)
exec(`abacusai "${prompt}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`\x1b[31m[Error]\x1b[0m ${error.message}`);
    return;
  }
  
  if (stderr) {
    // Note: Certaines infos de chargement passent par stderr
    console.log(`\x1b[33m[Status]\x1b[0m ${stderr}`);
  }

  console.log("\x1b[32m[Abacus AI Reply]\x1b[0m");
  console.log("-----------------------------------------");
  console.log(stdout);
  console.log("-----------------------------------------");
});
