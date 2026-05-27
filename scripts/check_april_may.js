const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function findAprilMayData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Find voyages with ETD in April or May 2026
    const voyagesRes = await client.query(`
      SELECT v.*, n.nom as "navireNom" 
      FROM "Voyage" v
      JOIN "Navire" n ON v."navireId" = n.id
      WHERE v.etd >= '2026-04-01' AND v.etd < '2026-06-01'
    `);

    console.log(`Found ${voyagesRes.rows.length} voyages in April/May 2026.`);

    if (voyagesRes.rows.length > 0) {
      const voyageIds = voyagesRes.rows.map(v => v.id);
      const blsRes = await client.query(`
        SELECT COUNT(*) FROM "BL" WHERE "voyageId" = ANY($1)
      `, [voyageIds]);
      console.log(`Total BLs for these voyages: ${blsRes.rows[0].count}`);
      
      voyagesRes.rows.forEach(v => {
        console.log(`- ${v.navireNom} ${v.numero} (ETD: ${v.etd.toISOString().split('T')[0]})`);
      });
    }

    // Also check if there are BLs with createdAt in April/May that don't belong to these voyages
    // (though usually BLs are linked to voyages)
    const recentBLsRes = await client.query(`
      SELECT COUNT(*) FROM "BL" 
      WHERE "createdAt" >= '2026-04-01' 
      AND "voyageId" NOT IN (
        SELECT id FROM "Voyage" WHERE etd < '2026-04-01' OR etd >= '2026-06-01' OR etd IS NULL
      )
    `);
    console.log(`BLs with recent createdAt and not linked to Q1 voyages: ${recentBLsRes.rows[0].count}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

findAprilMayData();
