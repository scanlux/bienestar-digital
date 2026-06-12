require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function getUserRolesAndPermissions(userType, userId) {
  const [permissionsData] = await db.query(`
    SELECT DISTINCT p.name
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_type = ? AND ur.user_id = ?
  `, [userType, userId]);
  
  const [rolesData] = await db.query(`
    SELECT DISTINCT r.name, r.code
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_type = ? AND ur.user_id = ?
  `, [userType, userId]);

  return {
    permissions: permissionsData.map(p => p.name),
    roles: rolesData.map(r => r.code)
  };
}

async function main() {
  try {
    const email = 'admin_commerce_1@trendy.sytes.net';
    const password = 'admin123';

    // 1. Fetch user
    const [users] = await db.query(`
      SELECT u.id, u.email, u.password_hash, u.rol, u.estado, 
             u.es_repartidor, u.repartidor_activo,
             c.id AS commerce_id,
             s.id AS store_id,
             s.commerce_id AS store_commerce_id
      FROM users u
      LEFT JOIN commerces c ON c.usuario_id = u.id
      LEFT JOIN stores s ON s.usuario_id = u.id
      WHERE u.email = ?
    `, [email]);
    const user = users[0];

    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('User found:', user.email, 'Rol:', user.rol, 'Estado:', user.estado);
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password matches admin123:', isMatch);

    const { permissions, roles } = await getUserRolesAndPermissions('user', user.id);
    console.log('Roles:', roles);
    console.log('Permissions:', permissions);

    let commerceId = user.commerce_id;
    console.log('Commerce ID:', commerceId);
    
    // Now let's try querying what the dashboard API queries
    // 1. My stores
    const [stores] = await db.query('SELECT * FROM stores WHERE commerce_id = ?', [commerceId]);
    console.log('Stores queried count:', stores.length);
    console.log('Stores data:', stores.map(s => ({ id: s.id, nombre: s.nombre })));

    // 2. Orders
    // Let's see what the backend route for GET /api/manage/orders does. We'll search for it or look at its code.
    // Let's just query orders for this commerce's stores.
    if (stores.length > 0) {
      const storeIds = stores.map(s => s.id);
      const [orders] = await db.query('SELECT * FROM orders WHERE store_id IN (?)', [storeIds]);
      console.log('Orders queried count:', orders.length);
    } else {
      console.log('No stores found, cannot query orders.');
    }

    // 3. Products
    const [products] = await db.query(
      `SELECT DISTINCT p.* 
       FROM products p
       JOIN store_products sp ON p.id = sp.product_id
       JOIN stores s ON sp.store_id = s.id
       WHERE s.commerce_id = ?`,
      [commerceId]
    );
    console.log('Products queried count:', products.length);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
