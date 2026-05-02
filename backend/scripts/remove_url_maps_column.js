const db = require('../src/config/db');

async function removeColumn() {
  try {
    console.log('--- Iniciando eliminación de columna url_maps ---');
    
    // Verificar si la columna existe antes de intentar borrarla (opcional en MariaDB si usas IF EXISTS pero DROP COLUMN IF EXISTS requiere MariaDB 10.2.8+)
    // Usaremos un try/catch específico para el error de columna no existente.
    try {
      await db.query('ALTER TABLE stores DROP COLUMN url_maps');
      console.log('✅ Columna url_maps eliminada de la tabla stores.');
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️ La columna url_maps ya no existe en la tabla stores.');
      } else {
        throw err;
      }
    }

    console.log('--- Proceso finalizado con éxito ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando el script:', error.message);
    process.exit(1);
  }
}

removeColumn();
