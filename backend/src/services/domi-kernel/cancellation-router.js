const { BusinessError } = require('../../utils/errors');
const customerCancel = require('./customer-cancel');
const storeCancel = require('./store-cancel');
const driverCancel = require('./driver-cancel');

async function routeCancellation(conn, order, oldStatus, actor) {
  const isDriver = order.driver_user_id && String(order.driver_user_id) === String(actor.id);
  const isStore  = actor.rol === 'store_admin' || actor.commerceId || actor.actorType === 'operator' || actor.rol === 'admin';
  const isDomi   = order.payment_method_customer === 'domi';

  if (isDriver) {
    if (oldStatus === 'listo_despacho') {
      await driverCancel.processDriverCancelPrePickup(conn, order);
      return { nextStatus: 'listo' };
    }
    if (oldStatus === 'en_camino') {
      await driverCancel.processDriverCancelPostPickup(conn, order);
      return { nextStatus: 'cancelado' };
    }
    throw new BusinessError('El repartidor no puede cancelar el pedido en este estado.', 400);
  }

  if (isStore) {
    if (isDomi) {
      await storeCancel.processStoreCancelDomi(conn, order, oldStatus);
    } else {
      await storeCancel.processStoreCancelCod(conn, order, oldStatus);
    }
    return { nextStatus: 'cancelado' };
  }

  // Cliente cancelando
  const cancelMap = {
    pendiente:      () => isDomi ? customerCancel.processDomiCancelPending(conn, order)  : customerCancel.processCodCancelPending(conn, order),
    aceptado:       () => isDomi ? customerCancel.processDomiCancelPrep(conn, order)     : customerCancel.processCodCancelPrep(conn, order),
    preparando:     () => isDomi ? customerCancel.processDomiCancelPrep(conn, order)     : customerCancel.processCodCancelPrep(conn, order),
    listo:          () => isDomi ? customerCancel.processDomiCancelPrep(conn, order)     : customerCancel.processCodCancelPrep(conn, order),
    listo_despacho: () => isDomi ? customerCancel.processDomiCancelDispatch(conn, order) : customerCancel.processCodCancelDispatch(conn, order),
    en_camino:      () => isDomi ? customerCancel.processDomiCancelTransit(conn, order)  : customerCancel.processCodCancelTransit(conn, order),
  };

  const handler = cancelMap[oldStatus];
  if (!handler) {
    throw new BusinessError(`Cancelacion no permitida en estado: ${oldStatus}.`, 400);
  }
  await handler();
  return { nextStatus: 'cancelado' };
}

module.exports = {
  routeCancellation
};
