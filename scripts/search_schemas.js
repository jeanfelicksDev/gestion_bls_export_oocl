const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function searchAllSchemas() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT LIKE 'pg_%' AND schema_name != 'information_schema'
    `);
    console.log('Schemas found:', res.rows.map(r => r.schema_name).join(', '));

    for (const row of res.rows) {
      const schema = row.schema_name;
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
      `, [schema]);
      console.log(`Tables in schema ${schema}:`, tables.rows.map(t => t.table_name).join(', '));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

searchAllSchemas();
