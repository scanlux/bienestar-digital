require('dotenv').config();
const db = require('../src/config/db');

async function run() {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Enable bypass for security and rbac triggers
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('SET @domi_is_root = 1');

    const permissions = [
      { name: 'declare_domi_reserve', description: 'Declarar saldo de reserva bancaria real en COP', category_id: 8, roles: ['root', 'system_manager'] },
      { name: 'mint_domi_cash', description: 'Acuñación transitoria de tokens DOMI por efectivo en caja', category_id: 8, roles: ['root', 'system_manager'] },
      { name: 'confirm_domi_reserve', description: 'Confirmar consignación bancaria de acuñación transitoria', category_id: 8, roles: ['root', 'system_manager'] },
      { name: 'manage_driver_profiles', description: 'Crear, editar o verificar perfiles de repartidores', category_id: 19, roles: ['root', 'system_manager', 'store_admin'] },
      { name: 'close_driver_liquidation', description: 'Cerrar turnos de repartidores y registrar efectivo liquidado', category_id: 19, roles: ['root', 'system_manager', 'store_admin'] }
    ];

    for (const p of permissions) {
      // 1. Insert permission if not exists
      const [existing] = await conn.query('SELECT id FROM permissions WHERE name = ?', [p.name]);
      let permId;
      if (existing.length === 0) {
        const [res] = await conn.query(
          'INSERT INTO permissions (category_id, name, description) VALUES (?, ?, ?)',
          [p.category_id, p.name, p.description]
        );
        permId = res.insertId;
        console.log(`Inserted permission: ${p.name} (ID: ${permId})`);
      } else {
        permId = existing[0].id;
        console.log(`Permission already exists: ${p.name} (ID: ${permId})`);
      }

      // 2. Associate with roles
      for (const roleCode of p.roles) {
        const [roleRows] = await conn.query('SELECT id FROM roles WHERE code = ?', [roleCode]);
        if (roleRows.length > 0) {
          const roleId = roleRows[0].id;
          const [existsAssoc] = await conn.query(
            'SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?',
            [roleId, permId]
          );
          if (existsAssoc.length === 0) {
            await conn.query(
              'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
              [roleId, permId]
            );
            console.log(`Associated permission ${p.name} with role ${roleCode}`);
          }
        }
      }
    }

    // Disable bypass
    await conn.query('SET @domi_bypass_security = NULL');
    await conn.query('SET @domi_is_root = NULL');
    await conn.commit();
    console.log('Transaction completed successfully.');
  } catch (error) {
    await conn.rollback();
    console.error('Error running script:', error);
  } finally {
    await conn.end();
  }
}

run();
