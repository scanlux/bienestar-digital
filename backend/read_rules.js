const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: '100.127.144.125',
      user: 'bienestar_admin_prod',
      password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
      database: 'marketplace_db'
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
