require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

const mysql = require('mysql2/promise');

async function migrate() {
  try {
    console.log('Agregando columna contacto_directo a la tabla stores...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_ROOT_USER || 'root',
      password: process.env.DB_ROOT_PASSWORD,
      database: process.env.DB_NAME
    });

    await connection.query(`
      ALTER TABLE stores 
      ADD COLUMN IF NOT EXISTS contacto_directo VARCHAR(255) NULL AFTER nombre_sucursal;
    `);
    
    console.log('Migración completada con éxito.');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

migrate();
