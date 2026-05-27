const { Client } = require('pg');

const dbUrl = "postgresql://neondb_owner:npg_VmsL9fEQ6pZj@ep-jolly-recipe-aldunwcu-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function deepSearchDossiers() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  const userBookings = [
    "4054938440", "4055060570", "4055086110", "4055096610",
    "4055105020", "4055106280", "4055107290", "4055108910",
    "4055112460", "4055112469", "4055112480", "4055112489",
    "4055118590", "4055126720", "4055122560", "4055118570",
    "4055115810", "4055122890", "4055096630", "4055082000",
    "4055025600", "4055060470", "4055092430", "4055096490"
  ];

  try {
    await client.connect();
    console.log('Connected to Suivi Caution database.');

    const columnsRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'dossiers_caution'
    `);

    for (const term of userBookings) {
      for (const col of columnsRes.rows) {
        const res = await client.query(`
          SELECT num_bl, armateur, created_at, "${col.column_name}" as matched_value
          FROM dossiers_caution 
          WHERE CAST("${col.column_name}" AS TEXT) LIKE $1
          LIMIT 1
        `, [`%${term}%`]);

        if (res.rows.length > 0) {
          console.log(`FOUND booking ${term} in column ${col.column_name}!`);
          console.table(res.rows);
        }
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

deepSearchDossiers();
