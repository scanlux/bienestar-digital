require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    console.log('Conectado a la base de datos.');

    // 1. Obtener la fila de permiso
    const [perms] = await db.query('SELECT * FROM permissions WHERE name = "manage_store_catalog"');
    console.log('--- Permiso manage_store_catalog ---');
    console.log(perms);

    if (perms.length > 0) {
      const permId = perms[0].id;
      
      // 2. Obtener roles asociados a este permiso
      const [rolePerms] = await db.query(`
        SELECT rp.*, r.name as role_name 
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        WHERE rp.permission_id = ?
      `, [permId]);
      
      console.log('--- Roles con este permiso ---');
      console.log(rolePerms);
    }

    await db.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
