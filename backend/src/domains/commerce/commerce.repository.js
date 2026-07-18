const db = require('../../config/db');

class CommerceRepository {
  async findAll(status) {
    let query = `
      SELECT c.*, p.nombres as admin_nombres, p.apellidos as admin_apellidos, u.email as email
      FROM commerces c
      LEFT JOIN profiles p ON c.usuario_id = p.usuario_id
      LEFT JOIN users u ON c.usuario_id = u.id
    `;
    const params = [];
    
    if (status) {
      query += ' WHERE c.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY c.orden ASC';
    const [commerces] = await db.query(query, params);
    return commerces;
  }

  async findById(id) {
    const [commerces] = await db.query(`
      SELECT c.*, p.nombres as admin_nombres, p.apellidos as admin_apellidos, u.email as email
      FROM commerces c
      LEFT JOIN profiles p ON c.usuario_id = p.usuario_id
      LEFT JOIN users u ON c.usuario_id = u.id
      WHERE c.id = ?
    `, [id]);
    return commerces[0] || null;
  }

  async findByUserId(userId, excludeId = null) {
    let query = 'SELECT id FROM commerces WHERE usuario_id = ?';
    const params = [userId];
    
    if (excludeId) {
      query += ' AND id <> ?';
      params.push(excludeId);
    }
    
    const [existing] = await db.query(query, params);
    return existing[0] || null;
  }

  async findByNit(nit, excludeId = null) {
    let query = 'SELECT id FROM commerces WHERE nit = ?';
    const params = [nit];
    
    if (excludeId) {
      query += ' AND id <> ?';
      params.push(excludeId);
    }
    
    const [existing] = await db.query(query, params);
    return existing[0] || null;
  }

  async create(data) {
    const {
      nombre, nit, nit_dv, telefono, ciudad, direccion,
      descripcion, logo_url, orden, usuario_id,
      admin_nombres, admin_apellidos
    } = data;
    
    const [result] = await db.query(
      `INSERT INTO commerces 
       (nombre, nit, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, orden, usuario_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, nit, nit_dv || null, telefono, ciudad, direccion,
        descripcion, logo_url, orden || 0,
        usuario_id || null
      ]
    );
    
    if (usuario_id && (admin_nombres || admin_apellidos)) {
      await db.query(
        `INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos)`,
        [usuario_id, admin_nombres || 'Admin', admin_apellidos || 'Comercio', `CC_${usuario_id}`, telefono || '']
      );
    }
    
    return result.insertId;
  }

  async update(id, data) {
    const {
      nombre, nit, nit_dv, telefono, ciudad, direccion,
      descripcion, logo_url, orden, usuario_id,
      admin_nombres, admin_apellidos
    } = data;
    
    await db.query(
      `UPDATE commerces 
       SET nombre=?, nit=?, nit_dv=?, telefono=?, ciudad=?, direccion=?, descripcion=?, logo_url=?, orden=?, usuario_id=? 
       WHERE id=?`,
      [
        nombre, nit, nit_dv || null, telefono, ciudad, direccion,
        descripcion, logo_url, orden, usuario_id || null, id
      ]
    );
    
    if (usuario_id && (admin_nombres || admin_apellidos)) {
      await db.query(
        `INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos)`,
        [usuario_id, admin_nombres || 'Admin', admin_apellidos || 'Comercio', `CC_${usuario_id}`, telefono || '']
      );
    }
    
    return true;
  }

  async updateStatus(id, status) {
    await db.query('UPDATE commerces SET status = ? WHERE id = ?', [status, id]);
    return true;
  }

  async getFinancialSummaryData(commerceId, startDate, endDate) {
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
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY store_id
      ) stats ON stats.store_id = s.id
      WHERE s.commerce_id = ?
      ORDER BY s.id ASC
    `;
    const [rows] = await db.query(query, [startDate, endDate, commerceId]);
    return rows;
  }

  async getMonthsWithData(commerceId) {
    const query = `
      SELECT DISTINCT DATE_FORMAT(DATE_SUB(created_at, INTERVAL 5 HOUR), '%Y-%m') as month
      FROM orders
      WHERE store_id IN (SELECT id FROM stores WHERE commerce_id = ?)
      ORDER BY month DESC
    `;
    const [rows] = await db.query(query, [commerceId]);
    return rows.map(r => r.month).filter(Boolean);
  }

  async getStoresLedgerHistory(commerceId, filters = {}) {
    const { search, txType, storeId } = filters;
    let query = `
      SELECT l.*, 
             CASE
               WHEN fw.is_system = 1 THEN 'system'
               WHEN fs.id IS NOT NULL THEN 'store'
               WHEN cm_f.id IS NOT NULL THEN 'commerce'
               WHEN dc_f.id IS NOT NULL THEN 'delivery_company'
               ELSE 'user'
             END as from_owner_type,
             COALESCE(fw.user_id, 0) as from_owner_id,
             CASE
               WHEN tw.is_system = 1 THEN 'system'
               WHEN ts.id IS NOT NULL THEN 'store'
               WHEN cm_t.id IS NOT NULL THEN 'commerce'
               WHEN dc_t.id IS NOT NULL THEN 'delivery_company'
               ELSE 'user'
             END as to_owner_type,
             COALESCE(tw.user_id, 0) as to_owner_id,
             fs.nombre_sucursal as from_store_name,
             ts.nombre_sucursal as to_store_name
      FROM domi_ledger l
      LEFT JOIN wallets fw ON l.from_wallet_id = fw.id
      LEFT JOIN wallets tw ON l.to_wallet_id = tw.id
      LEFT JOIN stores fs ON fw.user_id = fs.usuario_id
      LEFT JOIN stores ts ON tw.user_id = ts.usuario_id
      LEFT JOIN commerces cm_f ON fw.user_id = cm_f.usuario_id
      LEFT JOIN commerces cm_t ON tw.user_id = cm_t.usuario_id
      LEFT JOIN delivery_companies dc_f ON fw.user_id = dc_f.usuario_id
      LEFT JOIN delivery_companies dc_t ON tw.user_id = dc_t.usuario_id
      WHERE (fs.commerce_id = ? OR ts.commerce_id = ? OR cm_f.id = ? OR cm_t.id = ?)
    `;
    const params = [commerceId, commerceId, commerceId, commerceId];

    if (storeId) {
      query += ' AND (fs.id = ? OR ts.id = ?)';
      params.push(Number(storeId), Number(storeId));
    }

    if (txType) {
      query += ' AND l.tx_type = ?';
      params.push(txType);
    }

    if (search) {
      query += ' AND (l.notes LIKE ? OR l.tx_hash LIKE ? OR fs.nombre_sucursal LIKE ? OR ts.nombre_sucursal LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY l.created_at DESC, l.id DESC LIMIT 100';

    const [rows] = await db.query(query, params);
    return rows;
  }
}

module.exports = new CommerceRepository();
