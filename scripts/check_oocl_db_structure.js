const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkOoclDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to OOCL database.');

    const res = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Voyage' AND table_schema = 'public'
    `);
    console.log('Columns in Voyage table (OOCL):');
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkOoclDb();
