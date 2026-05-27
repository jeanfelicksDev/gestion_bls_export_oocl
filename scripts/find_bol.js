const { Client } = require('pg');

const dbUrls = [
  "postgresql://neondb_owner:npg_KULyzug76ZvT@ep-morning-water-agi3yojo-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  "postgresql://neondb_owner:npg_VmsL9fEQ6pZj@ep-jolly-recipe-aldunwcu-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  "postgresql://neondb_owner:npg_4zeSyfL5puVP@ep-long-term-ad0lyczy-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
];

async function findBillOfLading() {
  for (const url of dbUrls) {
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      console.log(`\nConnected to ${url.split('@')[1].split('/')[0]}`);
      
      const res = await client.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name ILIKE 'BillOfLading' OR table_name ILIKE 'bill_of_lading'
      `);
      
      if (res.rows.length > 0) {
        console.log(`FOUND BillOfLading table!`);
        console.table(res.rows);
        
        // Search for the 24 bookings in this table
        const userBookings = [
          "4054938440", "4055060570", "4055086110", "4055096610",
          "4055105020", "4055106280", "4055107290", "4055108910",
          "4055112460", "4055112469", "4055112480", "4055112489",
          "4055118590", "4055126720", "4055122560", "4055118570",
          "4055115810", "4055122890", "4055096630", "4055082000",
          "4055025600", "4055060470", "4055092430", "4055096490"
        ];
        
        const data = await client.query(`
          SELECT * FROM "${res.rows[0].table_schema}"."${res.rows[0].table_name}" 
          WHERE "bookingNumber" = ANY($1)
        `, [userBookings]);
        
        console.log(`Found ${data.rows.length} bookings in this table.`);
        console.table(data.rows);

      } else {
        console.log('No BillOfLading table found.');
      }
    } catch (err) {
      console.error('Error:', err.message);
    } finally {
      await client.end();
    }
  }
}

findBillOfLading();
