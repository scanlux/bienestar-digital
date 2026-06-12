const db = require('../../config/db');

class StoreRepository {
  async findMyStores(commerceId) {
    const [rows] = await db.query(
      `SELECT s.*, u.email as admin_email 
       FROM stores s 
       LEFT JOIN users u ON s.usuario_id = u.id 
       WHERE s.commerce_id = ?`,
      [commerceId]
    );
    return rows;
  }

  async findByCommerceId(commerceId) {
    const [rows] = await db.query(
      `SELECT s.*, u.email as admin_email,
              (SELECT COUNT(*) FROM store_menus sm WHERE sm.store_id = s.id) as menu_count,
              (SELECT COUNT(*) FROM store_categories sc WHERE sc.store_id = s.id) as category_count,
              (SELECT COUNT(*) FROM store_products sp WHERE sp.store_id = s.id) as product_count
       FROM stores s
       LEFT JOIN users u ON s.usuario_id = u.id
       WHERE s.commerce_id = ?`,
      [commerceId]
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT s.*, u.email as admin_email 
       FROM stores s 
       LEFT JOIN users u ON s.usuario_id = u.id 
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findPaymentPlatforms() {
    const [rows] = await db.query('SELECT * FROM payment_platforms ORDER BY nombre ASC');
    return rows;
  }

  async findStoreHours(storeId) {
    const [rows] = await db.query('SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', [storeId]);
    return rows;
  }

  async findStoreAccounts(storeId) {
    const [rows] = await db.query('SELECT * FROM store_accounts WHERE store_id = ?', [storeId]);
    return rows;
  }

  async findStoreVideos(storeId) {
    const [rows] = await db.query('SELECT * FROM store_videos WHERE store_id = ?', [storeId]);
    return rows;
  }

  async checkMatriculaRegistered(matricula, excludeId = null) {
    let query = 'SELECT id FROM stores WHERE matricula = ?';
    const params = [matricula];
    if (excludeId) {
      query += ' AND id <> ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(query, params);
    return rows[0] || null;
  }

  async checkUserAssignedStore(userId, excludeId = null) {
    let query = 'SELECT id FROM stores WHERE usuario_id = ?';
    const params = [userId];
    if (excludeId) {
      query += ' AND id <> ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(query, params);
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

  async createProfile(userId, names, apellidos, phone, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
      [userId, names || 'Admin', apellidos || 'Sede', `CC_${userId}`, phone || '']
    );
  }

  async insertUserStore(userId, storeId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO user_stores (user_id, store_id) VALUES (?, ?)',
      [userId, storeId]
    );
  }

  async createStore(commerceId, data, connection) {
    const queryExecutor = connection || db;
    const {
      nombre_sucursal, contacto_directo, telefono, telefono_domicilio,
      direccion, latitud, longitud, estado, finalFechaRegreso, image_url,
      finalUserId, matricula, admin_nombres, admin_apellidos
    } = data;

    const [result] = await queryExecutor.query(
      `INSERT INTO stores 
       (commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, fecha_regreso, image_url, usuario_id, matricula, admin_nombres, admin_apellidos) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commerceId, nombre_sucursal, contacto_directo || null, telefono || null,
        telefono_domicilio || null, direccion, latitud || null, longitud || null,
        estado || 'abierto', finalFechaRegreso || null, image_url || null,
        finalUserId || null, matricula || null, admin_nombres || null, admin_apellidos || null
      ]
    );
    return result.insertId;
  }

  async updateStore(id, data, connection) {
    const queryExecutor = connection || db;
    const {
      nombre_sucursal, contacto_directo, telefono, telefono_domicilio,
      direccion, latitud, longitud, estado, finalFechaRegreso, image_url,
      finalUserId, matricula, admin_nombres, admin_apellidos
    } = data;

    await queryExecutor.query(
      `UPDATE stores 
       SET nombre_sucursal=?, contacto_directo=?, telefono=?, telefono_domicilio=?, direccion=?, latitud=?, longitud=?, estado=?, fecha_regreso=?, image_url=?, usuario_id=?, matricula=?, admin_nombres=?, admin_apellidos=? 
       WHERE id=?`,
      [
        nombre_sucursal, contacto_directo || null, telefono || null,
        telefono_domicilio || null, direccion, latitud || null, longitud || null,
        estado || 'abierto', finalFechaRegreso || null, image_url || null,
        finalUserId || null, matricula || null, admin_nombres || null, admin_apellidos || null,
        id
      ]
    );
  }

  async upsertStoreHours(storeId, day, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      `INSERT INTO store_operating_hours 
       (store_id, day_index, status, open_time, close_time, is_24h)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       status=VALUES(status), open_time=VALUES(open_time), close_time=VALUES(close_time), is_24h=VALUES(is_24h)`,
      [storeId, day.day_index, day.status, day.open_time, day.close_time, day.is_24h]
    );
  }

  async deleteStoreAccounts(storeId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('DELETE FROM store_accounts WHERE store_id = ?', [storeId]);
  }

  async insertStoreAccounts(values, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      `INSERT INTO store_accounts 
       (store_id, platform_id, tipo_cuenta, numero_cuenta, llave, titular_nombre, titular_documento, detalle, vencimiento_tarjeta, es_principal) 
       VALUES ?`,
      [values]
    );
  }

  async updateOrderAcceptance(storeId, mode) {
    await db.query('UPDATE stores SET auto_accept_orders = ? WHERE id = ?', [mode, storeId]);
  }

  async findVideoById(videoId) {
    const [rows] = await db.query('SELECT * FROM store_videos WHERE id = ?', [videoId]);
    return rows[0] || null;
  }

  async createVideo(storeId, url, description) {
    const [result] = await db.query(
      'INSERT INTO store_videos (store_id, url, descripcion, is_active) VALUES (?, ?, ?, 1)',
      [storeId, url, description || null]
    );
    return result.insertId;
  }

  async updateVideoStatus(videoId, storeId, isActive) {
    await db.query('UPDATE store_videos SET is_active = ? WHERE id = ? AND store_id = ?', [isActive, videoId, storeId]);
  }

  async deleteVideo(videoId, storeId) {
    await db.query('DELETE FROM store_videos WHERE id = ? AND store_id = ?', [videoId, storeId]);
  }
}

module.exports = new StoreRepository();
