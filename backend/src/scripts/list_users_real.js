const mysql = require('mysql2/promise');

async function listUsers() {
  const config = {
    host: '100.127.144.125',
    user: 'bienestar_admin_prod',
    password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
    database: 'marketplace_db'
  };

  console.log(`Conectando a ${config.host} como ${config.user}...`);
  try {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute('SELECT id, nombre, email, rol, permissions FROM users');
    console.log('--- USERS LIST ---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('------------------');
    await connection.end();
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

listUsers();
