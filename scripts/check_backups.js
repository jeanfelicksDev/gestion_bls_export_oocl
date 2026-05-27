const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function searchArchivedTables() {
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
      AND (table_name LIKE '%bak%' OR table_name LIKE '%old%' OR table_name LIKE '%archive%' OR table_name LIKE '%copy%')
    `);
    
    console.log('Archived/Backup tables found:');
    console.table(res.rows);

    if (res.rows.length === 0) {
      console.log('No backup tables found.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

searchArchivedTables();
