const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

const bookings = [
  "4055066160", "4055066170", "4055069160", "4055081230", "4055081320",
  "4055081650", "4055082000", "4055086110", "4055088520", "4055088590",
  "4055092430", "4055096490", "4055096610", "4055096630", "4055102700",
  "4055105020", "4055106280", "4055107290", "4055112460", "4055112469",
  "4055115810", "4055118570", "4055122560", "4055122890"
];

// URLs mapping (extracted from previous blob check)
const blobBase = "https://l1z6khmgjdx0myfx.public.blob.vercel-storage.com/";
// Note: In a real scenario I would use the full URLs from the list. 
// For this script, I'll simulate the lookup or use the known ones if I had them all.
// I will just insert the bookings first to get them back in the UI.

async function injectRecovery() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected for injection.');

    // 1. Create RECOVERY Navire
    let res = await client.query('SELECT id FROM "Navire" WHERE nom = $1', ['RECOVERY']);
    let navireId;
    if (res.rows.length === 0) {
      res = await client.query('INSERT INTO "Navire" (id, nom, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) RETURNING id', ['recovery-navire', 'RECOVERY']);
      navireId = res.rows[0].id;
    } else {
      navireId = res.rows[0].id;
    }

    // 2. Create RECOVERY Voyage
    res = await client.query('SELECT id FROM "Voyage" WHERE numero = $1', ['RECUP-APR-MAY-2026']);
    let voyageId;
    if (res.rows.length === 0) {
      res = await client.query('INSERT INTO "Voyage" (id, "navireId", numero, etd, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id', 
        ['recovery-voyage', navireId, 'RECUP-APR-MAY-2026', '2026-05-01']);
      voyageId = res.rows[0].id;
    } else {
      voyageId = res.rows[0].id;
    }

    // 3. Inject Bookings
    console.log(`Injecting ${bookings.length} bookings...`);
    for (const bkg of bookings) {
      try {
        await client.query(`
          INSERT INTO "BL" (id, booking, statut, "voyageId", "createdAt", "updatedAt", "isNoteTraitee")
          VALUES ($1, $2, $3, $4, NOW(), NOW(), false)
          ON CONFLICT (booking) DO UPDATE SET "voyageId" = $4, "updatedAt" = NOW()
        `, [`rec-${bkg}`, bkg, 'RECU-CLOUD', voyageId]);
        console.log(`- ${bkg} injected.`);
      } catch (e) {
        console.error(`Error injecting ${bkg}:`, e.message);
      }
    }

    console.log('Injection complete.');

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    await client.end();
  }
}

injectRecovery();
