require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('Dropping fk_menus_store foreign key...');
    try {
      await db.query('ALTER TABLE menus DROP FOREIGN KEY fk_menus_store');
      console.log('Foreign key fk_menus_store dropped.');
    } catch (e) {
      console.log('Failed to drop fk_menus_store (might not exist):', e.message);
    }

    console.log('Dropping store_id column...');
    try {
      await db.query('ALTER TABLE menus DROP COLUMN store_id');
      console.log('Column store_id dropped successfully.');
    } catch (e) {
      console.log('Failed to drop store_id column:', e.message);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
