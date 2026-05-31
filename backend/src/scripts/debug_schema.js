require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugSchema() {
  const config = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  try {
    const connection = await mysql.createConnection(config);
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('--- TABLES ---');
    console.log(tables);
    
    const [cols] = await connection.execute('DESCRIBE users');
    console.log('--- USERS COLUMNS ---');
    console.log(cols);
    
    await connection.end();
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

debugSchema();
