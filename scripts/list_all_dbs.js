const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function listAllDatabases() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to neondb.');

    const res = await client.query(`SELECT datname FROM pg_database WHERE datistemplate = false`);
    console.log('Databases in this project:');
    console.table(res.rows);

    for (const db of res.rows) {
      const dbName = db.datname;
      if (dbName === 'postgres' || dbName === 'neondb') continue;
      
      console.log(`Checking database: ${dbName}`);
      const dbClient = new Client({
        connectionString: process.env.DATABASE_URL.replace(/\/neondb/, `/${dbName}`),
        ssl: { rejectUnauthorized: false }
      });
      try {
        await dbClient.connect();
        const tables = await dbClient.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log(`Tables in ${dbName}:`);
        console.table(tables.rows);
      } catch (e) {
        console.log(`Could not connect to ${dbName}: ${e.message}`);
      } finally {
        await dbClient.end();
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listAllDatabases();
