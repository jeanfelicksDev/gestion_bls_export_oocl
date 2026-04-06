import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    const bls = await prisma.bL.findMany({
      select: { id: true, booking: true, urlORG: true, urlSWB: true }
    });
    const filtered = bls.filter(bl => bl.urlORG || bl.urlSWB);
    console.log('COUNT:', filtered.length);
    console.log('DATA:', JSON.stringify(filtered, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
