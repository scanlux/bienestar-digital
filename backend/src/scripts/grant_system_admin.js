const mysql = require('mysql2/promise');

async function grantAllPermissions() {
  const config = {
    host: '100.127.144.125',
    user: 'root',
    password: 'Kh#azr9b!yvP27_mQ*rT5x', // Contraseña proporcionada por el usuario
    database: 'marketplace_db'
  };

  const userId = 10; // system@trendy.com
  const permissionIds = [1, 2, 3, 4];

  console.log(`Conectando como ROOT para otorgar permisos al usuario ID ${userId}...`);
  
  try {
    const connection = await mysql.createConnection(config);
    
    // Limpiar permisos previos para evitar duplicados
    await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
    
    // Insertar nuevos permisos
    for (const permId of permissionIds) {
      await connection.execute(
        'INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)',
        [userId, permId]
      );
    }

    console.log('✅ Todos los permisos (Super Admin) han sido otorgados con éxito.');
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error al otorgar permisos:', error.message);
  }
}

grantAllPermissions();
