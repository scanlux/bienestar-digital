const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  });
  const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', ['admin_commerce_1@trendy.sytes.net']);
  console.log('User:', users[0]);
  if (users.length > 0) {
    const [roles] = await connection.execute(`
      SELECT ur.*, r.name as role_name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = ?
    `, [users[0].id]);
    console.log('Roles:', roles);
    
    const [perms] = await connection.execute(`
      SELECT p.name 
      FROM user_roles ur 
      JOIN role_permissions rp ON ur.role_id = rp.role_id 
      JOIN permissions p ON rp.permission_id = p.id 
      WHERE ur.user_id = ?
    `, [users[0].id]);
    console.log('Permissions:', perms.map(p => p.name));
  }
  await connection.end();
}
run();
