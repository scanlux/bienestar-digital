require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const [columns] = await db.query('DESCRIBE menus');
    console.log('--- MENUS TABLE COLUMNS ---');
    console.log(columns);
    process.exit(0);
  } catch (error) {
    console.error('Error DESCRIBE menus:', error);
    process.exit(1);
  }
}

main();
