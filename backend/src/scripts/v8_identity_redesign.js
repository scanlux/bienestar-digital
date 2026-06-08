require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  console.log('=== INICIANDO MIGRACIÓN: REDISEÑO DE IDENTIDADES (FASE 1) ===');

  // Conectar usando credenciales del deployer (bienestar_deployer)
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '100.127.144.125',
    user: 'bienestar_deployer',
    password: process.env.DB_DEPLOYER_PASSWORD || 'D3pl0y3r_2026_Secure',
    database: process.env.DB_NAME || 'marketplace_db',
    port: 3306
  });

  try {
    // 0. Habilitar bypass de seguridad para la sesión
    await connection.query('SET @domi_bypass_security = 1');
    console.log('✔ Bypass de seguridad activado para la sesión.');

    // 1. Modificar users: roles y flags de repartidor
    console.log('\n--- 1. Modificando tabla users ---');
    
    // Paso 1.1: Convertir temporalmente a VARCHAR para no perder datos en la transición del ENUM
    await connection.query('ALTER TABLE users MODIFY COLUMN rol VARCHAR(20) DEFAULT "customer"');
    console.log('  -> Columna rol convertida a VARCHAR temporalmente.');

    // Paso 1.2: Normalizar los roles viejos
    await connection.query("UPDATE users SET rol = 'customer' WHERE rol IN ('customer', 'delivery')");
    await connection.query("UPDATE users SET rol = 'admin' WHERE rol = 'vendor'");
    console.log('  -> Roles antiguos normalizados (vendor -> admin, delivery -> customer).');

    // Paso 1.3: Aplicar el nuevo ENUM
    await connection.query("ALTER TABLE users MODIFY COLUMN rol ENUM('root', 'system', 'admin', 'customer') NOT NULL DEFAULT 'customer'");
    console.log('  -> Nuevo ENUM de roles aplicado.');

    // Paso 1.4: Agregar flags de repartidor
    // Verificar si ya existen antes de agregarlas
    const [userCols] = await connection.query('DESCRIBE users');
    const cols = userCols.map(c => c.Field);
    
    if (!cols.includes('es_repartidor')) {
      await connection.query('ALTER TABLE users ADD COLUMN es_repartidor TINYINT(1) NOT NULL DEFAULT 0 AFTER rol');
      console.log('  -> Columna es_repartidor añadida.');
    }
    if (!cols.includes('repartidor_activo')) {
      await connection.query('ALTER TABLE users ADD COLUMN repartidor_activo TINYINT(1) NOT NULL DEFAULT 0 AFTER es_repartidor');
      console.log('  -> Columna repartidor_activo añadida.');
    }

    // 2. Crear tabla profiles
    console.log('\n--- 2. Creando tabla profiles ---');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id  INT NOT NULL,
        nombres     VARCHAR(100) NOT NULL,
        apellidos   VARCHAR(100),
        cedula      VARCHAR(20) NOT NULL UNIQUE,
        url_cedula  TEXT,
        telefono    VARCHAR(20) NOT NULL UNIQUE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_profile_user FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_profile_user UNIQUE (usuario_id)
      ) ENGINE=InnoDB;
    `);
    console.log('  -> Tabla profiles creada/verificada.');

    // 3. Poblar profiles (DML en transacción)
    console.log('\n--- 3. Poblando datos históricos en profiles ---');
    await connection.beginTransaction();
    try {
      // Poblar profiles saneando nulos y duplicados
      await connection.query(`
        INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
        SELECT
          id,
          COALESCE(nombres, 'Usuario'),
          COALESCE(apellidos, 'Sin Apellido'),
          COALESCE(cedula_numero, CONCAT('PLACEHOLDER_', id)),
          COALESCE(celular, telefono, CONCAT('300', LPAD(id, 7, '0')))
        FROM users
        ON DUPLICATE KEY UPDATE
          nombres = VALUES(nombres),
          apellidos = VALUES(apellidos),
          cedula = VALUES(cedula),
          telefono = VALUES(telefono);
      `);
      await connection.commit();
      console.log('  -> Datos poblados y migrados exitosamente.');
    } catch (dmlErr) {
      await connection.rollback();
      throw dmlErr;
    }

    // 4. Migrar wallets: agregar usuario_id FK directo
    console.log('\n--- 4. Migrando tabla wallets ---');
    const [walletCols] = await connection.query('DESCRIBE wallets');
    const wCols = walletCols.map(c => c.Field);
    
    if (!wCols.includes('usuario_id')) {
      await connection.query('ALTER TABLE wallets ADD COLUMN usuario_id INT UNIQUE NULL AFTER owner_id');
      await connection.query('ALTER TABLE wallets ADD CONSTRAINT fk_wallet_user FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE RESTRICT');
      console.log('  -> Columna usuario_id y restricción FK añadidas a wallets.');
    }

    // Migrar wallets existentes
    const [updateResult] = await connection.query(`
      UPDATE wallets w
      JOIN users u ON w.owner_type = 'user' AND w.owner_id = u.id
      SET w.usuario_id = u.id
    `);
    console.log(`  -> Wallets de usuario vinculadas directamente (${updateResult.affectedRows} actualizadas).`);

    // 5. Modificar commerces y stores
    console.log('\n--- 5. Modificando commerces y stores ---');
    const [commerceCols] = await connection.query('DESCRIBE commerces');
    const cCols = commerceCols.map(c => c.Field);

    // commerces: usuario_id y nit UNIQUE NOT NULL
    if (!cCols.includes('usuario_id')) {
      await connection.query('ALTER TABLE commerces ADD COLUMN usuario_id INT UNIQUE NULL AFTER id');
      await connection.query('ALTER TABLE commerces ADD CONSTRAINT fk_commerce_user FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE RESTRICT');
      console.log('  -> Columna usuario_id y restricción FK añadidas a commerces.');
    }

    // Saneamiento de NIT antes de UNIQUE NOT NULL
    await connection.query("UPDATE commerces SET nit = CONCAT('NIT_PLACEHOLDER_', id) WHERE nit IS NULL OR nit = ''");
    // Remover índices UNIQUE anteriores en nit si existen para no duplicar
    try {
      await connection.query('ALTER TABLE commerces DROP INDEX nit');
    } catch (_) {}
    try {
      await connection.query('ALTER TABLE commerces DROP INDEX uq_commerce_nit');
    } catch (_) {}
    
    await connection.query('ALTER TABLE commerces MODIFY COLUMN nit VARCHAR(30) NOT NULL');
    await connection.query('ALTER TABLE commerces ADD CONSTRAINT uq_commerce_nit UNIQUE (nit)');
    console.log('  -> Columna nit en commerces configurada como UNIQUE NOT NULL.');

    // stores: usuario_id y matricula UNIQUE NULL
    const [storeCols] = await connection.query('DESCRIBE stores');
    const sCols = storeCols.map(c => c.Field);

    if (!sCols.includes('usuario_id')) {
      await connection.query('ALTER TABLE stores ADD COLUMN usuario_id INT UNIQUE NULL AFTER brand_id');
      await connection.query('ALTER TABLE stores ADD CONSTRAINT fk_store_user FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE RESTRICT');
      console.log('  -> Columna usuario_id y restricción FK añadidas a stores.');
    }

    if (!sCols.includes('matricula')) {
      await connection.query('ALTER TABLE stores ADD COLUMN matricula VARCHAR(50) UNIQUE NULL AFTER nombre_sucursal');
      console.log('  -> Columna matricula mercantil añadida a stores.');
    }

    console.log('\n✔ MIGRACIÓN FASE 1 COMPLETADA CON ÉXITO.');

  } catch (error) {
    console.error('\n✖ ERROR DURANTE LA MIGRACIÓN:', error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

main();
