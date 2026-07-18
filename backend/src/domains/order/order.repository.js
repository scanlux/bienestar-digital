const db = require('../../config/db');

class OrderRepository {
  async findStoresByCommerce(commerceId, isSystem) {
    let query = 'SELECT id FROM stores';
    const params = [];
    if (!isSystem) {
      query += ' WHERE commerce_id = ?';
      params.push(commerceId);
    }
    const [rows] = await db.query(query, params);
    return rows;
  }

  async findOrdersByStoreIds(storeIds) {
    const [rows] = await db.query(`
      SELECT 
        o.*, 
        s.nombre_sucursal as store_name, 
        p.nombres as customer_nombres, 
        p.apellidos as customer_apellidos, 
        u.domi_score as customer_score,
        COALESCE(
          JSON_ARRAYAGG(
            CASE WHEN oi.id IS NOT NULL THEN
              JSON_OBJECT(
                'item_id', oi.id,
                'product_id', oi.product_id,
                'product_name', COALESCE(pr.nombre, oi.product_name_snapshot, 'Producto no disponible'),
                'quantity', oi.quantity,
                'price', oi.price,
                'thumbnail', COALESCE(pi.url, oi.product_image_snapshot)
              )
            END
          ), JSON_ARRAY()
        ) as items
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      LEFT JOIN users u ON o.customer_user_id = u.id
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products pr ON pr.id = oi.product_id
      LEFT JOIN product_images pi ON pi.product_id = pr.id AND pi.tipo = 'thumbnail'
      WHERE o.store_id IN (?)
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [storeIds]);

    // Parse items if they are returned as string or null
    return rows.map(row => {
      if (typeof row.items === 'string') {
        try {
          row.items = JSON.parse(row.items);
        } catch (e) {
          row.items = [];
        }
      }
      // If JSON_ARRAYAGG returns [null] when no items exist
      if (Array.isArray(row.items)) {
        row.items = row.items.filter(item => item !== null);
      } else {
        row.items = [];
      }
      return row;
    });
  }

  async findOrderById(orderId) {
    const [rows] = await db.query('SELECT id, store_id FROM orders WHERE id = ?', [orderId]);
    return rows[0] || null;
  }

  async checkStoreBelongsToCommerce(storeId, commerceId) {
    const [rows] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
    return rows.length > 0;
  }

  async updateOrderStatus(orderId, status) {
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
  }

  async insertOrder(orderData, connection) {
    const queryExecutor = connection || db;
    const [result] = await queryExecutor.query(`
      INSERT INTO orders (
        store_id, 
        customer_user_id, 
        total_cop, 
        domi_cost, 
        driver_domi_cost,
        payment_method_customer,
        store_cost_cop_snapshot,
        driver_cost_domi_snapshot,
        fiat_peg_snapshot,
        store_commission_refund_rate_snapshot,
        driver_commission_refund_rate_snapshot,
        driver_commission_refund_transit_rate_snapshot,
        driver_rescue_commission_refund_rate_snapshot,
        driver_rescue_timeout_minutes_snapshot,
        driver_rescue_max_attempts_snapshot,
        driver_penalty_points_rescue_original_snapshot,
        driver_rescue_chain_penalty_points_snapshot,
        minimum_delivery_rate_snapshot,
        store_solvency_delivery_multiplier_snapshot,
        solvency_commission_guarantee_fraction_snapshot,
        store_cancel_client_indemnity_domi_amount_snapshot,
        store_penalty_points_prep_snapshot,
        store_penalty_points_dispatch_snapshot,
        driver_penalty_points_prep_snapshot,
        driver_penalty_points_dispatch_snapshot,
        driver_penalty_points_transit_snapshot,
        store_cancel_driver_delivery_pct_rate_snapshot,
        store_cancel_client_indemnity_rate_snapshot,
        customer_cancel_driver_delivery_pct_dispatch_rate_snapshot,
        driver_commission_refund_on_store_cancel_rate_snapshot,
        score_penalty_cash_cancel_accepted_snapshot,
        score_penalty_cash_cancel_dispatch_snapshot,
        score_penalty_cash_cancel_in_transit_snapshot,
        score_penalty_domi_cancel_accepted_snapshot,
        score_penalty_domi_cancel_dispatch_snapshot,
        score_penalty_domi_cancel_in_transit_snapshot,
        platform_processing_fee_rate_snapshot,
        distance_km,
        status, 
        delivery_address, 
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
    `, [
      orderData.store_id,
      orderData.customer_user_id,
      orderData.total_cop,
      orderData.domi_cost || 0,
      orderData.driver_domi_cost || 0,
      orderData.payment_method_customer || 'domi',
      orderData.store_cost_cop_snapshot || null,
      orderData.driver_cost_domi_snapshot || null,
      orderData.fiat_peg_snapshot || null,
      orderData.store_commission_refund_rate_snapshot || null,
      orderData.driver_commission_refund_rate_snapshot || null,
      orderData.driver_commission_refund_transit_rate_snapshot || null,
      orderData.driver_rescue_commission_refund_rate_snapshot || null,
      orderData.driver_rescue_timeout_minutes_snapshot || null,
      orderData.driver_rescue_max_attempts_snapshot || null,
      orderData.driver_penalty_points_rescue_original_snapshot || null,
      orderData.driver_rescue_chain_penalty_points_snapshot || null,
      orderData.minimum_delivery_rate_snapshot || null,
      orderData.store_solvency_delivery_multiplier_snapshot || null,
      orderData.solvency_commission_guarantee_fraction_snapshot || null,
      orderData.store_cancel_client_indemnity_domi_amount_snapshot || null,
      orderData.store_penalty_points_prep_snapshot || null,
      orderData.store_penalty_points_dispatch_snapshot || null,
      orderData.driver_penalty_points_prep_snapshot || null,
      orderData.driver_penalty_points_dispatch_snapshot || null,
      orderData.driver_penalty_points_transit_snapshot || null,
      orderData.store_cancel_driver_delivery_pct_rate_snapshot || null,
      orderData.store_cancel_client_indemnity_rate_snapshot || null,
      orderData.customer_cancel_driver_delivery_pct_dispatch_rate_snapshot || null,
      orderData.driver_commission_refund_on_store_cancel_rate_snapshot || null,
      orderData.score_penalty_cash_cancel_accepted_snapshot || null,
      orderData.score_penalty_cash_cancel_dispatch_snapshot || null,
      orderData.score_penalty_cash_cancel_in_transit_snapshot || null,
      orderData.score_penalty_domi_cancel_accepted_snapshot || null,
      orderData.score_penalty_domi_cancel_dispatch_snapshot || null,
      orderData.score_penalty_domi_cancel_in_transit_snapshot || null,
      orderData.platform_processing_fee_rate_snapshot || null,
      orderData.distance_km || null,
      orderData.delivery_address || null,
      orderData.notes || null
    ]);
    return result.insertId;
  }

  async findUserOrders(userId) {
    const [rows] = await db.query(`
      SELECT o.*, s.nombre_sucursal as store_name
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      WHERE o.customer_user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);
    return rows;
  }
}

module.exports = new OrderRepository();
