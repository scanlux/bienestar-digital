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

  async createCommerce(userId, razon_social, nit, email, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, admin_nombres, admin_apellidos, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      `INSERT INTO commerces 
       (usuario_id, nombre, nit, status, nit_dv, telefono, ciudad, direccion, descripcion, logo_url) 
       VALUES (?, ?, ?, "active", ?, ?, ?, ?, ?, ?)`,
      [
        userId, razon_social, nit, 
        nit_dv || null, telefono || null, ciudad || null, direccion || null, 
        descripcion || null, logo_url || null
      ]
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

  async updateRequestVerifiedFields(id, verifiedFields, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(
      'UPDATE registration_requests SET verified_fields = ? WHERE id = ?',
      [verifiedFields ? JSON.stringify(verifiedFields) : null, id]
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
    const [[{ productsCount }]] = await db.query("SELECT COUNT(*) as productsCount FROM products WHERE deleted_at IS NULL");
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

  async getFinancialFlags() {
    const [rows] = await db.query('SELECT * FROM system_financial_flags ORDER BY id ASC');
    return rows;
  }

  async updateFinancialFlag(key, enabled, updatedBy) {
    await db.query(
      'UPDATE system_financial_flags SET enabled = ?, updated_by = ? WHERE `key` = ?',
      [enabled ? 1 : 0, updatedBy || null, key]
    );
  }

  async updatePermissionUIMode(id, mode) {
    await db.query(
      'UPDATE permissions SET ui_restriction_mode = ? WHERE id = ?',
      [mode, id]
    );
  }

  async getAllEmailTemplates() {
    const [rows] = await db.query(
      'SELECT id, name, label, category, subject, variables, is_system, updated_at FROM email_templates ORDER BY category ASC, label ASC'
    );
    return rows;
  }

  async getEmailTemplateByName(name) {
    const [rows] = await db.query(
      'SELECT * FROM email_templates WHERE name = ?',
      [name]
    );
    return rows[0] || null;
  }

  async updateEmailTemplate(name, { subject, html_body }) {
    const [result] = await db.query(
      'UPDATE email_templates SET subject = ?, html_body = ? WHERE name = ?',
      [subject, html_body, name]
    );
    return result.affectedRows > 0;
  }

  async createEmailTemplate({ name, label, category, subject, html_body, variables }) {
    const [result] = await db.query(
      'INSERT INTO email_templates (name, label, category, subject, html_body, variables, is_system) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [name, label, category, subject, html_body, variables ? JSON.stringify(variables) : null]
    );
    return result.insertId;
  }

  async getSeverityStats(filters) {
    const { eventType, resourceType, resourceId, actorType, dateFrom, dateTo } = filters;
    let query = 'SELECT s.severity, COUNT(*) as count FROM security_audit_logs s';
    const params = [];
    const conditions = [];

    if (eventType) {
      conditions.push('s.event_type = ?');
      params.push(eventType);
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

    query += ' GROUP BY s.severity';

    const [rows] = await db.query(query, params);

    const stats = {
      CRITICAL: 0,
      ALERT: 0,
      HIGH: 0,
      MEDIUM: 0,
      MAINT: 0,
      LOW: 0
    };

    rows.forEach(row => {
      const sev = row.severity;
      if (stats[sev] !== undefined) {
        stats[sev] = Number(row.count || 0);
      }
    });

    return stats;
  }

  async getSystemNavigationItems(connection) {
    const queryExecutor = connection || db;
    const [rows] = await queryExecutor.query('SELECT * FROM system_navigation ORDER BY parent_id ASC, order_index ASC');
    return rows;
  }

  async updateSystemNavigationItem(id, data, connection) {
    const queryExecutor = connection || db;
    const fields = [];
    const values = [];
    
    const updatable = ['label', 'page_title', 'path', 'icon', 'required_permission', 'order_index', 'layout_scope', 'risk_level', 'parent_id'];
    for (const key of updatable) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        values.push(data[key]);
      }
    }
    
    if (fields.length === 0) return;
    values.push(id);
    await queryExecutor.query(`UPDATE system_navigation SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async bulkUpdateNavigationOrders(items, connection) {
    const queryExecutor = connection || db;
    for (const item of items) {
      await queryExecutor.query(
        'UPDATE system_navigation SET order_index = ?, parent_id = ? WHERE id = ?',
        [item.order_index, item.parent_id !== undefined ? item.parent_id : null, item.id]
      );
    }
  }

  async protectedUpdateProtocolRules(fields, values, connection) {
    const queryExecutor = connection || db;
    try {
      await queryExecutor.query('SET @domi_bypass_security = 1');
      await queryExecutor.query(
        `UPDATE protocol_rules SET ${fields.join(', ')} WHERE id = 1`,
        values
      );
    } finally {
      await queryExecutor.query('SET @domi_bypass_security = NULL');
    }
  }
}

module.exports = new AdminRepository();

