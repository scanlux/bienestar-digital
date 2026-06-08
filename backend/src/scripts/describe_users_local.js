require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const [rows] = await db.query('DESCRIBE users');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
