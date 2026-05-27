const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function listSchemas() {
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
    console.log('Schemas in database:');
    console.table(res.rows);

    for (const schema of res.rows) {
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
      `, [schema.schema_name]);
      console.log(`\nTables in schema [${schema.schema_name}]:`);
      console.table(tables.rows);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listSchemas();
