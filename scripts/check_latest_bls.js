const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkSampleBookings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT booking, "createdAt", "updatedAt"
      FROM "BL" 
      ORDER BY "createdAt" DESC
      LIMIT 20
    `);
    console.log('Latest BLs in database:');
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkSampleBookings();
