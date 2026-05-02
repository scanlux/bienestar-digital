require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('--- Iniciando Actualización Documento Titular a Numérico ---');

    console.log('Limpiando datos existentes en titular_documento (removiendo no-numéricos)...');
    
    // Convertir todos los campos de "titular_documento" que tengan letras o caracteres no-numericos a NULL
    await db.query(`UPDATE store_accounts SET titular_documento = NULL WHERE titular_documento REGEXP '[^0-9]'`);
    
    console.log('Modificando columna a BIGINT...');
    await db.query(`ALTER TABLE store_accounts MODIFY COLUMN titular_documento BIGINT NULL`);
    
    console.log('--- Columna modificada exitosamente a Numérica ---');
    process.exit(0);
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

migrate();
