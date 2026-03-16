import { prisma } from "./src/lib/prisma";

async function main() {
  try {
    const coques = await prisma.coque.findMany();
    console.log("Coques in DB:", coques);
    
    const count = await prisma.coque.count();
    console.log("Coque count:", count);
  } catch (error) {
    console.error("Prisma check failed:", error);
  } finally {
    process.exit(0);
  }
}

main();
