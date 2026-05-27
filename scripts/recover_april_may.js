const { Client } = require('pg');
const { list } = require('@vercel/blob');
const fs = require('fs');
require('dotenv').config({ path: '.env.production' });

async function recoverCloudData() {
  const data = {
    exportDate: new Date().toISOString(),
    period: "April - May 2026",
    sources: {}
  };

  // 1. Fetch from Vercel Blob
  console.log('Fetching from Vercel Blob...');
  try {
    const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    const aprilMayBlobs = blobs.filter(b => {
      const date = new Date(b.uploadedAt);
      return date >= new Date('2026-04-01') && date < new Date('2026-06-01');
    });
    data.sources.vercelBlob = aprilMayBlobs;
    console.log(`- Found ${aprilMayBlobs.length} files in Vercel Blob.`);
  } catch (err) {
    console.error('Error fetching blobs:', err);
  }

  // 2. Fetch from Suivi Caution DB (alternative cloud DB)
  console.log('Fetching from Suivi Caution DB...');
  const altDbUrl = "postgresql://neondb_owner:npg_VmsL9fEQ6pZj@ep-jolly-recipe-aldunwcu-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  const altClient = new Client({ connectionString: altDbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await altClient.connect();
    const res = await altClient.query(`
      SELECT * FROM dossiers_caution 
      WHERE created_at >= '2026-04-01' AND created_at < '2026-06-01'
      AND armateur = 'OOCL'
    `);
    data.sources.suiviCautionDB = res.rows;
    console.log(`- Found ${res.rows.length} OOCL records in Suivi Caution DB.`);
    await altClient.end();
  } catch (err) {
    console.error('Error fetching from alternative DB:', err);
  }

  // 3. Save result
  const filename = 'CLOUD_DATA_RECOVERY_APRIL_MAY_2026.json';
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`\n✅ Recovery data saved to ${filename}`);

  // Generate a summary for the user
  console.log('\n--- SUMMARY ---');
  const uniqueBookings = new Set();
  data.sources.vercelBlob.forEach(b => {
    const booking = b.pathname.split(' ')[0];
    if (booking) uniqueBookings.add(booking);
  });
  console.log(`Unique Bookings found in Blob: ${uniqueBookings.size}`);
  
  const uniqueBLsFromDB = new Set(data.sources.suiviCautionDB.map(r => r.num_bl));
  console.log(`Unique BLs found in DB: ${uniqueBLsFromDB.size}`);
}

recoverCloudData();
