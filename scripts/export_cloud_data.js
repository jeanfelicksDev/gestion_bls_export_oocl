const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.production' });

async function exportData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const sinceDate = '2026-04-01';
    
    console.log('Fetching Coques...');
    const coques = await client.query(`SELECT * FROM "Coque" WHERE "createdAt" >= $1`, [sinceDate]);
    
    console.log('Fetching Navires...');
    const navires = await client.query(`SELECT * FROM "Navire" WHERE "createdAt" >= $1`, [sinceDate]);
    
    console.log('Fetching Voyages...');
    const voyages = await client.query(`SELECT * FROM "Voyage" WHERE "createdAt" >= $1`, [sinceDate]);
    
    console.log('Fetching BLs...');
    const bls = await client.query(`SELECT * FROM "BL" WHERE "createdAt" >= $1`, [sinceDate]);
    
    console.log('Fetching AutreCharges...');
    const charges = await client.query(`SELECT * FROM "AutreCharge" WHERE "createdAt" >= $1`, [sinceDate]);

    const data = {
      exportDate: new Date().toISOString(),
      filterSince: sinceDate,
      counts: {
        coques: coques.rows.length,
        navires: navires.rows.length,
        voyages: voyages.rows.length,
        bls: bls.rows.length,
        autreCharges: charges.rows.length
      },
      coques: coques.rows,
      navires: navires.rows,
      voyages: voyages.rows,
      bls: bls.rows,
      autreCharges: charges.rows
    };

    const filename = `cloud_data_export_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n✅ Data exported successfully to ${filename}`);
    console.log(`Summary: ${data.counts.bls} BLs, ${data.counts.voyages} Voyages, ${data.counts.navires} Navires.`);

  } catch (err) {
    console.error('Error during export:', err);
  } finally {
    await client.end();
  }
}

exportData();
