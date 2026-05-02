require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');

async function inspect() {
  const tables = ['stores', 'commerces', 'products', 'categorias', 'menus', 'store_operating_hours'];
  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`);
    try {
      const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);
      console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));
    } catch (e) {
      console.error(`Error inspecting ${table}: ${e.message}`);
    }
  }
  process.exit();
}

inspect();
