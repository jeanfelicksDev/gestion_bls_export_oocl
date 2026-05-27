const { Client } = require('pg');

const dbUrl = "postgresql://neondb_owner:npg_VmsL9fEQ6pZj@ep-jolly-recipe-aldunwcu-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function checkDossiersCaution() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to suivi_caution database.');

    const res = await client.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) 
      FROM dossiers_caution 
      GROUP BY month 
      ORDER BY month
    `);
    console.log('Dossiers Caution grouped by createdAt month:');
    console.table(res.rows);

    const sample = await client.query(`
      SELECT num_bl, armateur, created_at 
      FROM dossiers_caution 
      WHERE created_at >= '2026-04-01' 
      LIMIT 10
    `);
    console.log('\nRecent Dossiers Caution:');
    console.table(sample.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkDossiersCaution();
