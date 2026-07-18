// fsm/calculators/customerCancel.calc.js
// FUNCIONES PURAS: sin queries, solo matemáticas sobre el objeto order.
// Input: fila completa de orders (con todos los campos _snapshot).
// Output: objeto de montos con todos los valores necesarios para el handler.
//
// REGLA: Nunca consultar protocol_rules aquí. Todo viene de order.*_snapshot.
// Ver REGLAS_DE_NEGOCIO.md §3 — Regla Maestra de Snapshots.
// Ver MATRIZ_CANCELACIONES.md — COD y DOMI por estado.

/**
 * Estado: pendiente
 * REGLA: No se ha cobrado ninguna comisión operativa.
 * COD:  Sin movimiento financiero. Retorna montos en 0.
 * DOMI: Devolver 100% del locked_balance al cliente (sin fee).
 * Penalización de Score: 0 puntos.
 */
function forPendiente(order) {
  const isDomi = order.payment_method_customer === 'domi';
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const domiCost = parseFloat(order.driver_domi_cost || 0);
  const lockedBalance = isDomi
    ? parseFloat((orderTotalDomi + domiCost).toFixed(8))
    : 0;

  return {
    // DOMI: devolver todo al cliente
    clientRefund:          lockedBalance,  // solo aplica en DOMI
    // COD: ningún movimiento
    storeCommissionRefund: 0,
    driverCommissionRefund: 0,
    scorePenalty:          0,
    debtTotal:             0,              // COD: sin deuda
    isDomi,
  };
}

/**
 * Estado: aceptado / preparando / listo
 * REGLA MATRIZ COD:
 *   - Score: -score_penalty_cash_cancel_accepted_snapshot (30 pts)
 *   - Reembolso comisión sede: store_commission_refund_rate_snapshot
 *   - Reembolso comisión repartidor (si driver IS NOT NULL): driver_commission_refund_rate_snapshot
 *   - 50% del domicilio al conductor (si asignado) con fee deducida
 *   - 50% del domicilio devuelto al cliente
 *   - Productos: 90% sede / 7% cliente / 3% sistema
 *
 * REGLA MATRIZ DOMI:
 *   - Igual distribución pero sobre locked_balance; sin fee.
 */
function forPreparation(order) {
  const isCod  = order.payment_method_customer === 'cash_cod';
  const fee    = isCod ? parseFloat(order.platform_processing_fee_rate_snapshot || 0) : 0;
  const hasDriver = !!order.driver_user_id;

  // Comisiones operativas ya cobradas al aceptar
  const storeCommissionRefund  = parseFloat(order.store_commission_advance || 0)
    * parseFloat(order.store_commission_refund_rate_snapshot || 0);
  const driverCommissionRefund = hasDriver
    ? parseFloat(order.driver_commission_advance || 0)
      * parseFloat(order.driver_commission_refund_rate_snapshot || 0)
    : 0;

  // Domicilio (split 50/50 si hay conductor)
  const domiCost = parseFloat(order.driver_domi_cost || 0);
  const splitRate = parseFloat(order.customer_cancel_driver_delivery_pct_dispatch_rate_snapshot || 0.5);
  const driverDeliveryPay = hasDriver
    ? parseFloat((domiCost * splitRate * (1 - fee)).toFixed(8))
    : 0;
  const clientDeliveryRefund = hasDriver
    ? parseFloat((domiCost * (1 - splitRate) * (1 - fee)).toFixed(8))
    : parseFloat((domiCost * (1 - fee)).toFixed(8)); // sin conductor: todo al cliente

  // Derivar costo de productos en DOMIs
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const productsCost = orderTotalDomi;

  // Distribución de productos
  const storeRate    = parseFloat(order.customer_cancel_store_refund_prep_rate_snapshot    || 0.90);
  const clientRate   = parseFloat(order.customer_cancel_client_refund_prep_rate_snapshot   || 0.07);
  const sysRate      = parseFloat(order.customer_cancel_sys_retain_prep_rate_snapshot      || 0.03);

  const storeProductPayout  = parseFloat((productsCost * storeRate  * (1 - fee)).toFixed(8));
  const clientProductRefund = parseFloat((productsCost * clientRate * (1 - fee)).toFixed(8));
  const sysRetain           = parseFloat((productsCost * sysRate    * (1 - fee)).toFixed(8));

  // Score
  const scorePenalty = isCod
    ? parseFloat(order.score_penalty_cash_cancel_accepted_snapshot  || 0)
    : parseFloat(order.score_penalty_domi_cancel_accepted_snapshot  || 0);

  // COD: deuda total a cobrar al cliente
  const debtTotal = isCod
    ? parseFloat((
        storeCommissionRefund + driverCommissionRefund
        + driverDeliveryPay + storeProductPayout
      ).toFixed(8))
    : 0;

  return {
    storeCommissionRefund,
    driverCommissionRefund,
    driverDeliveryPay,
    clientDeliveryRefund,
    storeProductPayout,
    clientProductRefund,
    sysRetain,
    scorePenalty,
    debtTotal,
    hasDriver,
    isCod,
  };
}

/**
 * Estado: listo_despacho
 * Misma lógica que forPreparation pero con tasas de productos de dispatch.
 * Distribución: 95% sede / 4% cliente / 1% sistema.
 */
