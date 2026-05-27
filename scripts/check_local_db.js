const Database = require('better-sqlite3');
const db = new Database('dev.db');

try {
  const blCount = db.prepare("SELECT count(*) as count FROM BL WHERE createdAt >= '2026-04-01'").get();
  console.log(`BLs in SQLite since 2026-04-01: ${blCount.count}`);

  const voyages = db.prepare("SELECT count(*) as count FROM Voyage WHERE createdAt >= '2026-04-01'").get();
  console.log(`Voyages in SQLite since 2026-04-01: ${voyages.count}`);

  const sample = db.prepare("SELECT booking, createdAt FROM BL WHERE createdAt >= '2026-04-01' LIMIT 5").all();
  console.table(sample);

} catch (err) {
  console.error('Error:', err);
} finally {
  db.close();
}
