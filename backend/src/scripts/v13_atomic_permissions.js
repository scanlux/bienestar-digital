require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('=== APLICANDO MIGRACIÓN DE PERMISOS ATÓMICOS (V13) ===');

  const sqlPath = path.join(__dirname, 'v13_atomic_permissions.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('ERROR: No se encuentra el archivo SQL v13_atomic_permissions.sql.');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const config = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db',
    multipleStatements: true
  };

  console.log(`Conectando a MariaDB en: ${config.host} como ${config.user}...`);
  const connection = await mysql.createConnection(config);

  try {
    console.log('Ejecutando sentencias SQL...');
    await connection.query(sql);
    console.log('✔ Migración SQL ejecutada con éxito.');

    // Verificación
    console.log('\n--- VERIFICACIÓN DE PERMISOS ATÓMICOS ---');
    const [perms] = await connection.query(`
      SELECT id, name, description FROM permissions 
      WHERE name IN (
        'enable_store_catalog', 
        'write_catalog', 
        'delete_catalog', 
        'edit_store_basic', 
        'edit_store_advanced'
      )
    `);
    console.log('Nuevos permisos en base de datos:');
    console.log(perms);

    const [deletedPerms] = await connection.query(`
      SELECT id, name FROM permissions 
      WHERE name IN ('edit_store', 'manage_catalog', 'manage_store_catalog')
    `);
    if (deletedPerms.length === 0) {
      console.log('✔ Correcto: Los permisos obsoletos (edit_store, manage_catalog, manage_store_catalog) han sido eliminados.');
    } else {
      console.error('❌ ERROR: Aún existen permisos obsoletos en la base de datos:', deletedPerms);
    }

    await connection.end();
    console.log('=== MIGRACIÓN V13 COMPLETADA CON ÉXITO ===');
  } catch (error) {
    console.error('❌ ERROR CRÍTICO EN LA MIGRACIÓN V13:', error.message);
    try {
      await connection.end();
    } catch (_) {}
    process.exit(1);
  }
}

run();
