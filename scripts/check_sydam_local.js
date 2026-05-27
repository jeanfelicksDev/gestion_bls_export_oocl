const Database = require('better-sqlite3');
const db = new Database('c:/Users/HP/AntiGravity/SydamOnLine/prisma/dev.db');

try {
  const blCount = db.prepare("SELECT count(*) as count FROM BL").get();
  console.log(`BLs in SydamOnLine SQLite: ${blCount.count}`);

  const voyages = db.prepare("SELECT count(*) as count FROM Voyage").get();
  console.log(`Voyages in SydamOnLine SQLite: ${voyages.count}`);

  const sample = db.prepare("SELECT * FROM BL LIMIT 5").all();
  console.table(sample);

} catch (err) {
  console.error('Error:', err);
} finally {
  db.close();
}
