const { ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const orderRepository = require('../order.repository');

/**
 * Valida de forma estricta (BOLA Check) si el usuario autenticado tiene acceso al pedido.
 * Lanza ForbiddenError y genera logs en auditoría si detecta intrusiones.
 */
async function assertOrderAccess(user, order, targetStatus, req) {
  const isSystem = user.actorType === 'system_user';
  if (isSystem) return;

  const orderId = order.id;
  const storeId = order.store_id;
  const commerceId = user.commerceId;

  const isUserDriver = user.roles && user.roles.includes('driver');
  
  if (isUserDriver) {
    if (order.driver_user_id !== user.id) {
      await logSecurityEvent(user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: 'Repartidor no asignado intentando modificar/ver pedido',
        orderId: parseInt(orderId),
        targetDriverId: order.driver_user_id
      });
      throw new ForbiddenError('No tienes autorización sobre este pedido ya que no eres el repartidor asignado.');
    }
    if (targetStatus && !['en_camino', 'entregado', 'cancelado'].includes(targetStatus)) {
      throw new ForbiddenError('Los repartidores solo pueden marcar como en camino, entregado o cancelado.');
    }
  } else if (user.rol === 'customer') {
    if (order.customer_user_id !== user.id) {
      await logSecurityEvent(user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: 'Cliente intentando acceder a pedido ajeno',
        orderId: parseInt(orderId),
        targetCustomerId: order.customer_user_id
      });
      throw new ForbiddenError('No tienes autorización sobre este pedido.');
    }
    if (targetStatus && targetStatus !== 'cancelado') {
      throw new ForbiddenError('Los clientes solo pueden cancelar pedidos.');
    }
  } else {
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
      throw new ForbiddenError('No tienes autorización sobre la sede de este pedido.');
    }
  }
}

module.exports = assertOrderAccess;
