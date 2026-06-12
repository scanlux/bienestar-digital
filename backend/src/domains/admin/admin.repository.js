const db = require('../../config/db');

class AdminRepository {
  async findRegistrationRequests(status) {
    let query = 'SELECT * FROM registration_requests';
    const params = [];
    if (status) {
      query += ' WHERE estado = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  async findRequestById(id, connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT * FROM registration_requests WHERE id = ? FOR UPDATE', [id]);
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
    const { nombres_contacto, apellidos_contacto, nit, celular_contacto } = data;
    await queryExecutor.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
      [
        userId,
        nombres_contacto,
        apellidos_contacto,
        nit,
        celular_contacto
      ]
    );
  }

  async createCommerce(userId, razon_social, nit, email, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO commerces (usuario_id, nombre, nit, status, email) VALUES (?, ?, ?, "active", ?)',
      [userId, razon_social, nit, email]
    );
  }

  async createDeliveryCompany(userId, nit, razon_social, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'INSERT INTO delivery_companies (usuario_id, nit, razon_social, estado) VALUES (?, ?, ?, "activo")',
      [userId, nit, razon_social]
    );
  }

  async updateRequestStatus(id, status, notes_system, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'UPDATE registration_requests SET estado = ?, notas_system = ? WHERE id = ?',
      [status, notes_system || null, id]
    );
  }

  async findSecurityLogs(filters, limit, offset) {
    const { eventType, severity, resourceType, resourceId, actorType, dateFrom, dateTo } = filters;
    
    let query = `
      SELECT s.*, 
             COALESCE(u.email, su.email) AS actor_email,
             COALESCE(p.nombres, su.nombres) AS actor_nombre 
      FROM security_audit_logs s
      LEFT JOIN users u ON s.actor_type = 'user' AND s.actor_id = u.id
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN system_users su ON s.actor_type = 'system_user' AND s.actor_id = su.id
    `;
    const params = [];
    const conditions = [];

    if (eventType) {
      conditions.push('s.event_type = ?');
      params.push(eventType);
    }
    if (severity) {
      conditions.push('s.severity = ?');
      params.push(severity);
    }
    if (resourceType) {
      conditions.push('s.resource_type = ?');
      params.push(resourceType);
    }
    if (resourceId) {
      conditions.push('s.resource_id = ?');
      params.push(Number(resourceId));
    }
    if (actorType) {
      conditions.push('s.actor_type = ?');
      params.push(actorType);
    }
    if (dateFrom) {
      conditions.push('s.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('s.created_at <= ?');
      params.push(dateTo);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return rows;
  }

  async countSecurityLogs(filters) {
    const { eventType, severity, resourceType, resourceId, actorType, dateFrom, dateTo } = filters;
    let query = 'SELECT COUNT(*) as total FROM security_audit_logs s';
    const params = [];
    const conditions = [];

    if (eventType) {
      conditions.push('s.event_type = ?');
      params.push(eventType);
    }
    if (severity) {
      conditions.push('s.severity = ?');
      params.push(severity);
    }
    if (resourceType) {
      conditions.push('s.resource_type = ?');
      params.push(resourceType);
    }
    if (resourceId) {
      conditions.push('s.resource_id = ?');
      params.push(Number(resourceId));
    }
    if (actorType) {
      conditions.push('s.actor_type = ?');
      params.push(actorType);
    }
    if (dateFrom) {
      conditions.push('s.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('s.created_at <= ?');
      params.push(dateTo);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [[{ total }]] = await db.query(query, params);
    return total;
  }

  async findGlobalStats() {
    const [[{ commercesCount }]] = await db.query("SELECT COUNT(*) as commercesCount FROM commerces WHERE status = 'active'");
    const [[{ pendingCount }]] = await db.query("SELECT COUNT(*) as pendingCount FROM registration_requests WHERE estado = 'pendiente'");
    const [[{ storesCount }]] = await db.query("SELECT COUNT(*) as storesCount FROM stores");
    const [[{ productsCount }]] = await db.query("SELECT COUNT(*) as productsCount FROM products");
    const ordersCount = 0;

    return {
      activeCommerces: commercesCount,
      pendingRequests: pendingCount,
      totalStores: storesCount,
      totalProducts: productsCount,
      totalOrders: ordersCount
    };
  }

  async ping() {
    const [rows] = await db.query('SELECT 1');
    return !!rows;
  }
}

module.exports = new AdminRepository();
