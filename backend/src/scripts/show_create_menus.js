require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const [rows] = await db.query('SHOW CREATE TABLE menus');
    console.log(rows[0]['Create Table']);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
