const fs = require('fs');
const path = require('path');

/**
 * Script pour analyser les chargeurs (shippers) avec l'IA de Google Gemini (Gratuit)
 * Il regroupe les noms qui se ressemblent et propose une liste propre.
 */

// --- CONFIGURATION ---
// Récupérez une clé gratuite sur https://aistudio.google.com/
const GEMINI_API_KEY = "AIzaSyBRdBozgEE19MmR2FYi4Dl_tgnqM1y21go"; 

const SHIPPERS_FILE = path.join(__dirname, '../shippers_list.txt');
const OUTPUT_FILE = path.join(__dirname, '../shippers_list_clean.json');

async function analyzeShippers() {
  console.log("\x1b[36m[Gemini AI]\x1b[0m Analyse de votre liste de chargeurs...");

  if (!fs.existsSync(SHIPPERS_FILE)) {
    console.error("Fichier shippers_list.txt introuvable.");
    return;
  }

  const shippers = fs.readFileSync(SHIPPERS_FILE, 'utf8')
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  console.log(`\x1b[33m[Status]\x1b[0m ${shippers.length} lignes à traiter.`);

  // On regroupe les données pour le prompt
  const prompt = `Voici une liste brut de chargeurs (shippers). 
Identifie les doublons et les variantes (ex: "OLAM AGRI" et "OLAM AGRI RUBBER").
Regroupe-les par "Nom Officiel" et liste les variantes.
Réponds UNIQUEMENT avec un objet JSON au format:
[{ "nom": "Nom Officiel", "variantes": ["Variante 1", "Variante 2"] }]

LISTE :
${shippers.join('\n')}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error("\x1b[31m[Erreur API]\x1b[0m", data.error.message);
      return;
    }
    if (!data.candidates || data.candidates.length === 0) {
      console.error("\x1b[31m[Erreur Gemini]\x1b[0m Aucune réponse générée.");
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    const resultText = data.candidates[0].content.parts[0].text;
    
    // Nettoyage du texte pour extraire le JSON (Gemini peut mettre des balises json)
    const jsonStr = resultText.replace(/```json|```/g, '').trim();
    const cleanList = JSON.parse(jsonStr);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanList, null, 2));
    
    console.log("\x1b[32m[Succès]\x1b[0m Analyse terminée !");
    console.log(`Fichier créé : ${OUTPUT_FILE}`);
    console.log(`Nombre de chargeurs uniques trouvés : ${cleanList.length}`);

  } catch (error) {
    console.error("\x1b[31m[Erreur]\x1b[0m", error.message);
  }
}

analyzeShippers();
