require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('--- Iniciando Migración: Añadir direcciones y celular a usuarios ---');

    console.log('Añadiendo columna celular a tabla users...');
    try {
      await db.query(`ALTER TABLE users ADD COLUMN celular VARCHAR(20) DEFAULT NULL`);
      console.log('Columna celular añadida correctamente.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('La columna celular ya existe.');
      } else {
        throw e;
      }
    }

    console.log('Creando tabla user_addresses...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        label VARCHAR(50) DEFAULT 'Casa',
        direccion VARCHAR(255) NOT NULL,
        latitud DECIMAL(10,8) DEFAULT NULL,
        longitud DECIMAL(11,8) DEFAULT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
        updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabla user_addresses creada o verificada correctamente.');

    console.log('--- Migración completada exitosamente ---');
    process.exit(0);
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  }
}

migrate();
