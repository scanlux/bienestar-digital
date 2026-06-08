require('dotenv').config({ path: __dirname + '/../.env' });
const mysql = require('mysql2/promise');

async function migrate() {
  try {
    console.log('Agregando columna es_vegetariano a la tabla products...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_ROOT_USER || 'root',
      password: process.env.DB_ROOT_PASSWORD,
      database: process.env.DB_NAME
    });

    await connection.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS es_vegetariano TINYINT(1) DEFAULT 0 AFTER disponible;
    `);
    
    console.log('Migración de productos completada.');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

migrate();
