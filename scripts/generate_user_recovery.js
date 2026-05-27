const { list } = require('@vercel/blob');
const XLSX = require('xlsx');
const fs = require('fs');
require('dotenv').config({ path: '.env.production' });

async function generateRecoveryExcel() {
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
    
    const rows = [];
    userBookings.forEach(booking => {
      const relatedBlobs = blobs.filter(b => b.pathname.startsWith(booking));
      if (relatedBlobs.length === 0) {
        rows.push({
          'Booking': booking,
          'Type Fichier': 'NON TROUVE',
          'Nom Fichier': 'Aucun fichier dans le cloud',
          'Date Upload': '',
          'Lien Cloud (URL)': ''
        });
      } else {
        relatedBlobs.forEach(b => {
          let type = 'AUTRE';
          if (b.pathname.includes('NNG')) type = 'NNG';
          else if (b.pathname.includes('ORG')) type = 'ORG';
          else if (b.pathname.includes('SCANNE')) type = 'SCANNE';
          else if (b.pathname.includes('SWB')) type = 'SWB';

          rows.push({
            'Booking': booking,
            'Type Fichier': type,
            'Nom Fichier': b.pathname,
            'Date Upload': b.uploadedAt.toISOString(),
            'Lien Cloud (URL)': b.url
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recovery');

    const filename = 'RECOVERY_24_BOOKINGS_APRIL_MAY_2026.xlsx';
    XLSX.writeFile(workbook, filename);
    console.log(`Excel file generated: ${filename}`);

  } catch (err) {
    console.error('Error:', err);
  }
}

generateRecoveryExcel();
