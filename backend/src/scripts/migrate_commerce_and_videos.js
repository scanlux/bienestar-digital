require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('Iniciando migracion de base de datos para Videos y Planes como "bienestar_deployer"...');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '100.127.144.125',
      user: 'bienestar_deployer',
      password: process.env.DB_DEPLOYER_PASSWORD || 'D3pl0y3r_2026_Secure',
      database: process.env.DB_NAME || 'marketplace_db'
    });
    
    console.log('Conexion establecida como bienestar_deployer. Aplicando cambios estructurales...');

    // 1. Modificar columna de aceptación en stores
    console.log('[1/7] Agregando columna "acceptance_mode" a la tabla "stores"...');
    try {
      await conn.query(`
        ALTER TABLE stores 
        ADD COLUMN acceptance_mode ENUM('automatico', 'manual') NOT NULL DEFAULT 'automatico';
      `);
      console.log('  - Columna "acceptance_mode" agregada a "stores".');
    } catch (e) {
      if (e.message.includes('Duplicate column name') || e.message.includes('already exists')) {
        console.log('  - La columna "acceptance_mode" ya existe en "stores".');
      } else {
        throw e;
      }
    }

    // 2. Modificar tipo de comercio y migrar datos
    console.log('[2/7] Migrando tipos de comercio (horizontal/vertical -> Empresarial/Comercial)...');
    
    // Primero, obtener comercios con el conteo de sedes activas
    const [commerces] = await conn.query('SELECT id, type FROM commerces');
    for (const commerce of commerces) {
      const [stores] = await conn.query('SELECT COUNT(*) as storeCount FROM stores WHERE commerce_id = ?', [commerce.id]);
      const count = stores[0].storeCount;
      let newType = 'Comercial';
      if (count >= 2) {
        newType = 'Empresarial';
      } else if (commerce.type === 'horizontal') {
        newType = 'Empresarial';
      } else if (commerce.type === 'vertical') {
        newType = 'Comercial';
      }
      
      await conn.query('UPDATE commerces SET type = ? WHERE id = ?', [newType, commerce.id]);
    }
    console.log('  - Tipos de comercio actualizados correctamente en base al conteo de sedes.');

    // 3. Crear tabla commerce_plans
    console.log('[3/7] Creando tabla "commerce_plans"...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS commerce_plans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          commerce_id INT NOT NULL,
          plan_type VARCHAR(50) NOT NULL DEFAULT 'Empresarial',
          status ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
          price_paid_domis DECIMAL(10,2) NOT NULL DEFAULT 50.00,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          payment_ref VARCHAR(150) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          CONSTRAINT fk_plans_commerce FOREIGN KEY (commerce_id) REFERENCES commerces(id) ON DELETE CASCADE
      );
    `);
    console.log('  - Tabla "commerce_plans" creada o verificada.');

    // 4. Crear tabla commerce_videos
    console.log('[4/7] Creando tabla "commerce_videos"...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS commerce_videos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          commerce_id INT NOT NULL,
          title VARCHAR(150) NOT NULL,
          description TEXT NULL,
          url_high VARCHAR(500) NULL,
          url_low VARCHAR(500) NULL,
          url_mid VARCHAR(500) NULL,
          status ENUM('uploading', 'active', 'deleted') NOT NULL DEFAULT 'uploading',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          CONSTRAINT fk_videos_commerce FOREIGN KEY (commerce_id) REFERENCES commerces(id) ON DELETE CASCADE
      );
    `);
    console.log('  - Tabla "commerce_videos" creada o verificada.');

    // 5. Crear tabla commerce_video_likes
    console.log('[5/7] Creando tabla "commerce_video_likes"...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS commerce_video_likes (
          video_id INT NOT NULL,
          user_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (video_id, user_id),
          CONSTRAINT fk_likes_video FOREIGN KEY (video_id) REFERENCES commerce_videos(id) ON DELETE CASCADE,
          CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('  - Tabla "commerce_video_likes" creada o verificada.');

    // 6. Crear tabla commerce_video_comments
    console.log('[6/7] Creando tabla "commerce_video_comments"...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS commerce_video_comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          video_id INT NOT NULL,
          user_id INT NOT NULL,
          comment TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_comments_video FOREIGN KEY (video_id) REFERENCES commerce_videos(id) ON DELETE CASCADE,
          CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('  - Tabla "commerce_video_comments" creada o verificada.');

    // 7. Otorgar permisos (si es posible, envuelto en try-catch)
    console.log('[7/7] Intentando otorgar permisos sobre las nuevas tablas...');
    const tables = ['commerce_plans', 'commerce_videos', 'commerce_video_likes', 'commerce_video_comments'];
    for (const table of tables) {
      try {
        await conn.query(`GRANT SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE, DROP, INDEX ON marketplace_db.${table} TO 'bienestar_deployer'@'%'`);
        await conn.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_db.${table} TO 'bienestar_admin_prod'@'%'`);
        console.log(`  - Permisos otorgados para ${table}.`);
      } catch (e) {
        console.log(`  - Nota: No se pudieron otorgar permisos explicitos para ${table} (esto es normal si no se ejecuta como root). Detalle: ${e.message}`);
      }
    }
    
    console.log('Migracion de Videos y Planes aplicada con exito!');
  } catch (error) {
    console.error('Error ejecutando la migracion:', error.message);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

runMigration();
