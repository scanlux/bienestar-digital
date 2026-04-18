require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('Agregando columna url_maps a la tabla stores...');
    await db.query(`
      ALTER TABLE stores 
      ADD COLUMN IF NOT EXISTS url_maps VARCHAR(1000) NULL AFTER image_url;
    `);
    console.log('Migración completada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

migrate();
