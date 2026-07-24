const db = require('../../config/db');

class AuthRepository {
  async getUserRolesAndPermissions(userType, userId) {
    let colName = 'user_id';
    if (userType === 'system_user') {
      colName = 'system_user_id';
    } else if (userType === 'operator') {
      colName = 'operator_id';
    }

    const [permissionsData] = await db.query(`
      SELECT DISTINCT p.name
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.${colName} = ?
    `, [userId]);
    
    const [allPermissionsData] = await db.query(`
      SELECT name, ui_restriction_mode
      FROM permissions
    `);
    
    const [rolesData] = await db.query(`
      SELECT r.code
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.${colName} = ?
    `, [userId]);
    
    return {
      permissions: permissionsData.map(p => p.name),
      permissionModes: Object.fromEntries(
        allPermissionsData.map(p => [p.name, p.ui_restriction_mode])
      ),
      roles: rolesData.map(r => r.code)
    };
  }

  async findUserByEmail(email) {
    const [rows] = await db.query(`
      SELECT u.id, u.email, u.password_hash, u.rol, u.estado, u.password_locked, 
             u.es_repartidor, u.repartidor_activo,
             p.nombres, p.apellidos, p.telefono,
             c.id AS commerce_id,
             s.id AS store_id,
             s.commerce_id AS store_commerce_id,
             dc.id AS delivery_company_id
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN commerces c ON c.usuario_id = u.id
      LEFT JOIN stores s ON s.usuario_id = u.id
      LEFT JOIN delivery_companies dc ON dc.usuario_id = u.id
      WHERE u.email = ?
    `, [email]);
    return rows[0] || null;
  }

  async findUserById(userId) {
    const [rows] = await db.query(`
      SELECT u.id, u.email, u.rol, u.estado, u.password_locked, u.es_repartidor, u.repartidor_activo,
             p.nombres, p.apellidos,
             c.id AS commerce_id,
             s.id AS store_id,
             s.commerce_id AS store_commerce_id,
             dc.id AS delivery_company_id
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN commerces c ON c.usuario_id = u.id
      LEFT JOIN stores s ON s.usuario_id = u.id
      LEFT JOIN delivery_companies dc ON dc.usuario_id = u.id
      WHERE u.id = ?
    `, [userId]);
    return rows[0] || null;
  }

  async findOperatorByEmail(email) {
    const [rows] = await db.query('SELECT * FROM store_operators WHERE email = ?', [email]);
    return rows[0] || null;
  }

  async findOperatorById(id) {
    const [rows] = await db.query('SELECT * FROM store_operators WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findSystemUserByEmail(email) {
    const [rows] = await db.query('SELECT * FROM system_users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  async findSystemUserById(id) {
    const [rows] = await db.query('SELECT * FROM system_users WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findStoresByCommerceId(commerceId) {
    const [rows] = await db.query('SELECT id FROM stores WHERE commerce_id = ?', [commerceId]);
    return rows.map(s => s.id);
  }

  async findUserMinByEmail(email, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT id FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  async insertUser(email, passwordHash, rol, estado, connection) {
    const queryExecutor = connection || db;
    const [result] = await queryExecutor.query(
      'INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, ?, ?)',
      [email, passwordHash, rol, estado]
    );
    return result.insertId;
  }

  async insertProfile(userId, nombres, apellidos, cedula, telefono, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
      [userId, nombres, apellidos, cedula, telefono]
    );
  }

  async updateProfile(userId, nombres, apellidos, cedula, telefono, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      `INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos), cedula = VALUES(cedula), telefono = VALUES(telefono)`,
      [userId, nombres, apellidos, cedula, telefono]
    );
  }

  async insertUserAddress(userId, label, direccion, latitud, longitud, isDefault, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO user_addresses (user_id, label, direccion, latitud, longitud, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, label, direccion, latitud, longitud, isDefault]
    );
  }

  async updateDriverStatus(userId, esRepartidor, statusVal) {
    await db.query('UPDATE users SET es_repartidor = ?, repartidor_activo = ? WHERE id = ?', [esRepartidor, statusVal, userId]);
  }

  async findUserProfile(userId) {
    const [rows] = await db.query('SELECT nombres, apellidos, telefono, cedula FROM profiles WHERE usuario_id = ?', [userId]);
    return rows[0] || {};
  }

  async findFirebaseIdentity(userId, firebaseUid) {
    const [rows] = await db.query(
      'SELECT id FROM firebase_identities WHERE user_id = ? AND firebase_uid = ?',
      [userId, firebaseUid]
    );
    return rows[0] || null;
  }

  async insertFirebaseIdentity(userId, firebaseUid, provider, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO firebase_identities (user_id, firebase_uid, provider) VALUES (?, ?, ?)',
      [userId, firebaseUid, provider || 'firebase']
    );
  }
}

module.exports = new AuthRepository();
