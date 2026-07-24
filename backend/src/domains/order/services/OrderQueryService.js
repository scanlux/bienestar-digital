const db = require('../../../config/db');
const orderRepository = require('../order.repository');
const { ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const assertOrderAccess = require('../helpers/orderAccessGuard');

class OrderQueryService {
  constructor(orderService) {
    this.orderService = orderService;
  }

  async getOrders(user) {
    const isSystem = user.actorType === 'system_user';
    const stores = await orderRepository.findStoresByCommerce(user.commerceId, isSystem);
    if (stores.length === 0) {
      return [];
    }
    const storeIds = stores.map(s => s.id);
    return await orderRepository.findOrdersByStoreIds(storeIds);
  }

  async getUserOrders(user, userId, req) {
    if (user.rol !== 'admin' && String(user.id) !== String(userId)) {
      await logSecurityEvent(user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: 'Intento de ver historial de pedidos de otro usuario',
        targetUserId: userId
      });
      throw new ForbiddenError('Acceso no autorizado. Sólo puedes ver tu propio historial de pedidos.');
    }
    return await orderRepository.findUserOrders(userId);
  }

  async getOrderItems(user, orderId, req) {
    const isSystem = user.actorType === 'system_user';
    const commerceId = user.commerceId;

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Pedido no encontrado.');
    }

    if (!isSystem && user.rol !== 'customer') {
      const belongs = await orderRepository.checkStoreBelongsToCommerce(order.store_id, commerceId);
      if (!belongs) {
        throw new ForbiddenError('No tienes autorización sobre la sede de este pedido.');
      }
    }

    const [rows] = await db.query(`
      SELECT 
        oi.*,
        COALESCE(pr.nombre, oi.product_name_snapshot, 'Producto no disponible') as product_name,
        COALESCE(pi.url, oi.product_image_snapshot) as thumbnail
      FROM order_items oi
      LEFT JOIN products pr ON pr.id = oi.product_id
      LEFT JOIN product_images pi ON pi.product_id = pr.id AND pi.tipo = 'thumbnail'
      WHERE oi.order_id = ?
    `, [orderId]);

    return rows;
  }

  async getOrderDetail(user, orderId, req) {
    const isSystem = user.actorType === 'system_user';
    
    const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) {
      throw new NotFoundError('Pedido no encontrado.');
    }
    const order = orderRows[0];

    await assertOrderAccess(user, order, null, req);

    const [items] = await db.query(`
      SELECT oi.*, p.nombre, p.image_url 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    order.items = items;
    return order;
  }

  async getCustomerUnreadCount(user, req) {
    const customerId = user.id;
    const [rows] = await db.query(`
      SELECT COUNT(*) as unread_count
      FROM order_messages om
      JOIN orders o ON o.id = om.order_id
      WHERE o.customer_user_id = ? AND om.is_read = 0 AND om.sender_type = 'bot'
    `, [customerId]);

    return { unreadCount: rows[0]?.unread_count || 0 };
  }
}

module.exports = OrderQueryService;
