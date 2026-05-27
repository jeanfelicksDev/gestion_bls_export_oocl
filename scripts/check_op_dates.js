const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkDateRetrait() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT TO_CHAR("dateRetrait", 'YYYY-MM') as month, COUNT(*) 
      FROM "BL" 
      WHERE "dateRetrait" IS NOT NULL
      GROUP BY month 
      ORDER BY month
    `);
    console.log('BLs grouped by dateRetrait month:');
    console.table(res.rows);

    const res2 = await client.query(`
      SELECT TO_CHAR("dateRetour", 'YYYY-MM') as month, COUNT(*) 
      FROM "BL" 
      WHERE "dateRetour" IS NOT NULL
      GROUP BY month 
      ORDER BY month
    `);
    console.log('\nBLs grouped by dateRetour month:');
    console.table(res2.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkDateRetrait();
