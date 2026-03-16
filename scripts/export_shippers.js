const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const fs = require('fs');

async function exportShippers() {
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

    const list = shippers
      .map(s => s.shipper)
      .filter(Boolean)
      .map(s => s.trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    const content = list.join('\n');
    const outputPath = path.resolve(process.cwd(), "shippers_list.txt");
    
    fs.writeFileSync(outputPath, content);
    
    console.log(`\n✅ Succès : La liste des ${list.length} shippers a été exportée dans :`);
    console.log(`📄 ${outputPath}\n`);

  } catch (error) {
    console.error("Erreur durant l'export :", error);
  } finally {
    await prisma.$disconnect();
  }
}

exportShippers();
