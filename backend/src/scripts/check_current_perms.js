require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const config = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log('Conectado a la base de datos.');

    const [perms] = await connection.execute('SELECT * FROM permissions');
    console.log('--- PERMISOS ACTUALES ---');
    console.log(perms);

    const [userPerms] = await connection.execute('SELECT * FROM user_permissions');
    console.log('--- USER PERMISSIONS ACTUALES ---');
    console.log(userPerms);

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
