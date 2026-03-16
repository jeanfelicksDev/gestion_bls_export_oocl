const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

async function cleanShippers() {
    const dbPath = path.resolve(process.cwd(), "dev.db");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    const prisma = new PrismaClient({ adapter });

    try {
        console.log("🚀 Démarrage du nettoyage des shippers...");

        // 1. Récupérer tous les BLs
        const bls = await prisma.bL.findMany({
            select: { id: true, shipper: true }
        });

        // 2. Logique de normalisation (identique à l'analyse pour cohérence)
        function normalize(name) {
            if (!name) return "";
            return name
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .replace(/SA$|SARL$|LTD$|INC$|CORP$|S A$|S A R L$/g, '')
                .trim();
        }

        // 3. Construire la table de correspondance (Clé normalisée -> Meilleur Nom)
        const groups = {};
        bls.forEach(bl => {
            if (!bl.shipper) return;
            const key = normalize(bl.shipper);
            const variant = bl.shipper.trim();
            if (!groups[key]) {
                groups[key] = {
                    bestName: variant,
                    variants: new Set()
                };
            }
            groups[key].variants.add(variant);
            
            // On choisit le nom le plus "propre" (ici le plus long ou avec ponctuation)
            // comme nom de référence pour le groupe
            if (variant.length > groups[key].bestName.length) {
                groups[key].bestName = variant;
            }
        });

        // 4. Appliquer les mises à jour
        let updateCount = 0;
        console.log("🔄 Mise à jour de la base de données...");

        for (const bl of bls) {
            if (!bl.shipper) continue;
            const key = normalize(bl.shipper);
            const targetName = groups[key].bestName;

            if (bl.shipper !== targetName) {
                await prisma.bL.update({
                    where: { id: bl.id },
                    data: { shipper: targetName }
                });
                updateCount++;
            }
        }

        console.log(`\n✅ Nettoyage terminé !`);
        console.log(`📈 ${updateCount} enregistrements de BL ont été harmonisés.`);
        console.log(`✨ La base de données est maintenant propre.`);

    } catch (error) {
        console.error("❌ Erreur lors du nettoyage :", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanShippers();
