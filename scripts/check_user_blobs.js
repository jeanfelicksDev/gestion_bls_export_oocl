const { list } = require('@vercel/blob');
require('dotenv').config({ path: '.env.production' });

async function checkUserBlobs() {
  const userBookings = [
    "4054938440", "4055060570", "4055086110", "4055096610",
    "4055105020", "4055106280", "4055107290", "4055108910",
    "4055112460", "4055112469", "4055112480", "4055112489",
    "4055118590", "4055126720", "4055122560", "4055118570",
    "4055115810", "4055122890", "4055096630", "4055082000",
    "4055025600", "4055060470", "4055092430", "4055096490"
  ];

  try {
    const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    const matches = blobs.filter(b => {
      const booking = b.pathname.split(' ')[0];
      return userBookings.includes(booking);
    });

    console.log(`Found ${matches.length} files for the 24 user bookings.`);
    matches.forEach(m => {
      console.log(`- ${m.pathname} (Uploaded: ${m.uploadedAt})`);
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

checkUserBlobs();
