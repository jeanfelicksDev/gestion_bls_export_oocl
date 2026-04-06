import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function cleanup() {
  console.log("Recherche des voyages vides (0 BL)...");
  
  const voyages = await prisma.voyage.findMany({
    include: {
      _count: {
        select: { bls: true }
      },
      navire: true
    }
  });

  const emptyVoyages = voyages.filter(v => v._count.bls === 0);

  if (emptyVoyages.length === 0) {
    console.log("Aucun voyage vide trouvé.");
    return;
  }

  console.log(`Suppression de ${emptyVoyages.length} voyages vides :`);
  
  for (const v of emptyVoyages) {
    console.log(`- [${v.navire.nom}] Voyage: ${v.numero} (ID: ${v.id})`);
    await prisma.voyage.delete({
      where: { id: v.id }
    });
  }

  console.log("\n✅ NETTOYAGE TERMINÉ !");
}

cleanup().catch(e => {
  console.error("Erreur critique:", e.message);
}).finally(() => pool.end());
