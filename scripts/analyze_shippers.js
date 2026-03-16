const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const fs = require('fs');

async function analyzeDoublons() {
    const dbPath = path.resolve(process.cwd(), "dev.db");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    const prisma = new PrismaClient({ adapter });

    try {
        const bls = await prisma.bL.findMany({
            select: { shipper: true }
        });

        const rawShippers = bls.map(b => b.shipper).filter(Boolean);
        
        // Fonction de normalisation poussée
        function normalize(name) {
            return name
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '') // Supprime tout sauf lettres et chiffres
                .replace(/SA$|SARL$|LTD$|INC$|CORP$|S A$|S A R L$/g, '') // Supprime les suffixes communs à la fin
                .trim();
        }

        const groups = {};
        rawShippers.forEach(original => {
            const key = normalize(original);
            if (!groups[key]) {
                groups[key] = new Set();
            }
            groups[key].add(original.trim());
        });

        let output = "=== ANALYSE APPROFONDIE DES DOUBLONS SHIPPERS ===\n\n";
        let count = 0;

        // On ne garde que les clés qui ont plus d'une variante
        Object.keys(groups).sort().forEach(key => {
            const variants = Array.from(groups[key]);
            if (variants.length > 1) {
                count++;
                output += `GROUPE ${count} (Clé: ${key})\n`;
                // Suggestion du nom "propre" : le plus long ou celui avec le plus de ponctuation standard
                const bestName = variants.sort((a,b) => b.length - a.length)[0];
                output += `👉 Nom suggéré : ${bestName}\n`;
                output += `   Variantes détectées (${variants.length}) :\n`;
                variants.forEach(v => {
                    output += `   - ${v}\n`;
                });
                output += "\n";
            }
        });

        output += `Total de ${count} groupes de doublons détectés.\n`;
        
        fs.writeFileSync("analyse_doublons_shippers.txt", output);
        console.log("✅ Analyse terminée. Consultez 'analyse_doublons_shippers.txt'");

    } catch (error) {
        console.error("Erreur :", error);
    } finally {
        await prisma.$disconnect();
    }
}

analyzeDoublons();
