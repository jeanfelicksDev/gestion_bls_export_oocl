const { list } = require('@vercel/blob');
require('dotenv').config({ path: '.env.production' });

async function listBlobs() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('No BLOB_READ_WRITE_TOKEN found.');
    return;
  }

  try {
    const { blobs } = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    console.log(`Found ${blobs.length} blobs.`);
    
    const blobsAprilMay = blobs.filter(b => {
      const date = new Date(b.uploadedAt);
      return date >= new Date('2026-04-01') && date < new Date('2026-06-01');
    });

    console.log(`Blobs uploaded in April/May 2026: ${blobsAprilMay.length}`);
    blobsAprilMay.forEach(b => {
      console.log(`- ${b.pathname} (${b.uploadedAt})`);
    });

  } catch (err) {
    console.error('Error listing blobs:', err);
  }
}

listBlobs();
