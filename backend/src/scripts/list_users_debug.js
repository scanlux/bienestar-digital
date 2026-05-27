const pool = require('../config/db');

async function listUsers() {
  try {
    const [rows] = await pool.execute('SELECT id, nombre, email, rol, permissions FROM users');
    console.log('--- USERS LIST ---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('------------------');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

listUsers();
