const { Client } = require('pg');

const dbUrl = "postgresql://neondb_owner:npg_eK8D4FwVgCbv@ep-young-pond-alyuuq53-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function checkNewDb() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to NEW Sydam database.');

    const res = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Voyage' AND table_schema = 'public'
    `);
    console.log('Columns in Voyage table:');
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkNewDb();
