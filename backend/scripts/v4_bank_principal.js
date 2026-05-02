require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('--- Iniciando Migración: Añadir es_principal a store_accounts ---');

    const [columns] = await db.query("SHOW COLUMNS FROM store_accounts");
    
    if (!columns.some(c => c.Field === 'es_principal')) {
      console.log('Añadiendo columna es_principal...');
      await db.query(`ALTER TABLE store_accounts ADD COLUMN es_principal BOOLEAN DEFAULT FALSE`);
      console.log('Columna añadida con éxito.');
    } else {
      console.log('La columna es_principal ya existe.');
    }

    console.log('--- Migración completada con éxito ---');
    process.exit(0);
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

migrate();
