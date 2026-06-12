require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const [rows] = await db.query('SELECT id, email, nombres, apellidos, nivel, estado FROM system_users');
    console.log('--- SYSTEM_USERS IN DATABASE ---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('--------------------------------');
  } catch (err) {
    console.error('Error querying system_users:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
