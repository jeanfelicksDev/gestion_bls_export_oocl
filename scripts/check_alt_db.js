const { Client } = require('pg');

// Using the URL from suivi_caution_web/.env
const dbUrl = "postgresql://neondb_owner:npg_VmsL9fEQ6pZj@ep-jolly-recipe-aldunwcu-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function checkAlternativeDB() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to alternative database.');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in public schema:');
    console.table(res.rows);

    // Check if BL table exists and has OOCL data
    const blCheck = res.rows.find(r => r.table_name === 'BL');
    if (blCheck) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "BL" WHERE "createdAt" >= '2026-04-01'`);
      console.log(`BLs in alternative DB since 2026-04-01: ${countRes.rows[0].count}`);
      
      const sample = await client.query(`SELECT booking, "createdAt" FROM "BL" WHERE "createdAt" >= '2026-04-01' LIMIT 5`);
      console.table(sample.rows);
    } else {
      console.log('No BL table found in this database.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkAlternativeDB();
