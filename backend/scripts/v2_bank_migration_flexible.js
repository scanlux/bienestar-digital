require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('--- Iniciando Actualización Flexible de Cuentas Bancarias ---');

    // 1. Asegurar que store_accounts tenga las columnas flexibles
    console.log('Verificando columnas en store_accounts...');
    
    const [columns] = await db.query("SHOW COLUMNS FROM store_accounts");
    
    const addColumn = async (colName, definition) => {
      if (!columns.some(c => c.Field === colName)) {
        console.log(`Añadiendo columna: ${colName}`);
        await db.query(`ALTER TABLE store_accounts ADD COLUMN ${colName} ${definition}`);
      } else {
        console.log(`La columna ${colName} ya existe.`);
      }
    };

    // Agregar nuevos campos solicitados
    await addColumn('titular_nombre', 'VARCHAR(150) NULL');
    await addColumn('titular_documento', 'VARCHAR(50) NULL');
    await addColumn('detalle', 'VARCHAR(255) NULL');
    await addColumn('vencimiento_tarjeta', 'VARCHAR(10) NULL');

    // Asegurar que banco y tipo_cuenta sean VARCHAR para máxima flexibilidad (Nequi, Llave Breve, etc.)
    console.log('Asegurando flexibilidad en tipos de datos...');
    await db.query("ALTER TABLE store_accounts MODIFY COLUMN banco VARCHAR(100) NOT NULL");
    await db.query("ALTER TABLE store_accounts MODIFY COLUMN tipo_cuenta VARCHAR(50) DEFAULT 'Ahorros'");

    console.log('--- Proceso completado con éxito ---');
    process.exit(0);
  } catch (error) {
    console.error('Error en la actualización:', error);
    process.exit(1);
  }
}

migrate();
