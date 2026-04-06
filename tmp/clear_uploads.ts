import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { del } from '@vercel/blob';

const prisma = new PrismaClient();

async function run() {
  try {
    const bls = await prisma.bL.findMany({
      where: {
        OR: [
          { NOT: { urlORG: null } },
          { NOT: { urlSWB: null } }
        ]
      },
      select: { id: true, booking: true, urlORG: true, urlSWB: true }
    });

    console.log(`Found ${bls.length} BLs for cleanup.`);

    for (const bl of bls) {
      console.log(`Processing BL: ${bl.booking}...`);

      // 1. Trying to delete from Cloud
      if (bl.urlORG) {
        try {
           await del(bl.urlORG);
           console.log(`- Deleted ORG blob: ${bl.urlORG}`);
        } catch (e) {
           console.warn(`- Failed to delete ORG blob from Cloud (maybe missing Token?): ${bl.urlORG}`);
        }
      }

      if (bl.urlSWB) {
        try {
           await del(bl.urlSWB);
           console.log(`- Deleted SWB blob: ${bl.urlSWB}`);
        } catch (e) {
           console.warn(`- Failed to delete SWB blob from Cloud (maybe missing Token?): ${bl.urlSWB}`);
        }
      }

      // 2. Clear Database fields
      await prisma.bL.update({
        where: { id: bl.id },
        data: {
          urlORG: null,
          isORG: false,
          urlSWB: null,
          isSWB: false
        }
      });
      console.log(`- Cleared database fields for ${bl.booking}.`);
    }

    console.log('Cleanup complete.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
