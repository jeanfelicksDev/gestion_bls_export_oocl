const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function inspectCreatedAt() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT "createdAt"::date as date, COUNT(*) 
      FROM "BL" 
      GROUP BY date 
      ORDER BY date
    `);
    console.log('BL creation dates:');
    console.table(res.rows);

    const res2 = await client.query(`
      SELECT "createdAt"::date as date, COUNT(*) 
      FROM "Voyage" 
      GROUP BY date 
      ORDER BY date
    `);
    console.log('\nVoyage creation dates:');
    console.table(res2.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

inspectCreatedAt();
