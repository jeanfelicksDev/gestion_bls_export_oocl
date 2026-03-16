const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const navs = await prisma.navire.findMany();
    console.log("Navires:", navs);
  } catch (err) {
    console.error("Prisma error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
