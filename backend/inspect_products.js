require('dotenv').config();
const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'marketplace_db'
    });
    const [cols] = await conn.query('DESCRIBE products');
    console.log(cols);
  } catch (e) { console.error(e); } finally { process.exit(); }
}
run();
