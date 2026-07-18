// fsm/handlers/driver/cancelTransit.js
// Escenario: El repartidor abandona voluntariamente el pedido durante 'en_camino'.
// Esto provoca la cancelación definitiva de la orden.
//
// PIPELINE:
//   1. PENALIZAR PRIORIDAD → addPriorityPenalty (+3 pts)
//   2. RECUPERAR / DISTRIBUIR:
//      - COD:
//        - Cliente recibe 2% del producto en DOMIs como indemnización.
//        - Repartidor es debitado 3% del producto (2% cliente, 1% sistema).
//        - Si falta saldo, se genera deuda contra el repartidor a favor del sistema.
//      - DOMI:
//        - Cliente recibe 100% de reembolso de locked_balance.
//        - Repartidor es debitado 100% del valor de los productos para compensar a la sede.
//        - Si falta saldo, se genera deuda del repartidor a favor de la sede.
//
// Ver MATRIZ_CANCELACIONES_REPARTIDOR.md — columna 'COD en_camino' y 'DOMI en_camino'.

const calc       = require('../../calculators/driverCancel.calc');
const wallet_ops = require('../../ops/wallet.ops');
const driver_ops = require('../../ops/driver.ops');
const debt_ops   = require('../../ops/debt.ops');

async function cancelTransit({ order, conn }) {
  const amounts = calc.forTransit(order);
  const meta    = { referenceId: order.id };
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // 1. PENALIZAR CONTADOR DE PRIORIDAD
  await driver_ops.addPriorityPenalty(order, amounts.priorityPenaltyPoints, conn);

  // 2. RECUPERAR / DISTRIBUIR
  if (amounts.isCod) {
    // COD: Repartidor es debitado 3% del producto
    const recovered = await driver_ops.tryDebitDriver(order, amounts.driverProductPenalty, conn);
    const remaining = parseFloat((amounts.driverProductPenalty - recovered).toFixed(8));

    // Acreditar 2% al cliente como indemnización en DOMIs
    if (amounts.productsToClient > 0) {
      await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.productsToClient, conn, {
        ...meta, notes: `Indemnización cliente COD (2%) por abandono de repartidor #${order.id}`
      });
    }

    // Si el repartidor no tiene saldo, el sistema asume temporalmente el pago del bono
    // y crea una Compensación Automática contra el repartidor a favor del sistema
    if (remaining > 0) {
      const { ownerId } = driver_ops.resolveDriverWallet(order);
      await debt_ops.create({
        orderId: order.id,
        debtorId: ownerId,
        beneficiaryType: 'system',
        beneficiaryId: null,
        amountDomis: remaining,
        fiatPeg: fiatPeg
      }, conn);
    }

  } else {
    // DOMI: Reembolsar 100% al cliente desde el locked_balance
    const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
    const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
    const domiCost = parseFloat(order.driver_domi_cost || 0);
    const totalToDebit = parseFloat((orderTotalDomi + domiCost).toFixed(8));
    await wallet_ops.debitLocked(order.customer_user_id, totalToDebit, conn);
    await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.productsToClient, conn, {
      ...meta, notes: `Reembolso completo DOMI por abandono de repartidor en ruta #${order.id}`
    });

    // Conductor compensa 100% a la sede por productos
    const recovered = await driver_ops.tryDebitDriver(order, amounts.driverProductPenalty, conn);
    const remaining = parseFloat((amounts.driverProductPenalty - recovered).toFixed(8));

    if (recovered > 0) {
      await wallet_ops.creditAvailableStore(order.store_id, recovered, conn, {
        ...meta, notes: `Compensación productos por abandono de repartidor #${order.id}`
      });
    }

    if (remaining > 0) {
      const { ownerId } = driver_ops.resolveDriverWallet(order);
      await debt_ops.create({
        orderId: order.id,
        debtorId: ownerId,
        beneficiaryType: 'store',
        beneficiaryId: order.store_id,
        amountDomis: remaining,
        fiatPeg: fiatPeg
      }, conn);
    }
  }

  // Marcar la hora de cancelación de la orden
  await conn.execute(
    'UPDATE orders SET cancelled_at = NOW(6) WHERE id = ?',
    [order.id]
  );

  return { amounts };
}

module.exports = cancelTransit;
