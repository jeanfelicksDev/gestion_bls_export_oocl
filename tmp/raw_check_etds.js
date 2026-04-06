const { Pool } = require("pg");
require("dotenv").config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query("SELECT id, numero, etd FROM \"Voyage\"");
    console.log("VOYAGES IN DB:");
    res.rows.forEach(v => {
      console.log(`Voyage ${v.numero}: ETD = ${v.etd}`);
    });
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    await pool.end();
  }
}

check();
