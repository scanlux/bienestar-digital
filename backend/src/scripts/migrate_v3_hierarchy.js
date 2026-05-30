require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('🚀 Iniciando migración de base de datos como "root"...');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '100.127.144.125',
      user: 'root',
      password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
      database: process.env.DB_NAME || 'marketplace_db'
    });
    
    console.log('✅ Conexión establecida como root. Aplicando cambios estructurales...');

    console.log('[1/4] Agregando campos de gerencia a la tabla "commerces"...');
    try {
      await conn.query(`
        ALTER TABLE commerces 
        ADD COLUMN email VARCHAR(255) NULL,
        ADD COLUMN gerente_nombre VARCHAR(150) NULL,
        ADD COLUMN gerente_telefono VARCHAR(20) NULL;
      `);
      console.log('  - Columnas agregadas a "commerces".');
    } catch (e) {
      if (e.message.includes('Duplicate column name')) {
        console.log('  - Las columnas de gerencia ya existen en "commerces".');
      } else {
        throw e;
      }
    }

    console.log('[2/4] Agregando columna "commerce_id" a la tabla "users"...');
    try {
      await conn.query(`
        ALTER TABLE users 
        ADD COLUMN commerce_id INT(11) NULL,
        ADD CONSTRAINT fk_users_commerce FOREIGN KEY (commerce_id) REFERENCES commerces(id) ON DELETE SET NULL;
      `);
      console.log('  - Columna "commerce_id" y foreign key agregadas a "users".');
    } catch (e) {
      if (e.message.includes('Duplicate column name')) {
        console.log('  - La columna "commerce_id" ya existe en "users".');
      } else {
        throw e;
      }
    }

    console.log('[3/4] Creando tabla intermedia muchos-a-muchos "user_stores"...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_stores (
          user_id INT(11) NOT NULL,
          store_id INT(11) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, store_id),
          CONSTRAINT fk_user_stores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_user_stores_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      );
    `);
    console.log('  - Tabla "user_stores" creada o verificada.');

    console.log('[4/4] Otorgando permisos de user_stores a bienestar_deployer y bienestar_admin_prod...');
    try {
      await conn.query("GRANT SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE, DROP, INDEX ON marketplace_db.user_stores TO 'bienestar_deployer'@'%'");
      await conn.query("GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_db.user_stores TO 'bienestar_admin_prod'@'%'");
      await conn.query('FLUSH PRIVILEGES');
      console.log('  - Permisos otorgados.');
    } catch (e) {
      console.warn('  - Advertencia al otorgar permisos:', e.message);
    }
    
    console.log('✅ ¡Migración aplicada con éxito!');
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

runMigration();
