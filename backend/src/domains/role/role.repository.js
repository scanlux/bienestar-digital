const db = require('../../config/db');

class RoleRepository {
  async findPermissionCategories() {
    const [rows] = await db.query('SELECT * FROM permission_categories ORDER BY name ASC');
    return rows;
  }

  async findPermissions() {
    const [rows] = await db.query('SELECT * FROM permissions ORDER BY name ASC');
    return rows;
  }

  async findPermissionsWithCategory() {
    const [rows] = await db.query(`
      SELECT p.*, pc.name as category_name 
      FROM permissions p 
      JOIN permission_categories pc ON p.category_id = pc.id 
      ORDER BY p.name ASC
    `);
    return rows;
  }

  async findRoles() {
    const [rows] = await db.query('SELECT * FROM roles ORDER BY name ASC');
    return rows;
  }

  async findRolePermissions() {
    const [rows] = await db.query(`
      SELECT rp.role_id, p.id as permission_id, p.name as permission_name, pc.name as category_name
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN permission_categories pc ON p.category_id = pc.id
    `);
    return rows;
  }

  async findRoleByCode(code, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT id FROM roles WHERE code = ?', [code]);
    return rows[0] || null;
  }

  async insertRole(name, code, description, connection) {
    const queryExecutor = connection || db;
    const [result] = await queryExecutor.query(
      'INSERT INTO roles (name, code, description, is_system) VALUES (?, ?, ?, 0)',
      [name, code, description]
    );
    return result.insertId;
  }

  async insertRolePermission(roleId, permissionId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [roleId, permissionId]
    );
  }

  async findRoleById(id, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT * FROM roles WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async updateRoleDescription(id, description, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'UPDATE roles SET description = ? WHERE id = ?',
      [description, id]
    );
  }

  async updateRoleNameAndDescription(id, name, description, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'UPDATE roles SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
  }

  async deleteRolePermissions(roleId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
  }

  async findAffectedUsers(roleId, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query(
      'SELECT user_type, user_id FROM user_roles WHERE role_id = ?',
      [roleId]
    );
    return rows;
  }

  async deleteRole(roleId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('DELETE FROM roles WHERE id = ?', [roleId]);
  }

  async findUserRoles(userType, userId) {
    const [rows] = await db.query(`
      SELECT ur.role_id, r.name, r.code, r.description 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_type = ? AND ur.user_id = ?
    `, [userType, userId]);
    return rows;
  }

  async deleteUserRoles(userType, userId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('DELETE FROM user_roles WHERE user_type = ? AND user_id = ?', [userType, userId]);
  }

  async insertUserRole(userType, userId, roleId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)',
      [userType, userId, roleId]
    );
  }

  async findRolesByIds(roleIds, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT code FROM roles WHERE id IN (?)', [roleIds]);
    return rows;
  }
}

module.exports = new RoleRepository();
