const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  console.log('=== APLICANDO PERMISOS DE VISTA DE CATÁLOGO ===');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  });

  try {
    // 1. Activar bypass temporal
    await connection.query('SET @domi_is_root = 1;');

    // 2. Obtener id del permiso view_catalog
    const [viewCatRows] = await connection.query("SELECT id FROM permissions WHERE name = 'view_catalog'");
    if (viewCatRows.length === 0) {
      throw new Error("El permiso 'view_catalog' no existe en la base de datos.");
    }
    const viewCatalogId = viewCatRows[0].id;
    console.log(`ID del permiso 'view_catalog': ${viewCatalogId}`);

    // 3. Obtener id de los roles commerce_manager y operator_full
    const [cmRows] = await connection.query("SELECT id FROM roles WHERE code = 'commerce_manager'");
    const [opRows] = await connection.query("SELECT id FROM roles WHERE code = 'operator_full'");

    if (cmRows.length > 0) {
      const cmRoleId = cmRows[0].id;
      await connection.query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)",
        [cmRoleId, viewCatalogId]
      );
      console.log(`✔ Asignado 'view_catalog' a Gerente de Comercio (Role ID: ${cmRoleId})`);
    }

    if (opRows.length > 0) {
      const opRoleId = opRows[0].id;
      await connection.query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)",
        [opRoleId, viewCatalogId]
      );
      console.log(`✔ Asignado 'view_catalog' a Operador Completo (Role ID: ${opRoleId})`);
    }

    // 4. Verificación final
    const [currentPerms] = await connection.query(`
      SELECT r.code as role_code, p.name as permission_name
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.name = 'view_catalog'
    `);
    console.log('\nRoles asignados a view_catalog en base de datos:');
    console.log(currentPerms);

    await connection.end();
    console.log('=== PROCESO COMPLETADO CON EXITO ===');
  } catch (err) {
    console.error('Error al aplicar permisos:', err.message);
    try {
      await connection.end();
    } catch (_) {}
  }
}

run();
