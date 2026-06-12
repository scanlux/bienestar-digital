require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function getUserRolesAndPermissions(userType, userId) {
  const [permissionsData] = await db.query(`
    SELECT DISTINCT p.name
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_type = ? AND ur.user_id = ?
  `, [userType, userId]);
  
  const [rolesData] = await db.query(`
    SELECT r.code
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_type = ? AND ur.user_id = ?
  `, [userType, userId]);
  
  return {
    permissions: permissionsData.map(p => p.name),
    roles: rolesData.map(r => r.code)
  };
}

async function testLogin(email, password) {
  console.log(`Testing login for ${email} with password: ${password}`);
  try {
    const [systems] = await db.query(
      'SELECT * FROM system_users WHERE email = ?',
      [email]
    );
    const systemUser = systems[0];

    if (!systemUser) {
      console.log('❌ User not found');
      return;
    }

    console.log(`User found. Nivel: ${systemUser.nivel}, Estado: ${systemUser.estado}`);
    console.log(`Password Hash in DB: ${systemUser.password_hash}`);

    const isMatch = await bcrypt.compare(password, systemUser.password_hash);
    if (!isMatch) {
      console.log('❌ Password mismatch!');
      return;
    }

    console.log('✅ Password matches!');

    // Test RBAC retrieval
    console.log('Fetching roles and permissions...');
    const rbacData = await getUserRolesAndPermissions('system_user', systemUser.id);
    console.log('Roles/Permissions:', JSON.stringify(rbacData, null, 2));

    console.log('✅ Login test successful!');
  } catch (err) {
    console.error('❌ Error during testLogin:', err);
  }
}

async function main() {
  const passwords = ['admin123', 'root123', 'trendy123', 'password'];
  for (const pwd of passwords) {
    await testLogin('root@trendy.sytes.net', pwd);
    console.log('------------------------------');
  }
  process.exit(0);
}

main();
