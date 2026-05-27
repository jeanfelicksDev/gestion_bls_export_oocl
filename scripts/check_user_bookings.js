const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkUserBookings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
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
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT booking, "createdAt", "updatedAt"
      FROM "BL" 
      WHERE booking = ANY($1)
    `, [userBookings]);

    console.log(`Found ${res.rows.length} out of ${userBookings.length} bookings in the cloud database.`);
    if (res.rows.length > 0) {
      console.table(res.rows);
    } else {
      console.log('None of these bookings were found in the current cloud database.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkUserBookings();
