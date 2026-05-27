const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

const files = [
  { bkg: '4055066160', type: 'NNG', url: 'https://l1z6khmgjdx0myfx.public.blob.vercel-storage.com/4055066160%20NNG-PcuXQg1wQGWg6W05kLmbftQRoBKJLa.pdf' },
  { bkg: '4055066160', type: 'ORG', url: 'https://l1z6khmgjdx0myfx.public.blob.vercel-storage.com/4055066160%20ORG-2CwGSdzgMfyKsFV63QD0iMi4kWF1Jy.pdf' },
  { bkg: '4055066160', type: 'Scanne', url: 'https://l1z6khmgjdx0myfx.public.blob.vercel-storage.com/4055066160%20SCANNE-F9avAIBkcpJMTvBMQpo6DI3cQxpZY1.pdf' },
  { bkg: '4055122890', type: 'SWB', url: 'https://l1z6khmgjdx0myfx.public.blob.vercel-storage.com/4055122890%20SWB-hXPcOZpXryakAJqMzfYiZLSgu3tiRN.pdf' },
  { bkg: '4055122890', type: 'Scanne', url: 'https://l1z6khmgjdx0myfx.public.blob.vercel-storage.com/4055122890%20SCANNE-CZpO7pQ4qxQIDUVaYb20g6gHWWgeD2.pdf' },
  { bkg: '4055081230', type: 'SWB', url: 'https://l1z6khmgjdx0myfx.public.blob.vercel-storage.com/4055081230%20SWB-4Uw0E6nZ1d2Qjs14lQ0QR8QPGFGLNR.pdf' },
  { bkg: '4055081230', type: 'Scanne', url: 'https://l1z6khmgjdx0myfx.public.blob.vercel-storage.com/4055081230%20SCANNE-lW0svIa3X8AxvbaXxz4peFSo63PytI.pdf' }
];

async function updateUrls() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Updating URLs (Fixing casing)...');

    for (const f of files) {
      // urlORG, urlNNG, urlSWB, urlScanne
      const typeKey = f.type.toUpperCase() === 'SCANNE' ? 'Scanne' : f.type.toUpperCase();
      const col = `url${typeKey}`;
      const flag = `is${typeKey}`;
      
      try {
        await client.query(`
          UPDATE "BL" 
          SET "${col}" = $1, "${flag}" = true 
          WHERE booking = $2
        `, [f.url, f.bkg]);
        console.log(`Updated ${col} for ${f.bkg}`);
      } catch (e) {
        console.error(`Error updating ${f.bkg} (${col}):`, e.message);
      }
    }
    console.log('Update finished.');
  } finally {
    await client.end();
  }
}

updateUrls();
