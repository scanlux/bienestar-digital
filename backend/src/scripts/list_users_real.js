require('dotenv').config();
const mysql = require('mysql2/promise');

async function listUsers() {
  const config = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  console.log(`Conectando a ${config.host} como ${config.user}...`);
  try {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute('SELECT id, nombres, email, rol, estado, commerce_id FROM users');
    console.log('--- USERS LIST ---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('------------------');
    await connection.end();
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

listUsers();
