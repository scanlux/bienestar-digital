const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: '100.127.144.125',
      user: 'bienestar_admin_prod', // Usando el usuario del .env para consistencia
      password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
      database: 'marketplace_db'
    });
    
    console.log('[TEST] Conexión establecida con MariaDB (Tailscale).');
    const [rows] = await conn.query('SHOW TABLES LIKE "store_accounts"');
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
