const mysql = require('mysql2/promise');

async function debugSchema() {
  const config = {
    host: '100.127.144.125',
    user: 'bienestar_admin_prod',
    password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
    database: 'marketplace_db'
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
