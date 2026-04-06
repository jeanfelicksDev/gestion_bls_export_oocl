import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bls = await prisma.bL.findMany({
    where: {
      AND: [
        { commentaire: { not: null } },
        { commentaire: { not: "" } }
      ]
    },
    select: {
      booking: true,
      commentaire: true,
    },
  });

  console.log(JSON.stringify(bls, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
