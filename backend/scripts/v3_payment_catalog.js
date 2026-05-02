require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  let connection;
  try {
    console.log('--- Iniciando Creación de Catálogo de Pagos ---');
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Crear tabla de catálogo
    console.log('Creando payment_platforms...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_platforms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        tipo_entidad VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Poblar tabla
    const [existing] = await connection.query('SELECT COUNT(*) as count FROM payment_platforms');
    if (existing[0].count === 0) {
      console.log('Poblando payment_platforms con entidades reales...');
      const platforms = [
        ['Bancolombia', 'banco'],
        ['Nequi', 'monedero'],
        ['Daviplata', 'monedero'],
        ['Davivienda', 'banco'],
        ['Transfiya', 'transferencia_rapida'],
        ['Banco de Bogotá', 'banco'],
        ['Banco de Occidente', 'banco'],
        ['BBVA', 'banco'],
        ['RappiPay', 'monedero']
      ];
      await connection.query('INSERT INTO payment_platforms (nombre, tipo_entidad) VALUES ?', [platforms]);
    }

    // 3. Modificar store_accounts
    console.log('Alistando columnas de store_accounts...');
    const [columns] = await connection.query("SHOW COLUMNS FROM store_accounts");
    
    // Add platform_id if missing
    if (!columns.some(c => c.Field === 'platform_id')) {
      console.log('Añadiendo platform_id...');
      await connection.query(`
        ALTER TABLE store_accounts 
        ADD COLUMN platform_id INT NULL AFTER store_id,
        ADD CONSTRAINT fk_sa_platform FOREIGN KEY (platform_id) REFERENCES payment_platforms(id) ON DELETE SET NULL
      `);
    }

    // Add llave if missing
    if (!columns.some(c => c.Field === 'llave')) {
      console.log('Añadiendo columna llave...');
      // It specifies "llave" specific field. We'll add it after numero_cuenta
      await connection.query('ALTER TABLE store_accounts ADD COLUMN llave VARCHAR(100) NULL AFTER numero_cuenta');
    }

    // Drop banco if it exists (since we will use platform_id)
    if (columns.some(c => c.Field === 'banco')) {
      console.log('Eliminando antigua columna de texto libre - banco...');
      await connection.query('ALTER TABLE store_accounts DROP COLUMN banco');
    }
    
    await connection.commit();
    console.log('--- Migración completada exitosamente ---');
    process.exit(0);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error en migración:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

migrate();
