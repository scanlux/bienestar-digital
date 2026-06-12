const orderRepository = require('./order.repository');
const { ForbiddenError, NotFoundError, ValidationError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');

class OrderService {
  async getOrders(user) {
    const isSystem = user.actorType === 'system_user';
    const stores = await orderRepository.findStoresByCommerce(user.commerceId, isSystem);
    if (stores.length === 0) {
      return [];
    }
    const storeIds = stores.map(s => s.id);
    return await orderRepository.findOrdersByStoreIds(storeIds);
  }

  async updateOrderStatus(user, orderId, status, req) {
    const isSystem = user.actorType === 'system_user';
    const commerceId = user.commerceId;

    if (!status || !['pendiente', 'preparando', 'listo_para_envio', 'en_camino', 'entregado', 'cancelado'].includes(status)) {
      throw new ValidationError('Estado invalido o no provisto.');
    }

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Pedido no encontrado.');
    }
    const storeId = order.store_id;

    // Validar BOLA (Broken Object Level Authorization)
    if (!isSystem) {
      const belongs = await orderRepository.checkStoreBelongsToCommerce(storeId, commerceId);
      if (!belongs) {
        await logSecurityEvent(
          user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { orderId: parseInt(orderId), action: 'change_order_status', targetStoreId: storeId },
          'store',
          storeId
        );
        throw new ForbiddenError('No tienes autorizacion sobre la sede de este pedido.');
      }
    }

    // Actualizar el estado
    await orderRepository.updateOrderStatus(orderId, status);

    // Logger
    await logSecurityEvent(
      user.id,
      'CHANGE_ORDER_STATUS',
      'LOW',
      req,
      { orderId: parseInt(orderId), status },
      'store',
      storeId
    );

    return { success: true, message: `Estado del pedido actualizado a: ${status}` };
  }

  async createOrder(user, data, req) {
    const { 
      store_id, 
      customer_user_id, 
      total_cop, 
      domi_cost, 
      delivery_address, 
      notes
    } = data;

    if (!store_id || !customer_user_id || !total_cop) {
      throw new ValidationError('Faltan campos obligatorios (store_id, customer_user_id, total_cop)');
    }

    if (user.rol !== 'admin' && String(user.id) !== String(customer_user_id)) {
      await logSecurityEvent(user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: 'Intento de crear pedido para otro usuario',
        targetCustomerUserId: customer_user_id
      });
      throw new ForbiddenError('Acceso no autorizado. No puedes crear pedidos para otros usuarios.');
    }

    const db = require('../../config/db');
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const orderId = await orderRepository.insertOrder({
        store_id,
        customer_user_id,
        total_cop,
        domi_cost,
        delivery_address,
        notes
      }, connection);

      await connection.commit();
      connection.release();

      return { 
        id: orderId, 
        message: 'Pedido creado con éxito',
        status: 'pendiente'
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
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
}

module.exports = new OrderService();
