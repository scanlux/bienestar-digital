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
    let colName = 'user_id';
    if (userType === 'system_user') colName = 'system_user_id';
    else if (userType === 'operator') colName = 'operator_id';

    const [rows] = await db.query(`
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.${colName} = ? AND p.name = ?
    `, [userId, permissionName]);
    return rows.length > 0;
  }

  async findSystemAndAdminUsers() {
    const [rows] = await db.query(`
      SELECT u.id, u.email, u.rol, u.estado, 
             u.financial_pin_locked, u.financial_pin_attempts,
             p.nombres, p.apellidos 
     FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      WHERE u.rol IN ('admin', 'system', 'customer')
    `);
    return rows;
  }

  async findUserRolesAndPermissions(userId, userType = 'user') {
    let colName = 'user_id';
    if (userType === 'system_user') colName = 'system_user_id';
    else if (userType === 'operator') colName = 'operator_id';

    const [permissionsData] = await db.query(`
      SELECT DISTINCT p.name 
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.${colName} = ?
    `, [userId]);

    const [rolesData] = await db.query(`
      SELECT r.name, r.id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.${colName} = ?
    `, [userId]);

    return {
      permissions: permissionsData.map(p => p.name),
      roles: rolesData.map(r => r.name),
      roleIds: rolesData.map(r => r.id)
    };
  }

  async findSystemUsers() {
    const [rows] = await db.query(`
      SELECT id, email, nivel, estado, password_locked, nombres, apellidos, created_at
      FROM system_users
    `);
    return rows;
  }

  async createSystemUser(email, passwordHash, nombres, apellidos, nivel, connection) {
    const queryExecutor = connection || db;
    const [result] = await queryExecutor.query(
      'INSERT INTO system_users (email, password_hash, nombres, apellidos, nivel, estado, password_locked) VALUES (?, ?, ?, ?, ?, "activo", 0)',
      [email, passwordHash, nombres, apellidos, nivel]
    );
    return result.insertId;
  }

  async updateSystemUserStatus(userId, status) {
    await db.query('UPDATE system_users SET estado = ? WHERE id = ?', [status, userId]);
  }

  async updateSystemUserPasswordLock(userId, locked) {
    await db.query('UPDATE system_users SET password_locked = ? WHERE id = ?', [locked, userId]);
  }

  async updateUserPasswordLock(userId, locked) {
    await db.query('UPDATE users SET password_locked = ? WHERE id = ?', [locked, userId]);
  }

  async insertModerationLog(targetUserType, targetUserId, action, reason, moderatorUserType, moderatorUserId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      `INSERT INTO user_moderation_logs (target_user_type, target_user_id, action, reason, moderator_user_type, moderator_user_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [targetUserType, targetUserId, action, reason, moderatorUserType, moderatorUserId]
    );
  }

  async findModerationLogs(targetUserType, targetUserId) {
    const [rows] = await db.query(`
      SELECT 
        l.id,
        l.action,
        l.reason,
        l.created_at,
        l.moderator_user_type,
        l.moderator_user_id,
        CASE 
          WHEN l.moderator_user_type = 'system_user' THEN CONCAT(su.nombres, ' ', su.apellidos)
          ELSE CONCAT(p.nombres, ' ', COALESCE(p.apellidos, ''))
        END AS moderator_name,
        CASE 
          WHEN l.moderator_user_type = 'system_user' THEN su.email
          ELSE u.email
        END AS moderator_email
      FROM user_moderation_logs l
      LEFT JOIN system_users su ON l.moderator_user_type = 'system_user' AND l.moderator_user_id = su.id
      LEFT JOIN users u ON l.moderator_user_type = 'user' AND l.moderator_user_id = u.id
      LEFT JOIN profiles p ON l.moderator_user_type = 'user' AND l.moderator_user_id = p.usuario_id
      WHERE l.target_user_type = ? AND l.target_user_id = ?
      ORDER BY l.created_at DESC
    `, [targetUserType, targetUserId]);
    return rows;
  }

  async findUserWithPinHash(id) {
    const [rows] = await db.query(
      'SELECT id, email, password_hash, financial_pin_hash, financial_pin_locked, financial_pin_attempts FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async updateUserFinancialPin(id, pinHash) {
    await db.query(
      'UPDATE users SET financial_pin_hash = ?, financial_pin_locked = 0, financial_pin_attempts = 0 WHERE id = ?',
      [pinHash, id]
    );
  }

  async lockFinancialPin(id) {
    await db.query('UPDATE users SET financial_pin_locked = 1 WHERE id = ?', [id]);
  }

  async incrementFinancialPinAttempts(id) {
    await db.query('UPDATE users SET financial_pin_attempts = financial_pin_attempts + 1 WHERE id = ?', [id]);
  }

  async resetFinancialPinAttempts(id) {
    await db.query('UPDATE users SET financial_pin_locked = 0, financial_pin_attempts = 0 WHERE id = ?', [id]);
  }
}

module.exports = new UserRepository();
