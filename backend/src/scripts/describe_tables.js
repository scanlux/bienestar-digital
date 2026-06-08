require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const tables = ['commerces', 'stores', 'wallets'];
    for (const table of tables) {
      console.log(`=== ${table} ===`);
      const [rows] = await db.query(`DESCRIBE ${table}`);
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
