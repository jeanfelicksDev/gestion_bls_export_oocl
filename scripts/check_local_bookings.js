const Database = require('better-sqlite3');
const db = new Database('dev.db');

const userBookings = [
  "4054938440", "4055060570", "4055086110", "4055096610",
  "4055105020", "4055106280", "4055107290", "4055108910",
  "4055112460", "4055112469", "4055112480", "4055112489",
  "4055118590", "4055126720", "4055122560", "4055118570",
  "4055115810", "4055122890", "4055096630", "4055082000",
  "4055025600", "4055060470", "4055092430", "4055096490"
];

try {
  const placeholders = userBookings.map(() => '?').join(',');
  const res = db.prepare(`SELECT booking, createdAt FROM BL WHERE booking IN (${placeholders})`).all(userBookings);
  
  console.log(`Found ${res.length} out of ${userBookings.length} bookings in local SQLite.`);
  console.table(res);

} catch (err) {
  console.error('Error:', err);
} finally {
  db.close();
}
