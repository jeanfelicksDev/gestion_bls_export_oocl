require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const totalVoyages = await prisma.voyage.count();
    const totalBLs = await prisma.bl.count();
    console.log("Total Voyages in DB:", totalVoyages);
    console.log("Total BLs in DB:", totalBLs);
    
    const recentVoyages = await prisma.voyage.findMany({
      where: {
        etd: {
          gte: new Date("2026-03-01")
        }
      }
    });

    console.log("Voyages since 2026-03-01 in DB query:", recentVoyages.length);
    
    if (recentVoyages.length > 0) {
      console.log("Sample Voyage ETD:", recentVoyages[0].etd);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
