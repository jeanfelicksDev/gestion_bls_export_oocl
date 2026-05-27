const { Client } = require('pg');
require('dotenv').config({ path: '.env.production' });

async function searchAllTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const searchTerms = [
    "4054938440", "4055060570", "4055086110", "4055096610",
    "4055105020", "4055106280", "4055107290", "4055108910",
    "4055112460", "4055112469", "4055112480", "4055112489",
    "4055118590", "4055126720", "4055122560", "4055118570",
    "4055115810", "4055122890", "4055096630", "4055082000",
    "4055025600", "4055060470", "4055092430", "4055096490"
  ];

  try {
    await client.connect();
    console.log('Connected to database.');

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    for (const table of tablesRes.rows) {
      const tableName = table.table_name;
      console.log(`Searching in table: ${tableName}`);
      
      const columnsRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);

      for (const column of columnsRes.rows) {
        const columnName = column.column_name;
        for (const term of searchTerms) {
          const res = await client.query(`
            SELECT * FROM "${tableName}" 
            WHERE CAST("${columnName}" AS TEXT) LIKE $1 
            LIMIT 1
          `, [`%${term}%`]);

          if (res.rows.length > 0) {
            console.log(`FOUND term ${term} in table ${tableName}, column ${columnName}!`);
            console.table(res.rows);
          }
        }
      }
    }
    console.log('Global search completed.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

searchAllTables();
