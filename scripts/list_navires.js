const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function listNavires() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT id, nom FROM "Navire" ORDER BY nom ASC`);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

listNavires();
