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
    
    console.log('[INFO] Conexión establecida con MariaDB (Tailscale).');
    
    const [tokenRegistry] = await conn.query('SELECT * FROM token_registry');
    console.log('\n--- TOKEN REGISTRY ---');
    console.log(JSON.stringify(tokenRegistry, null, 2));
    
    const [protocolRules] = await conn.query('SELECT * FROM protocol_rules');
    console.log('\n--- PROTOCOL RULES ---');
    console.log(JSON.stringify(protocolRules, null, 2));

  } catch (e) {
    console.error('[ERROR]', e.message);
  } finally {
    process.exit();
  }
}

run();
