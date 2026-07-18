const db = require('../../config/db');

class UpgradesRepository {
  async findActiveByEntity(entityType, entityId, commerceId, connection = db) {
    let userId = null;
    if (entityType === 'user') {
      userId = entityId;
    } else if (entityType === 'store') {
      const [rows] = await connection.query('SELECT usuario_id FROM stores WHERE id = ?', [entityId]);
      userId = rows[0]?.usuario_id || null;
    } else if (entityType === 'delivery_company') {
      const [rows] = await connection.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [entityId]);
      userId = rows[0]?.usuario_id || null;
    }

    const query = `
      SELECT cu.id, cu.upgrade_type, cu.price_domis, cu.expires_at, cu.created_at,
             uc.label, uc.description, uc.icon, uc.benefit_scope
      FROM commerce_upgrades cu
      JOIN upgrade_catalog uc ON cu.upgrade_type = uc.upgrade_key
      WHERE cu.commerce_id = ?
        AND (
          uc.benefit_scope = 'global'
          OR
          (uc.benefit_scope = 'individual' AND cu.user_id = ?)
        )
        AND cu.expires_at > NOW()
      ORDER BY cu.expires_at ASC
    `;
    const [rows] = await connection.query(query, [commerceId, userId]);
    return rows;
  }

  async countActiveUpgradesByType({ commerceId, upgradeType, storeId = null, deliveryCompanyId = null, userId = null }, connection = db) {
    let targetUserId = userId;
    if (storeId !== null) {
      const [rows] = await connection.query('SELECT usuario_id FROM stores WHERE id = ?', [storeId]);
      targetUserId = rows[0]?.usuario_id || null;
    } else if (deliveryCompanyId !== null) {
      const [rows] = await connection.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [deliveryCompanyId]);
      targetUserId = rows[0]?.usuario_id || null;
    }

    let query = `
      SELECT COUNT(*) as activeCount
      FROM commerce_upgrades
      WHERE commerce_id = ? AND upgrade_type = ? AND expires_at > NOW()
    `;
    const params = [commerceId, upgradeType];

    if (targetUserId !== null) {
      query += ' AND user_id = ?';
      params.push(targetUserId);
    }

    const [[{ activeCount }]] = await connection.query(query, params);
    return Number(activeCount);
  }

  async findActiveReels(commerceId, connection = db) {
    const query = `
      SELECT id, video_url, expires_at, created_at
      FROM influencer_reels
      WHERE commerce_id = ? AND expires_at > NOW()
    `;
    const [rows] = await connection.query(query, [commerceId]);
    return rows;
  }

  async countActiveReels(commerceId, connection = db) {
    const query = `
      SELECT COUNT(*) as activeCount
      FROM influencer_reels
      WHERE commerce_id = ? AND expires_at > NOW()
    `;
    const [[{ activeCount }]] = await connection.query(query, [commerceId]);
    return Number(activeCount);
  }

  async createUpgrade(connection, { commerceId, upgradeType, priceDomis, expiresAt, storeId = null, deliveryCompanyId = null, userId = null }) {
    let targetUserId = userId;
    if (storeId !== null) {
      const [rows] = await connection.query('SELECT usuario_id FROM stores WHERE id = ?', [storeId]);
      targetUserId = rows[0]?.usuario_id || null;
    } else if (deliveryCompanyId !== null) {
      const [rows] = await connection.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [deliveryCompanyId]);
      targetUserId = rows[0]?.usuario_id || null;
    }

    if (!targetUserId && commerceId !== null) {
      const [rows] = await connection.query('SELECT usuario_id FROM commerces WHERE id = ?', [commerceId]);
      targetUserId = rows[0]?.usuario_id || null;
    }

    if (!targetUserId) {
      throw new Error('No se pudo determinar el user_id para registrar la mejora.');
    }

    const query = `
      INSERT INTO commerce_upgrades (commerce_id, user_id, upgrade_type, price_domis, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await connection.query(query, [commerceId, targetUserId, upgradeType, priceDomis, expiresAt]);
    return result.insertId;
  }

  // Contadores de recursos del comercio para ver lo usado
  async getUsageCounts(commerceId, storeId = null, connection = db) {
    // 1. Sedes activas/operativas y sedes creadas en total
    const activeStoresQuery = `SELECT COUNT(*) as count FROM stores WHERE commerce_id = ? AND estado = 'operativo'`;
    const [[{ count: activeStores }]] = await connection.query(activeStoresQuery, [commerceId]);

    const totalStoresQuery = `SELECT COUNT(*) as count FROM stores WHERE commerce_id = ?`;
    const [[{ count: totalStores }]] = await connection.query(totalStoresQuery, [commerceId]);

    // 2. Menus / Categorias del catálogo
    const categoriesQuery = storeId
      ? `SELECT COUNT(*) as count FROM categorias c JOIN menus m ON c.menu_id = m.id WHERE m.store_id = ? AND c.deleted_at IS NULL AND m.deleted_at IS NULL`
      : `SELECT COUNT(*) as count FROM categorias c JOIN menus m ON c.menu_id = m.id JOIN stores s ON m.store_id = s.id WHERE s.commerce_id = ? AND c.deleted_at IS NULL AND m.deleted_at IS NULL`;
    const [[{ count: activeCategories }]] = await connection.query(categoriesQuery, [storeId || commerceId]);

    // 3. Productos del catálogo
    const productsQuery = storeId
      ? `SELECT COUNT(*) as count FROM products p JOIN categorias c ON p.categoria_id = c.id JOIN menus m ON c.menu_id = m.id WHERE m.store_id = ? AND p.deleted_at IS NULL AND c.deleted_at IS NULL AND m.deleted_at IS NULL`
      : `SELECT COUNT(*) as count FROM products p JOIN categorias c ON p.categoria_id = c.id JOIN menus m ON c.menu_id = m.id JOIN stores s ON m.store_id = s.id WHERE s.commerce_id = ? AND p.deleted_at IS NULL AND c.deleted_at IS NULL AND m.deleted_at IS NULL`;
    const [[{ count: activeProducts }]] = await connection.query(productsQuery, [storeId || commerceId]);

    return {
      activeStores: Number(activeStores),
      totalStores: Number(totalStores),
      activeCategories: Number(activeCategories),
      activeProducts: Number(activeProducts)
    };
  }
  async findAllCatalog(connection = db) {
    const [rows] = await connection.query('SELECT * FROM upgrade_catalog ORDER BY id ASC');
    return rows;
  }

  async findCatalogByRoles(roles, connection = db) {
    if (!roles || roles.length === 0) return [];
    const query = `
      SELECT * FROM upgrade_catalog 
      WHERE is_active = 1
      ORDER BY id ASC
    `;
    const [rows] = await connection.query(query);
    // Filtrar en memoria las mejoras destinadas a alguno de los roles del usuario
    return rows.filter(row => {
      const targetRoles = (row.target_role || '').split(',').map(r => r.trim());
      // Si el rol es commerce_manager, también permitimos ver las destinadas a store_admin
      const effectiveRoles = roles.includes('commerce_manager') ? [...roles, 'store_admin'] : roles;
      return targetRoles.some(r => effectiveRoles.includes(r));
    });
  }

  async findCatalogEntry(upgradeKey, connection = db) {
    const [rows] = await connection.query(
      'SELECT id, upgrade_key, label, description, icon, price_domis, duration_days, is_subscription, max_per_commerce, target_role, is_active FROM upgrade_catalog WHERE upgrade_key = ?',
      [upgradeKey]
    );
    return rows[0] || null;
  }

  async createCatalogEntry(connection, fields) {
    const { upgrade_key, label, description, icon, price_domis, duration_days, is_subscription, max_per_commerce, target_role, is_active } = fields;
    const query = `
      INSERT INTO upgrade_catalog 
        (upgrade_key, label, description, icon, price_domis, duration_days, is_subscription, max_per_commerce, target_role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.query(query, [
      upgrade_key,
      label,
      description,
      icon || 'star',
      price_domis,
      duration_days,
      is_subscription,
      max_per_commerce,
      target_role,
      is_active
    ]);
    return result.insertId;
  }

  async updateCatalogEntry(connection, upgradeKey, fields) {
    const { price_domis, duration_days, description, max_per_commerce, is_active, is_subscription, target_role } = fields;
    const query = `
      UPDATE upgrade_catalog
      SET price_domis = ?, duration_days = ?, description = ?, max_per_commerce = ?, is_active = ?, is_subscription = ?, target_role = ?
      WHERE upgrade_key = ?
    `;
    const [result] = await connection.query(query, [
      price_domis,
      duration_days,
      description,
      max_per_commerce,
      is_active,
      is_subscription,
      target_role,
      upgradeKey
    ]);
    return result.affectedRows > 0;
  }

  async findAllUpgradesAdmin(filters, connection = db) {
    const { type, status, commerceId, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT cu.id, cu.commerce_id, cu.user_id,
             cu.upgrade_type, cu.price_domis, cu.expires_at, cu.created_at,
             c.nombre AS razon_social, u.email, u.rol,
             s.nombre_sucursal AS store_name,
             dc.razon_social AS delivery_company_name,
             bu.email AS target_user_email
       FROM commerce_upgrades cu
       JOIN commerces c ON cu.commerce_id = c.id
       JOIN users u ON c.usuario_id = u.id
       LEFT JOIN stores s ON cu.user_id = s.usuario_id
       LEFT JOIN delivery_companies dc ON cu.user_id = dc.usuario_id
       LEFT JOIN users bu ON cu.user_id = bu.id
    `;
    const params = [];
    const conditions = [];

    if (type) {
      conditions.push('cu.upgrade_type = ?');
      params.push(type);
    }

    if (status) {
      if (status === 'active') {
        conditions.push('cu.expires_at > NOW()');
      } else if (status === 'expired') {
        conditions.push('cu.expires_at <= NOW()');
      }
    }

    if (commerceId) {
      conditions.push('cu.commerce_id = ?');
      params.push(commerceId);
    }

    if (search) {
      conditions.push('(c.nombre LIKE ? OR u.email LIKE ? OR cu.upgrade_type LIKE ? OR s.nombre_sucursal LIKE ? OR dc.razon_social LIKE ? OR bu.email LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Clone query for count
    let countQuery = query.replace(/SELECT cu\.id,.*?\s+FROM/s, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await connection.query(countQuery, params);
    const total = countRows[0] ? countRows[0].total : 0;

    query += ' ORDER BY cu.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await connection.query(query, params);
    return { rows, total };
  }

  async grantUpgradeManual(connection, { commerceId, upgradeKey, priceDomis, expiresAt, storeId = null, deliveryCompanyId = null, userId = null }) {
    return this.createUpgrade(connection, { commerceId, upgradeType: upgradeKey, priceDomis, expiresAt, storeId, deliveryCompanyId, userId });
  }

  async revokeUpgrade(connection, upgradeId) {
    const query = `
      UPDATE commerce_upgrades
      SET expires_at = NOW(6)
      WHERE id = ?
    `;
    const [result] = await connection.query(query, [upgradeId]);
    return result.affectedRows > 0;
  }

  async findUpgradeById(upgradeId, connection = db) {
    const query = `
      SELECT id, commerce_id, user_id, upgrade_type, price_domis, expires_at, created_at
      FROM commerce_upgrades
      WHERE id = ?
    `;
    const [rows] = await connection.query(query, [upgradeId]);
    return rows[0] || null;
  }
}

module.exports = new UpgradesRepository();
