const db = require('../../config/db');

class UserRepository {
  async findStoreAdmins(commerceId, isSystem) {
    let query = `
      SELECT u.id, u.email, u.rol, u.estado, 
             p.nombres, p.apellidos, p.telefono,
             c.id AS commerce_id
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN commerces c ON c.usuario_id = u.id
      WHERE u.rol = 'admin'
    `;
    const params = [];

    if (!isSystem) {
      query += ' AND c.id = ?';
      params.push(commerceId);
    }

    const [users] = await db.query(query, params);
    return users;
  }

  async findUserById(id) {
    const [rows] = await db.query('SELECT id, email, rol, estado FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findCommerceByManagerId(userId) {
    const [rows] = await db.query('SELECT id FROM commerces WHERE usuario_id = ?', [userId]);
    return rows[0] || null;
  }

  async checkUserExistsByEmail(email, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT id FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  async createUser(email, passwordHash, connection) {
    const queryExecutor = connection || db;
    const [result] = await queryExecutor.query(
      'INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, "admin", "activo")',
      [email, passwordHash]
    );
    return result.insertId;
  }

  async createProfile(userId, data, connection) {
    const queryExecutor = connection || db;
    const { nombres, apellidos, celular } = data;
    await queryExecutor.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
      [
        userId,
        nombres,
        apellidos || null,
        `REG_ADM_${userId}`,
        celular || `300${String(userId).padStart(7, '0')}`
      ]
    );
  }

  async updateProfile(userId, data, connection) {
    const queryExecutor = connection || db;
    const { nombres, apellidos, celular } = data;
    await queryExecutor.query(
      `INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos), telefono = VALUES(telefono)`,
      [
        userId,
        nombres,
        apellidos || null,
        `REG_ADM_${userId}`,
        celular || `300${String(userId).padStart(7, '0')}`
      ]
    );
  }

  async updateUserStatus(userId, status) {
    await db.query('UPDATE users SET estado = ? WHERE id = ?', [status, userId]);
  }

  async deleteUserStores(userId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('DELETE FROM user_stores WHERE user_id = ?', [userId]);
  }

  async insertUserStores(values, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('INSERT INTO user_stores (user_id, store_id) VALUES ?', [values]);
  }

  async findUserStoreIds(userId) {
    const [rows] = await db.query('SELECT store_id FROM user_stores WHERE user_id = ?', [userId]);
    return rows.map(r => r.store_id);
  }

  async findValidStoresForCommerce(storeIds, commerceId, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query(
      'SELECT id FROM stores WHERE id IN (?) AND commerce_id = ?',
      [storeIds, commerceId]
    );
    return rows.map(r => r.id);
  }

  async updateUserPassword(userId, passwordHash, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
  }

  async findCommerceWithEmptyManager(commerceId, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT id, usuario_id FROM commerces WHERE id = ?', [commerceId]);
    return rows[0] || null;
  }

  async assignManagerToCommerce(commerceId, userId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('UPDATE commerces SET usuario_id = ? WHERE id = ?', [userId, commerceId]);
  }

  async checkUserPermission(userType, userId, permissionName) {
    const [rows] = await db.query(`
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_type = ? AND ur.user_id = ? AND p.name = ?
    `, [userType, userId, permissionName]);
    return rows.length > 0;
  }

  async findSystemAndAdminUsers() {
    const [rows] = await db.query(`
      SELECT u.id, u.email, u.rol, u.estado, 
             p.nombres, p.apellidos 
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      WHERE u.rol IN ('admin', 'system')
    `);
    return rows;
  }

  async findUserRolesAndPermissions(userId) {
    const [permissionsData] = await db.query(`
      SELECT DISTINCT p.name 
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_type = 'user' AND ur.user_id = ?
    `, [userId]);

    const [rolesData] = await db.query(`
      SELECT r.name, r.id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_type = 'user' AND ur.user_id = ?
    `, [userId]);

    return {
      permissions: permissionsData.map(p => p.name),
      roles: rolesData.map(r => r.name),
      roleIds: rolesData.map(r => r.id)
    };
  }
}

module.exports = new UserRepository();
