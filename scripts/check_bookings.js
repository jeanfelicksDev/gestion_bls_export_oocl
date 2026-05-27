const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function checkSpecificBookings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const bookings = ['4055066160', '4055122890', '4055118570', '4055086110'];
    
    const res = await client.query(`
      SELECT * FROM "BL" WHERE "booking" = ANY($1)
    `, [bookings]);

    console.log(`Found ${res.rows.length} out of ${bookings.length} bookings.`);
    console.table(res.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkSpecificBookings();
