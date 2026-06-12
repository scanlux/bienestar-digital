require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const [rows] = await db.query(
      'SELECT id, email, rol, estado FROM users WHERE email = ?',
      ['admin_commerce_1@trendy.sytes.net']
    );
    console.log('--- USER INFO ---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('-----------------');
  } catch (err) {
    console.error('Error querying users:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
