const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function listDatabases() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL.replace(/\/neondb/, '/postgres'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to postgres database.');

    const res = await client.query(`SELECT datname FROM pg_database WHERE datistemplate = false`);
    console.log('Databases in this project:');
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listDatabases();
