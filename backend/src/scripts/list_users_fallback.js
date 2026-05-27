const mysql = require('mysql2/promise');

async function listUsers() {
  const configs = [
    { host: '100.127.144.125', user: 'root', password: '', database: 'bienestar_digital' },
    { host: 'localhost', user: 'root', password: '', database: 'bienestar_digital' },
    { host: '127.0.0.1', user: 'root', password: '', database: 'bienestar_digital' }
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
