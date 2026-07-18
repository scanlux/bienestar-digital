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
      `SELECT 
         CASE 
           WHEN user_id IS NOT NULL THEN 'user'
           WHEN system_user_id IS NOT NULL THEN 'system_user'
           WHEN operator_id IS NOT NULL THEN 'operator'
         END as user_type,
         COALESCE(user_id, system_user_id, operator_id) as user_id
       FROM user_roles 
       WHERE role_id = ?`,
      [roleId]
    );
    return rows;
  }

  async deleteRole(roleId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('DELETE FROM roles WHERE id = ?', [roleId]);
  }

  async findUserRoles(userType, userId) {
    let colName = 'user_id';
    if (userType === 'system_user') colName = 'system_user_id';
    else if (userType === 'operator') colName = 'operator_id';

    const [rows] = await db.query(`
      SELECT ur.role_id, r.name, r.code, r.description 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.${colName} = ?
    `, [userId]);
    return rows;
  }

  async deleteUserRoles(userType, userId, connection) {
    const queryExecutor = connection || db;
    let colName = 'user_id';
    if (userType === 'system_user') colName = 'system_user_id';
    else if (userType === 'operator') colName = 'operator_id';

    await queryExecutor.query(`DELETE FROM user_roles WHERE ${colName} = ?`, [userId]);
  }

  async insertUserRole(userType, userId, roleId, connection) {
    const queryExecutor = connection || db;
    let colName = 'user_id';
    if (userType === 'system_user') colName = 'system_user_id';
    else if (userType === 'operator') colName = 'operator_id';

    await queryExecutor.query(
      `INSERT INTO user_roles (${colName}, role_id) VALUES (?, ?)`,
      [userId, roleId]
    );
  }

  async findRolesByIds(roleIds, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT code FROM roles WHERE id IN (?)', [roleIds]);
    return rows;
  }

  async findPermissionsAnalysis(connection) {
    const queryExecutor = connection || db;
    const query = `
      SELECT
        p.id,
        p.name AS code,
        COALESCE(p.display_name, p.name) AS name,
        p.scope,
        p.criticidad,
        p.tipo,
        p.ui_restriction_mode,
        pc.name AS category,
        GROUP_CONCAT(DISTINCT pe.method_path ORDER BY pe.id SEPARATOR '||') AS endpoints_raw,
        GROUP_CONCAT(DISTINCT pit.table_name ORDER BY pit.id SEPARATOR '||') AS tables_raw
      FROM permissions p
      JOIN permission_categories pc ON p.category_id = pc.id
      LEFT JOIN permission_endpoints pe ON pe.permission_id = p.id
      LEFT JOIN permission_impacted_tables pit ON pit.permission_id = p.id
      GROUP BY p.id
      ORDER BY pc.name, p.name;
    `;
    const [rows] = await queryExecutor.query(query);
    return rows;
  }
}

module.exports = new RoleRepository();
