const { Pool } = require("pg");
require("dotenv").config();

async function check() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const resVoyages = await pool.query("SELECT COUNT(*) FROM \"Voyage\"");
    const resBLs = await pool.query("SELECT COUNT(*) FROM \"BL\"");
    console.log("DATABASE RAW CHECK:");
    console.log("Voyage count:", resVoyages.rows[0].count);
    console.log("BL count:", resBLs.rows[0].count);
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    await pool.end();
  }
}

check();
