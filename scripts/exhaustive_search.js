const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function exhaustiveSearch() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT LIKE 'pg_%' AND table_schema != 'information_schema'
      ORDER BY table_schema, table_name
    `);
    console.log('All visible tables:');
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

exhaustiveSearch();
