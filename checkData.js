const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Coques:', await prisma.coque.count());
  console.log('Navires:', await prisma.navire.count());
  console.log('Voyages:', await prisma.voyage.count());
  console.log('BLs:', await prisma.bL.count());
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
