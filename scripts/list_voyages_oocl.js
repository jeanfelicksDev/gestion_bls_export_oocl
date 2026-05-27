const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listVoyages() {
  try {
    const voyages = await prisma.voyage.findMany({
      include: { navire: true }
    });
    console.log('Voyages found:');
    console.table(voyages.map(v => ({
      id: v.id,
      navire: v.navire.nom,
      numero: v.numero,
      etd: v.etd
    })));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

listVoyages();
