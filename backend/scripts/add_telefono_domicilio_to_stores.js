require('dotenv').config({ path: __dirname + '/../.env' });
const mysql = require('mysql2/promise');

async function migrate() {
  try {
    console.log('Agregando columna telefono_domicilio a la tabla stores...');
    
    // Conectar como root para la migración
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: 'root',
      password: 'Kh#azr9b!yvP27_mQ*rT5x',
      database: process.env.DB_NAME
    });

    await connection.query(`
      ALTER TABLE stores 
      ADD COLUMN IF NOT EXISTS telefono_domicilio VARCHAR(50) NULL AFTER telefono;
    `);
    
    console.log('Migración completada con éxito: Columna telefono_domicilio añadida.');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

migrate();
