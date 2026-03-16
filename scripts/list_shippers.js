const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

async function getShippers() {
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });

  try {
    const shippers = await prisma.bL.findMany({
      select: {
        shipper: true,
      },
      distinct: ['shipper'],
    });

    console.log("\n=== LISTE DES SHIPPERS (SANS DOUBLONS) ===\n");
    const list = shippers
      .map(s => s.shipper)
      .filter(Boolean)
      .map(s => s.trim())
      .filter((v, i, a) => a.indexOf(v) === i) // Sécurité supplémentaire pour les doublons de trim
      .sort();

    list.forEach((shipper, index) => {
      console.log(`${index + 1}. ${shipper}`);
    });
    
    console.log(`\nTotal: ${list.length} shippers trouvés.\n`);
  } catch (error) {
    console.error("Erreur :", error);
  } finally {
    await prisma.$disconnect();
  }
}

getShippers();
