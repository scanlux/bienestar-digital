require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const [columns] = await db.query('DESCRIBE products');
    console.log('--- PRODUCTS TABLE COLUMNS ---');
    console.log(columns);
    process.exit(0);
  } catch (error) {
    console.error('Error DESCRIBE products:', error);
    process.exit(1);
  }
}

main();