function forDispatch(order) {
  const isCod  = order.payment_method_customer === 'cash_cod';
  const fee    = isCod ? parseFloat(order.platform_processing_fee_rate_snapshot || 0) : 0;

  const storeCommissionRefund  = parseFloat(order.store_commission_advance || 0)
    * parseFloat(order.store_commission_refund_rate_snapshot || 0);
  const driverCommissionRefund = parseFloat(order.driver_commission_advance || 0)
    * parseFloat(order.driver_commission_refund_rate_snapshot || 0);

  const domiCost  = parseFloat(order.driver_domi_cost || 0);
  const splitRate = parseFloat(order.customer_cancel_driver_delivery_pct_dispatch_rate_snapshot || 0.5);
  const driverDeliveryPay    = parseFloat((domiCost * splitRate      * (1 - fee)).toFixed(8));
  const clientDeliveryRefund = parseFloat((domiCost * (1 - splitRate) * (1 - fee)).toFixed(8));

  // Derivar costo de productos en DOMIs
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const productsCost = orderTotalDomi;

  const storeRate    = parseFloat(order.customer_cancel_store_refund_dispatch_rate_snapshot    || 0.95);
  const clientRate   = parseFloat(order.customer_cancel_client_refund_dispatch_rate_snapshot   || 0.04);
  const sysRate      = parseFloat(order.customer_cancel_sys_retain_dispatch_rate_snapshot      || 0.01);

  const storeProductPayout  = parseFloat((productsCost * storeRate  * (1 - fee)).toFixed(8));
  const clientProductRefund = parseFloat((productsCost * clientRate * (1 - fee)).toFixed(8));
  const sysRetain           = parseFloat((productsCost * sysRate    * (1 - fee)).toFixed(8));

  const scorePenalty = isCod
    ? parseFloat(order.score_penalty_cash_cancel_dispatch_snapshot || 0)
    : parseFloat(order.score_penalty_domi_cancel_dispatch_snapshot || 0);

  const debtTotal = isCod
    ? parseFloat((
        storeCommissionRefund + driverCommissionRefund
        + driverDeliveryPay + storeProductPayout
      ).toFixed(8))
    : 0;

  return {
    storeCommissionRefund,
    driverCommissionRefund,
    driverDeliveryPay,
    clientDeliveryRefund,
    storeProductPayout,
    clientProductRefund,
    sysRetain,
    scorePenalty,
    debtTotal,
    isCod,
  };
}

/**
 * Estado: en_camino / en_rescate
 * REGLA: El conductor ya recogió el pedido → cobra el 100% del domicilio.
 *        El cliente pierde el domicilio completo (no hay devolución).
 * COD:   El conductor también pagó los productos en efectivo → se le reembolsa.
 * DOMI:  Los productos del locked_balance van a la sede (conductor devuelve físicamente).
 *
 * Si hay rescatista activo (rescue_driver_id IS NOT NULL),
 * el pago del domicilio va al rescatista, no al conductor original.
 */
function forTransit(order) {
  const isCod = order.payment_method_customer === 'cash_cod';
  const fee   = isCod ? parseFloat(order.platform_processing_fee_rate_snapshot || 0) : 0;
  const hasRescuer = !!order.rescue_driver_id;

  const storeCommissionRefund  = parseFloat(order.store_commission_advance || 0)
    * parseFloat(order.store_commission_refund_rate_snapshot || 0);
  const driverCommissionRefund = parseFloat(order.driver_commission_advance || 0)
    * parseFloat(order.driver_commission_refund_rate_snapshot || 0);

  // 100% del domicilio → al conductor activo (original o rescatista)
  const domiCost = parseFloat(order.driver_domi_cost || 0);
  const deliveryCompensation = parseFloat((domiCost * (1 - fee)).toFixed(8));

  // Derivar costo de productos en DOMIs
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const productsCost = orderTotalDomi;

  // COD: conductor pagó en efectivo a la sede → se le reembolsa el valor del producto
  const productsToDriver = isCod
    ? parseFloat((productsCost * (1 - fee)).toFixed(8))
    : 0;
  // DOMI: productos del locked_balance van a la sede (100%)
  const productsToStore = isCod ? 0 : productsCost;

  const scorePenalty = isCod
    ? parseFloat(order.score_penalty_cash_cancel_in_transit_snapshot || 0)
    : parseFloat(order.score_penalty_domi_cancel_in_transit_snapshot || 0);

  // COD: deuda total a cobrar al cliente
  const debtTotal = isCod
    ? parseFloat((
        storeCommissionRefund + driverCommissionRefund
        + deliveryCompensation + productsToDriver
      ).toFixed(8))
    : 0;

  return {
    storeCommissionRefund,
    driverCommissionRefund,
    deliveryCompensation,  // 100% del domicilio → va al conductor activo (o rescatista)
    productsToDriver,      // COD: reembolso del valor del producto al conductor
    productsToStore,       // DOMI: productos van a la sede
    scorePenalty,
    debtTotal,
    hasRescuer,            // si true, el handler redirige el domicilio a rescue_driver_id
    isCod,
  };
}

module.exports = { forPendiente, forPreparation, forDispatch, forTransit };

