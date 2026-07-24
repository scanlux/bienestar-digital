const db = require('../../../config/db');
const orderRepository = require('../order.repository');
const notificationService = require('../../../services/notificationService');
const { ForbiddenError, NotFoundError, BusinessError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const parseOrderMessage = require('../helpers/parseOrderMessage');

class OrderMessagingService {
  constructor(orderService) {
    this.orderService = orderService;
  }

  async notifyUnavailableItems(user, orderId, agotadosItemIds, req) {
    const isSystem = user.actorType === 'system_user';
    const commerceId = user.commerceId;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orderRows.length === 0) {
        throw new NotFoundError('Pedido no encontrado.');
      }
      const order = orderRows[0];

      if (order.status !== 'pendiente') {
        throw new BusinessError('Solo se pueden notificar faltantes de pedidos en estado pendiente.', 400);
      }

      if (!isSystem) {
        const belongs = await orderRepository.checkStoreBelongsToCommerce(order.store_id, commerceId);
        if (!belongs) {
          throw new ForbiddenError('No tienes autorización sobre la sede de este pedido.');
        }
      }

      const [profileRows] = await conn.query('SELECT nombres FROM profiles WHERE usuario_id = ?', [order.customer_user_id]);
      const customerName = profileRows[0]?.nombres || 'Cliente';

      const [items] = await conn.query(`
        SELECT oi.*, 
               COALESCE(pr.nombre, oi.product_name_snapshot, 'Producto no disponible') as product_name, 
               COALESCE(pr.categoria_id, 0) as category_id
        FROM order_items oi
        LEFT JOIN products pr ON pr.id = oi.product_id
        WHERE oi.id IN (?) AND oi.order_id = ?
      `, [agotadosItemIds, orderId]);

      const messagesToSend = [];

      for (const item of items) {
        const messageText = `Hola ${customerName}, el producto "${item.product_name}" no está disponible en este momento.`;
        const [msgResult] = await conn.query(`
          INSERT INTO order_messages (order_id, sender_type, message, message_type)
          VALUES (?, 'bot', ?, 'text')
        `, [orderId, messageText]);

        messagesToSend.push({
          id: msgResult.insertId, order_id: orderId, sender_type: 'bot', message: messageText, message_type: 'text', extra_data: null, created_at: new Date()
        });

        const [alternatives] = await conn.query(`
          SELECT p.id, p.nombre, p.precio_base as precio, pi.url as thumbnail
          FROM products p
          LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.tipo = 'thumbnail'
          WHERE p.categoria_id = ? AND p.store_id = ? AND p.precio_base <= ? AND p.id != ? 
            AND p.disponible = 1 AND p.deleted_at IS NULL
          LIMIT 2
        `, [item.category_id, order.store_id, item.price, item.product_id]);

        if (alternatives.length > 0) {
          const suggestionText = `¿Te gustaría reemplazarlo por alguna de estas alternativas?`;
          const extraData = JSON.stringify({ suggestions: alternatives, original_item_id: item.id });
          const [suggestResult] = await conn.query(`
            INSERT INTO order_messages (order_id, sender_type, message, message_type, extra_data)
            VALUES (?, 'bot', ?, 'product_suggestion', ?)
          `, [orderId, suggestionText, extraData]);

          messagesToSend.push({
            id: suggestResult.insertId, order_id: orderId, sender_type: 'bot', message: suggestionText, message_type: 'product_suggestion', extra_data: { suggestions: alternatives, original_item_id: item.id }, created_at: new Date()
          });
        }
      }

      const [storeRows] = await conn.query('SELECT slug FROM stores WHERE id = ?', [order.store_id]);
      const storeSlug = storeRows[0]?.slug || '';

      const menuText = `También puedes explorar el menú completo de la sede para elegir algo más.`;
      const menuExtraData = JSON.stringify({ store_id: order.store_id, store_slug: storeSlug });
      const [menuResult] = await conn.query(`
        INSERT INTO order_messages (order_id, sender_type, message, message_type, extra_data)
        VALUES (?, 'bot', ?, 'menu_link', ?)
      `, [orderId, menuText, menuExtraData]);

      messagesToSend.push({
        id: menuResult.insertId, order_id: orderId, sender_type: 'bot', message: menuText, message_type: 'menu_link', extra_data: { store_id: order.store_id, store_slug: storeSlug }, created_at: new Date()
      });

      await conn.commit();

      try {
        for (const msg of messagesToSend) {
          await notificationService.sendOrderMessage(orderId, order.customer_user_id, msg);
        }
      } catch (err) {
        console.error('[NOTIFICATION_SERVICE_ERROR] Failed to send real-time notifications:', err.message);
      }

      await logSecurityEvent(user.id, 'ORDER_NOTIFY_UNAVAILABLE', 'INFO', req, { orderId, agotadosItemIds }, 'store', order.store_id);

      return { success: true, messages: messagesToSend };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getCustomerMessagesList(user, req) {
    const customerId = user.id;
    const [rows] = await db.query(`
      SELECT om.*, s.nombre_sucursal as store_name
      FROM order_messages om
      JOIN (
        SELECT order_id, MAX(id) as max_id
        FROM order_messages
        GROUP BY order_id
      ) latest ON om.id = latest.max_id
      JOIN orders o ON o.id = om.order_id
      JOIN stores s ON s.id = o.store_id
      WHERE o.customer_user_id = ?
      ORDER BY om.created_at DESC
    `, [customerId]);

    return rows.map(parseOrderMessage);
  }

  async markCustomerMessagesRead(user, orderId, req) {
    const customerId = user.id;
    await db.query(`
      UPDATE order_messages om
      JOIN orders o ON o.id = om.order_id
      SET om.is_read = 1
      WHERE om.order_id = ? AND o.customer_user_id = ? AND om.sender_type = 'bot'
    `, [orderId, customerId]);

    return { success: true };
  }

  async getOrderMessages(user, orderId, req) {
    const isSystem = user.actorType === 'system_user';
    
    const [orderRows] = await db.query('SELECT store_id, customer_user_id, driver_user_id FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) {
      throw new NotFoundError('Pedido no encontrado.');
    }
    const order = orderRows[0];

    if (!isSystem && user.rol === 'customer' && order.customer_user_id !== user.id) {
      throw new ForbiddenError('No tienes autorización sobre este pedido.');
    }

    if (!isSystem && user.rol !== 'customer') {
      const belongs = await orderRepository.checkStoreBelongsToCommerce(order.store_id, user.commerceId);
      if (!belongs) {
        throw new ForbiddenError('No tienes autorización sobre este pedido.');
      }
    }

    const [rows] = await db.query(`
      SELECT * FROM order_messages
      WHERE order_id = ?
      ORDER BY created_at ASC
    `, [orderId]);

    return rows.map(parseOrderMessage);
  }
}

module.exports = OrderMessagingService;
