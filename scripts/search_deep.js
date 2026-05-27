const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function searchDeep() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const searchTerms = [
    "4054938440", "4055060570", "4055086110", "4055096610",
    "4055105020", "4055106280", "4055107290", "4055108910",
    "4055112460", "4055112469", "4055112480", "4055112489",
    "4055118590", "4055126720", "4055122560", "4055118570",
    "4055115810", "4055122890", "4055096630", "4055082000",
    "4055025600", "4055060470", "4055092430", "4055096490"
  ];

  try {
    await client.connect();
    console.log('Connected to database.');

    for (const term of searchTerms) {
      const res = await client.query(`
        SELECT * FROM "BL" 
        WHERE CAST(booking AS TEXT) LIKE $1 
        OR CAST(commentaire AS TEXT) LIKE $1
        OR CAST("urlORG" AS TEXT) LIKE $1
        OR CAST("urlNNG" AS TEXT) LIKE $1
        LIMIT 1
      `, [`%${term}%`]);

      if (res.rows.length > 0) {
        console.log(`Found term ${term} in database!`);
        console.table(res.rows);
      }
    }
    console.log('Search completed.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

searchDeep();
