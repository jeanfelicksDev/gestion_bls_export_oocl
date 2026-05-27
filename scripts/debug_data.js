const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function debugData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    console.log('\n--- BLs grouped by createdAt month ---');
    const blMonths = await client.query(`
      SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*) 
      FROM "BL" 
      GROUP BY month 
      ORDER BY month
    `);
    console.table(blMonths.rows);

    console.log('\n--- Voyages grouped by etd month ---');
    const voyageEtMonth = await client.query(`
      SELECT TO_CHAR("etd", 'YYYY-MM') as month, COUNT(*) 
      FROM "Voyage" 
      GROUP BY month 
      ORDER BY month
    `);
    console.table(voyageEtMonth.rows);

    console.log('\n--- Sample BLs created in May 2026 ---');
    const sampleBLs = await client.query(`
      SELECT b.booking, b."createdAt", v.numero, v.etd
      FROM "BL" b
      LEFT JOIN "Voyage" v ON b."voyageId" = v.id
      WHERE b."createdAt" >= '2026-05-01'
      LIMIT 5
    `);
    console.table(sampleBLs.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

debugData();
