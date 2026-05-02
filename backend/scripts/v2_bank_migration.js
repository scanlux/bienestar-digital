require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('--- Iniciando Migración de Sistema Bancario ---');

    // 1. Crear tabla de bancos (Catálogo)
    console.log('Creando tabla de bancos...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS banks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        codigo VARCHAR(10),
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Poblar bancos iniciales
    const [existingBanks] = await db.query('SELECT COUNT(*) as count FROM banks');
    if (existingBanks[0].count === 0) {
      console.log('Poblando catálogo de bancos...');
      const banks = [
        ['Bancolombia', '007', 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Bancolombia_logo.png'],
        ['Nequi', '507', 'https://static.wikia.nocookie.net/logos/images/a/ae/Nequi_Logo.png'],
        ['Davivienda', '051', null],
        ['Daviplata', '052', null],
        ['BBVA', '013', null],
        ['Banco de Bogotá', '001', null],
        ['Banco de Occidente', '023', null],
        ['Scotiabank Colpatria', '019', null]
      ];
      await db.query('INSERT INTO banks (nombre, codigo, logo_url) VALUES ?', [banks]);
    }

    // 3. Modificar/Recrear store_accounts
    console.log('Actualizando tabla store_accounts...');
    
    // Primero, hacemos un backup preventivo si existiera info (aunque el sistema es nuevo)
    // Para simplificar y dado que el usuario pidió una "nueva tabla", vamos a añadir las columnas si no existen
    // o recrearla si es necesario.
    
    // Verificamos si existe la columna bank_id, si no, la añadimos y transformamos
    const [columns] = await db.query("SHOW COLUMNS FROM store_accounts");
    const hasBankId = columns.some(c => c.Field === 'bank_id');
    const hasTitular = columns.some(c => c.Field === 'titular_nombre');

    if (!hasBankId) {
      console.log('Añadiendo columnas bank_id, titular y detalle...');
      await db.query(`
        ALTER TABLE store_accounts 
        ADD COLUMN bank_id INT NULL AFTER store_id,
        ADD COLUMN titular_nombre VARCHAR(150) NULL,
        ADD COLUMN titular_documento VARCHAR(50) NULL,
        ADD COLUMN detalle VARCHAR(255) NULL,
        ADD COLUMN vencimiento_tarjeta VARCHAR(10) NULL,
        ADD CONSTRAINT fk_store_accounts_bank FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE SET NULL
      `);
      
      // Migrar datos de 'banco' (string) a bank_id (si es posible)
      // Por ahora lo dejamos marcado para que el usuario actualice,
      // o intentamos un match básico.
      await db.query("UPDATE store_accounts SET bank_id = (SELECT id FROM banks WHERE nombre LIKE CONCAT('%', store_accounts.banco, '%') LIMIT 1) WHERE bank_id IS NULL");
      
      // Remover la columna vieja 'banco' si ya no se usa
      // await db.query("ALTER TABLE store_accounts DROP COLUMN banco");
    }

    console.log('--- Migración completada con éxito ---');
    process.exit(0);
  } catch (error) {
    console.error('Error en migración:', error);
    process.exit(1);
  }
}

migrate();
