const db = require('../../config/db');

class DeliveryCompanyRepository {
  async findDriversByCompanyId(deliveryCompanyId) {
    const [rows] = await db.query(`
      SELECT u.id, p.nombres, p.apellidos, p.cedula, p.telefono, u.repartidor_activo
      FROM users u
      JOIN profiles p ON p.usuario_id = u.id
      WHERE p.delivery_company_id = ? AND u.es_repartidor = 1
    `, [deliveryCompanyId]);
    return rows;
  }

  async findDriverByCedula(cedula) {
    const [rows] = await db.query(`
      SELECT u.id, u.es_repartidor, p.delivery_company_id, p.nombres, p.apellidos
      FROM users u
      JOIN profiles p ON p.usuario_id = u.id
      WHERE p.cedula = ?
    `, [cedula]);
    return rows[0] || null;
  }

  async updateDriverCompany(userId, deliveryCompanyId) {
    await db.query(
      'UPDATE profiles SET delivery_company_id = ? WHERE usuario_id = ?',
      [deliveryCompanyId, userId]
    );
  }

  async findDriverProfile(userId) {
    const [rows] = await db.query(
      'SELECT delivery_company_id FROM profiles WHERE usuario_id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  async getDashboardStats(deliveryCompanyId) {
    // 1. Repartidores activos en ruta (con pedidos activos)
    const [activeDriversRow] = await db.query(`
      SELECT COUNT(DISTINCT u.id) as activeDrivers
      FROM users u
      JOIN profiles p ON p.usuario_id = u.id
      JOIN orders o ON o.driver_user_id = u.id
      WHERE p.delivery_company_id = ? AND u.es_repartidor = 1 
        AND o.status IN ('listo_despacho', 'en_camino')
    `, [deliveryCompanyId]);

    // 2. Entregas completadas hoy en Colombia Timezone
    const [completedDeliveriesRow] = await db.query(`
      SELECT COUNT(*) as completedToday,
             COALESCE(SUM(o.domi_cost * o.fiat_peg_snapshot), 0) as earningsToday
      FROM orders o
      WHERE o.delivery_company_id = ? AND o.status = 'entregado'
        AND DATE(CONVERT_TZ(o.created_at, '+00:00', '-05:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-05:00'))
    `, [deliveryCompanyId]);

    // 3. Cantidad de pedidos disponibles en el sistema ('listo' y sin driver)
    const [availableOrdersRow] = await db.query(`
      SELECT COUNT(*) as availableOrdersCount
      FROM orders o
      WHERE o.status = 'listo' AND o.driver_user_id IS NULL
    `);

    return {
      activeDrivers: activeDriversRow[0]?.activeDrivers || 0,
      completedDeliveriesToday: completedDeliveriesRow[0]?.completedToday || 0,
      totalEarningsCopToday: Math.round(completedDeliveriesRow[0]?.earningsToday || 0),
      availableOrdersCount: availableOrdersRow[0]?.availableOrdersCount || 0
    };
  }

  async findAvailableDrivers(deliveryCompanyId, period) {
    const [rows] = await db.query(`
      SELECT u.id, p.nombres, p.apellidos, p.cedula, p.telefono, u.repartidor_activo,
        COUNT(CASE WHEN o.status = 'entregado' THEN 1 END) as deliveries_completed,
        COUNT(CASE WHEN o.status IN ('listo_despacho','en_camino') THEN 1 END) as in_progress,
        COUNT(CASE WHEN o.status = 'cancelado' THEN 1 END) as cancellations
      FROM users u
      JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN orders o ON o.driver_user_id = u.id AND (
        (? = 'day'  AND DATE(CONVERT_TZ(o.created_at,'+00:00','-05:00')) = DATE(CONVERT_TZ(NOW(),'+00:00','-05:00')))
        OR
        (? = 'week' AND YEARWEEK(CONVERT_TZ(o.created_at,'+00:00','-05:00'),1) = YEARWEEK(CONVERT_TZ(NOW(),'+00:00','-05:00'),1))
      )
      WHERE p.delivery_company_id = ? AND u.es_repartidor = 1
      GROUP BY u.id
      ORDER BY u.repartidor_activo DESC, deliveries_completed DESC
    `, [period, period, deliveryCompanyId]);
    return rows;
  }

  async findAvailableOrders() {
    const [rows] = await db.query(`
      SELECT o.*, s.nombre_sucursal as store_name,
             p.nombres as customer_nombres, p.apellidos as customer_apellidos,
             u.domi_score as customer_score
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      LEFT JOIN users u ON o.customer_user_id = u.id
      LEFT JOIN profiles p ON p.usuario_id = u.id
      WHERE o.status = 'listo' AND o.driver_user_id IS NULL
      ORDER BY o.created_at ASC
    `);
    return rows;
  }

  async findOrderHistory(deliveryCompanyId, limit, offset) {
    const [rows] = await db.query(`
      SELECT o.*, s.nombre_sucursal as store_name,
             cp.nombres as customer_nombres, cp.apellidos as customer_apellidos,
             cu.domi_score as customer_score,
             dp.nombres as driver_nombres, dp.apellidos as driver_apellidos
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      LEFT JOIN users cu ON o.customer_user_id = cu.id
      LEFT JOIN profiles cp ON cp.usuario_id = cu.id
      LEFT JOIN profiles dp ON dp.usuario_id = o.driver_user_id
      WHERE o.delivery_company_id = ?
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [deliveryCompanyId, limit, offset]);
    return rows;
  }

  async acceptOrder(conn, orderId, deliveryCompanyId, deliveryCompanyCost, fiatPeg) {
    const queryExecutor = conn || db;
    await queryExecutor.query(
      `UPDATE orders SET 
        status = 'listo_despacho', 
        delivery_company_id = ?, 
        delivery_company_commission_paid = 1, 
        driver_cost_domi_snapshot = ?, 
        fiat_peg_snapshot = ?, 
        accepted_at = COALESCE(accepted_at, NOW()) 
       WHERE id = ?`,
      [deliveryCompanyId, deliveryCompanyCost, fiatPeg, orderId]
    );
  }

  async assignDriver(conn, orderId, driverUserId) {
    const queryExecutor = conn || db;
    await queryExecutor.query(
      `UPDATE orders SET driver_user_id = ? WHERE id = ?`,
      [driverUserId, orderId]
    );
  }

  async findOrderById(conn, orderId) {
    const queryExecutor = conn || db;
    const [rows] = await queryExecutor.query(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    );
    return rows[0] || null;
  }

  async getDeliveryFinancialSummaryData(deliveryCompanyId, startDate, endDate) {
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'entregado' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelado' AND store_rejection_notes IS NOT NULL THEN 1 END) as rejected_orders,
        COUNT(CASE WHEN status = 'cancelado' AND store_rejection_notes IS NULL THEN 1 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN status = 'entregado' THEN (domi_cost * fiat_peg_snapshot) ELSE 0 END), 0) as total_earnings
      FROM orders
      WHERE created_at >= ? AND created_at <= ? AND delivery_company_id = ?
    `;
    const [rows] = await db.query(query, [startDate, endDate, deliveryCompanyId]);
    return rows[0] || null;
  }

  async getMonthsWithData(deliveryCompanyId) {
    const query = `
      SELECT DISTINCT DATE_FORMAT(DATE_SUB(created_at, INTERVAL 5 HOUR), '%Y-%m') as month
      FROM orders
      WHERE delivery_company_id = ?
      ORDER BY month DESC
    `;
    const [rows] = await db.query(query, [deliveryCompanyId]);
    return rows.map(r => r.month).filter(Boolean);
  }
}

module.exports = new DeliveryCompanyRepository();
