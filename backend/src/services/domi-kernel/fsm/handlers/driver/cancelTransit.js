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

async function cancelTransit({ order, conn, meta }) {
  const metaObj = { referenceId: order.id };
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // 1. Obtener todas las sub-órdenes del grupo si aplica
  let ordersToProcess = [order];
  if (order.group_order_id) {
    const [groupOrders] = await conn.query('SELECT * FROM orders WHERE group_order_id = ? FOR UPDATE', [order.group_order_id]);
    ordersToProcess = groupOrders;
  }

  const firstOrder = ordersToProcess[0];
  const priorityPoints = parseFloat(firstOrder.driver_penalty_points_transit_snapshot || 3);

  // 2. Penalizar contador de prioridad del conductor una sola vez por el grupo
  if (!meta || !meta.skipPriorityPenalty) {
    await driver_ops.addPriorityPenalty(firstOrder, priorityPoints, conn);
  }

  // 3. Procesar cada orden en el grupo
  for (const ord of ordersToProcess) {
    const amounts = calc.forTransit(ord);

    if (amounts.isCod) {
      // COD: Repartidor es debitado 3% del producto
      const recovered = await driver_ops.tryDebitDriver(ord, amounts.driverProductPenalty, conn);
      const remaining = parseFloat((amounts.driverProductPenalty - recovered).toFixed(8));

      // Acreditar 2% al cliente como indemnización en DOMIs
      if (amounts.productsToClient > 0) {
        await wallet_ops.creditAvailableUser(ord.customer_user_id, amounts.productsToClient, conn, {
          referenceId: ord.id, notes: `Indemnización cliente COD (2%) por abandono de repartidor #${ord.id}`
        });
      }

      if (remaining > 0) {
        const { ownerId } = driver_ops.resolveDriverWallet(ord);
        await debt_ops.create({
          orderId: ord.id,
          debtorId: ownerId,
          beneficiaryType: 'system',
          beneficiaryId: null,
          amountDomis: remaining,
          fiatPeg: fiatPeg
        }, conn);
      }
    } else {
      // DOMI: Reembolsar 100% al cliente desde el locked_balance (productos + domicilio)
      const peg = parseFloat(ord.fiat_peg_snapshot || 1.0);
      const orderTotalDomi = parseFloat((parseFloat(ord.total_cop || 0) / peg).toFixed(8));
      const domiCost = parseFloat(ord.driver_domi_cost || 0);
      const totalToDebit = parseFloat((orderTotalDomi + domiCost).toFixed(8));
      
      await wallet_ops.debitLocked(ord.customer_user_id, totalToDebit, conn);
      await wallet_ops.creditAvailableUser(ord.customer_user_id, totalToDebit, conn, {
        referenceId: ord.id, notes: `Reembolso completo DOMI por abandono de repartidor en ruta #${ord.id}`
      });

      // Conductor compensa 100% a la sede por productos
      const recovered = await driver_ops.tryDebitDriver(ord, amounts.driverProductPenalty, conn);
      const remaining = parseFloat((amounts.driverProductPenalty - recovered).toFixed(8));

      if (recovered > 0) {
        await wallet_ops.creditAvailableStore(ord.store_id, recovered, conn, {
          referenceId: ord.id, notes: `Compensación productos por abandono de repartidor #${ord.id}`
        });
      }

      if (remaining > 0) {
        const { ownerId } = driver_ops.resolveDriverWallet(ord);
        await debt_ops.create({
          orderId: ord.id,
          debtorId: ownerId,
          beneficiaryType: 'store',
          beneficiaryId: ord.store_id,
          amountDomis: remaining,
          fiatPeg: fiatPeg
        }, conn);
      }
    }

    // Marcar la orden como cancelada
    await conn.execute(
      "UPDATE orders SET status = 'cancelado', cancelled_at = NOW(6) WHERE id = ?",
      [ord.id]
    );
  }

  return { amounts: calc.forTransit(order) };
}

module.exports = cancelTransit;
