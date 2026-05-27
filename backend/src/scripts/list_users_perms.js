const mysql = require('mysql2/promise');

async function listUsersAndPermissions() {
  const config = {
    host: '100.127.144.125',
    user: 'bienestar_admin_prod',
    password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
    database: 'marketplace_db'
  };

  try {
    const connection = await mysql.createConnection(config);
    
    const [users] = await connection.execute('SELECT id, nombre, email, rol FROM users');
    const [perms] = await connection.execute('SELECT user_id, permission_id FROM user_permissions');
    
    // Agrupar permisos por usuario
    const usersWithPerms = users.map(u => {
      const userPerms = perms.filter(p => p.user_id === u.id).map(p => p.permission_id);
      return { ...u, permissions: userPerms };
    });

    console.log('--- USERS WITH PERMISSIONS ---');
    console.log(JSON.stringify(usersWithPerms, null, 2));
    
    await connection.end();
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

listUsersAndPermissions();
