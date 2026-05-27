const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function listTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in public schema:');
    console.table(res.rows);

    // Check columns for BL table to see which project it belongs to
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'BL'
    `);
    console.log('\nColumns in BL table:');
    console.table(columns.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listTables();
