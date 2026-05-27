const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function listVoyages() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to OOCL database.');

    const res = await client.query(`
      SELECT v.id, n.nom as navire, v.numero, v.etd 
      FROM "Voyage" v
      JOIN "Navire" n ON v."navireId" = n.id
      ORDER BY v.etd DESC
    `);
    
    console.log('Voyages found:');
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listVoyages();
