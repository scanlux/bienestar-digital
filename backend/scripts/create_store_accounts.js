require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('Usando host:', process.env.DB_HOST);
    console.log('Creando tabla store_accounts...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS store_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        banco VARCHAR(100) NOT NULL,
        tipo_cuenta VARCHAR(50) DEFAULT 'Ahorros',
        numero_cuenta VARCHAR(100) NOT NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Tabla store_accounts creada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error creando tabla store_accounts:', error);
    process.exit(1);
  }
}

migrate();
