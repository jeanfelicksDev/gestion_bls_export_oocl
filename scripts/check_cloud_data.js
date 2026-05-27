const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const tables = ['BL', 'Voyage', 'Navire', 'Coque'];
    
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM "${table}" WHERE "createdAt" >= '2026-04-01'`);
      console.log(`${table}: ${res.rows[0].count} records since 2026-04-01`);
    }

    // Also check total counts
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`${table} (Total): ${res.rows[0].count}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkData();
