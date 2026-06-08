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
    
    console.log('[TEST] Conexión establecida con MariaDB (Tailscale).');
    const [rows] = await conn.query('SHOW TABLES LIKE "commerce_%"');
    console.log('[RESULTADO]', rows);
    
    if (rows.length > 0) {
      console.log('[OK] La tabla store_accounts existe.');
    } else {
      console.warn('[WARN] La tabla store_accounts no fue encontrada.');
    }

  } catch (e) {
    console.error('[ERROR]', e.message);
  } finally {
    process.exit();
  }
}

run();
