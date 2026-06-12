require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const [rows] = await db.query('SELECT id, email, rol, estado FROM users LIMIT 10');
    console.log('--- USERS IN DATABASE ---');
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error('Error querying database:', error);
    process.exit(1);
  }
}

main();
