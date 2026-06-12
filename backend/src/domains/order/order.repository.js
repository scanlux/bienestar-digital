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
      SELECT o.*, s.nombre_sucursal as store_name, p.nombres as customer_nombres, p.apellidos as customer_apellidos
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      LEFT JOIN users u ON o.customer_user_id = u.id
      LEFT JOIN profiles p ON p.usuario_id = u.id
      WHERE o.store_id IN (?)
      ORDER BY o.created_at DESC
    `, [storeIds]);
    return rows;
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
        status, 
        delivery_address, 
        notes
      ) VALUES (?, ?, ?, ?, 'pendiente', ?, ?)
    `, [
      orderData.store_id,
      orderData.customer_user_id,
      orderData.total_cop,
      orderData.domi_cost || 0,
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
