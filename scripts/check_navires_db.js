const { Client } = require('pg');

// Using the URL from gestion_des_navires/.env
const dbUrl = "postgresql://neondb_owner:npg_4zeSyfL5puVP@ep-long-term-ad0lyczy-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function checkNaviresDB() {
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
    console.log('Connected to gestion_des_navires database (US-East).');

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in public schema:');
    console.table(tablesRes.rows);

    const blCheck = tablesRes.rows.find(r => r.table_name === 'BL');
    if (blCheck) {
      const res = await client.query(`SELECT * FROM "BL" WHERE "booking" = ANY($1)`, [userBookings]);
      console.log(`Found ${res.rows.length} matches in BL table.`);
      console.table(res.rows);
    } else {
      console.log('No BL table found in this database.');
    }

    const bCheck = tablesRes.rows.find(r => r.table_name === 'bl');
    if (bCheck) {
      const res = await client.query(`SELECT * FROM "bl" WHERE "booking" = ANY($1)`);
      console.log(`Found ${res.rows.length} matches in 'bl' table (lowercase).`);
      console.table(res.rows);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkNaviresDB();
