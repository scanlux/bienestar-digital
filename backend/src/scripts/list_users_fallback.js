require('dotenv').config();
const mysql = require('mysql2/promise');

async function listUsers() {
  const configs = [
    {
      host: process.env.DB_HOST || '100.127.144.125',
      user: process.env.DB_USER || 'bienestar_admin_prod',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'marketplace_db'
    },
    { host: 'localhost', user: 'root', password: '', database: 'marketplace_db' }
  ];

  for (const config of configs) {
    console.log(`Intentando conectar a ${config.host}...`);
    try {
      const connection = await mysql.createConnection(config);
      const [rows] = await connection.execute('SELECT id, nombre, email, rol, permissions FROM users');
      console.log('--- USERS LIST ---');
      console.log(JSON.stringify(rows, null, 2));
      console.log('------------------');
      await connection.end();
      return;
    } catch (error) {
      console.log(`Error en ${config.host}: ${error.code}`);
    }
  }
}

listUsers();
