const db = require('../../config/db');

class StoreRepository {
  async findMyStores(commerceId) {
    const [rows] = await db.query(
      `SELECT s.*, u.email as admin_email, p.nombres as profile_nombres, p.apellidos as profile_apellidos,
              p.nombres as admin_nombres, p.apellidos as admin_apellidos
       FROM stores s 
       LEFT JOIN users u ON s.usuario_id = u.id 
       LEFT JOIN profiles p ON s.usuario_id = p.usuario_id
       WHERE s.commerce_id = ?`,
      [commerceId]
    );
    return rows;
  }

  async findByCommerceId(commerceId) {
    const [rows] = await db.query(
      `SELECT s.*, u.email as admin_email, p.nombres as profile_nombres, p.apellidos as profile_apellidos,
              p.nombres as admin_nombres, p.apellidos as admin_apellidos,
              (SELECT COUNT(*) FROM menus m WHERE m.store_id = s.id AND m.deleted_at IS NULL) as menu_count,
              (SELECT COUNT(*) FROM categorias c JOIN menus m ON c.menu_id = m.id WHERE m.store_id = s.id AND c.deleted_at IS NULL) as category_count,
              (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.deleted_at IS NULL) as product_count
       FROM stores s
       LEFT JOIN users u ON s.usuario_id = u.id
       LEFT JOIN profiles p ON s.usuario_id = p.usuario_id
       WHERE s.commerce_id = ?`,
      [commerceId]
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await db.query(
      `SELECT s.*, u.email as admin_email, p.nombres as profile_nombres, p.apellidos as profile_apellidos,
              p.nombres as admin_nombres, p.apellidos as admin_apellidos
       FROM stores s 
       LEFT JOIN users u ON s.usuario_id = u.id 
       LEFT JOIN profiles p ON s.usuario_id = p.usuario_id
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

  async updateProfile(userId, names, apellidos, phone, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      `INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       nombres = VALUES(nombres), 
       apellidos = VALUES(apellidos), 
       telefono = VALUES(telefono)`,
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
       (commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, fecha_regreso, image_url, usuario_id, matricula) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commerceId, nombre_sucursal, contacto_directo || null, telefono || null,
        telefono_domicilio || null, direccion, latitud || null, longitud || null,
        estado || 'abierto', finalFechaRegreso || null, image_url || null,
        finalUserId || null, matricula || null
      ]
    );

    if (finalUserId && (admin_nombres || admin_apellidos)) {
      await this.updateProfile(finalUserId, admin_nombres, admin_apellidos, telefono, queryExecutor);
    }

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
       SET nombre_sucursal=?, contacto_directo=?, telefono=?, telefono_domicilio=?, direccion=?, latitud=?, longitud=?, estado=?, fecha_regreso=?, image_url=?, usuario_id=?, matricula=? 
       WHERE id=?`,
      [
        nombre_sucursal, contacto_directo || null, telefono || null,
        telefono_domicilio || null, direccion, latitud || null, longitud || null,
        estado || 'abierto', finalFechaRegreso || null, image_url || null,
        finalUserId || null, matricula || null,
        id
      ]
    );

    if (finalUserId && (admin_nombres || admin_apellidos)) {
      await this.updateProfile(finalUserId, admin_nombres, admin_apellidos, telefono, queryExecutor);
    }
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
    await db.query('UPDATE stores SET acceptance_mode = ? WHERE id = ?', [mode, storeId]);
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

  async getStoreFinancialSummaryData(storeId, startDate, endDate) {
    const query = `
      SELECT 
        s.id as store_id,
        s.nombre_sucursal,
        s.estado,
        COALESCE(w.balance_custody, 0) as balance_custody,
        COALESCE(stats.completed_orders, 0) as completed_orders,
        COALESCE(stats.rejected_orders, 0) as rejected_orders,
        COALESCE(stats.cancelled_orders, 0) as cancelled_orders,
        COALESCE(stats.total_sales, 0) as total_sales,
        COALESCE(stats.commissions_paid, 0) as commissions_paid
      FROM stores s
      LEFT JOIN wallets w ON w.user_id = s.usuario_id
      LEFT JOIN (
        SELECT 
          store_id,
          COUNT(CASE WHEN status = 'entregado' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'cancelado' AND store_rejection_notes IS NOT NULL THEN 1 END) as rejected_orders,
          COUNT(CASE WHEN status = 'cancelado' AND store_rejection_notes IS NULL THEN 1 END) as cancelled_orders,
          SUM(CASE WHEN status = 'entregado' THEN (total_cop - (COALESCE(driver_domi_cost, 0) * COALESCE(fiat_peg_snapshot, 0))) ELSE 0 END) as total_sales,
          SUM(CASE WHEN accepted_at IS NOT NULL THEN COALESCE(domi_cost, 0) ELSE 0 END) as commissions_paid
        FROM orders
        WHERE created_at >= ? AND created_at <= ? AND store_id = ?
        GROUP BY store_id
      ) stats ON stats.store_id = s.id
      WHERE s.id = ?
    `;
    const [rows] = await db.query(query, [startDate, endDate, storeId, storeId]);
    return rows[0] || null;
  }

  async getMonthsWithData(storeId) {
    const query = `
      SELECT DISTINCT DATE_FORMAT(DATE_SUB(created_at, INTERVAL 5 HOUR), '%Y-%m') as month
      FROM orders
      WHERE store_id = ?
      ORDER BY month DESC
    `;
    const [rows] = await db.query(query, [storeId]);
    return rows.map(r => r.month).filter(Boolean);
  }

  async findOperativeStoresByCommerceId(commerceId, connection = db) {
    const query = `
      SELECT s.id, s.nombre_sucursal, s.estado, s.updated_at,
             COUNT(o.id) as completed_orders_count
      FROM stores s
      LEFT JOIN orders o ON o.store_id = s.id AND o.status = 'entregado'
      WHERE s.commerce_id = ? AND s.estado = 'operativo'
      GROUP BY s.id
      ORDER BY completed_orders_count ASC, s.updated_at DESC
    `;
    const [rows] = await connection.query(query, [commerceId]);
    return rows;
  }

  async bulkSetStoreStatus(storeIds, newStatus, connection = db) {
    if (!storeIds || storeIds.length === 0) return;
    const query = `
      UPDATE stores
      SET estado = ?
      WHERE id IN (?)
    `;
    await connection.query(query, [newStatus, storeIds]);
  }
}

module.exports = new StoreRepository();

