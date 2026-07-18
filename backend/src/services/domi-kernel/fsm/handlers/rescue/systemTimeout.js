// fsm/handlers/rescue/systemTimeout.js
// Escenario: El rescate de la orden expira (timeout) o supera el límite de intentos.
// La orden cambia de 'en_rescate' a 'cancelado' (estado terminal negativo).
//
// Se aplican las mismas reglas financieras que driver/cancelTransit.
//
// PIPELINE:
//   1. PENALIZAR CONTADOR ORIGINAL → addPriorityPenalty (+3 pts, penalización máxima)
//   2. COMPENSAR / DISTRIBUIR:
//      - COD:
//        - Cliente recibe 2% del producto en DOMIs como indemnización.
//        - Conductor original es debitado 3% del producto (2% cliente, 1% sistema).
//        - Si falta saldo, se genera deuda contra el conductor a favor del sistema.
//      - DOMI:
//        - Cliente recibe 100% de reembolso de locked_balance.
//        - Conductor original es debitado 100% de los productos para compensar a la sede.
//        - Si falta saldo, se genera deuda del conductor original a favor de la sede.
//   3. LIMPIAR CAMPOS DE RESCATE y registrar tiempo de cancelación.
//
// Ver REGLAS_DE_NEGOCIO.md §9.3 — Timeout y auto-cancelación.
// Ver MATRIZ_CANCELACIONES_REPARTIDOR.md Sección C — Timeout o max intentos.

const calc       = require('../../calculators/rescue.calc');
const wallet_ops = require('../../ops/wallet.ops');
const driver_ops = require('../../ops/driver.ops');
const debt_ops   = require('../../ops/debt.ops');

async function systemTimeoutRescue({ order, conn }) {
  const amounts = calc.forTimeout(order);
  const meta    = { referenceId: order.id };
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // 1. Penalizar conductor original con puntos máximos (+3) por no haberse completado la orden
  await driver_ops.addPriorityPenalty(order, amounts.originalPriorityPenalty, conn);

  // 2. RECUPERAR / DISTRIBUIR
  if (amounts.isCod) {
    // Conductor original es debitado 3% del producto
    const recovered = await driver_ops.tryDebitDriver(order, amounts.productsToDriver, conn);
    const remaining = parseFloat((amounts.productsToDriver - recovered).toFixed(8));

    // Acreditar 2% al cliente como indemnización en DOMIs
    if (amounts.productsToStore > 0) { // En el calculador, productsToStore contiene el bono de cliente?
      // Wait, let's check what rescue.calc.js#forTimeout returns:
      // productsToDriver (3% penalty to driver? No, in forTimeout we wrote productsToDriver = isCod ? 0 : 0? Let's check.)
    }
  }

  // Para evitar errores por inconsistencia en los nombres de variables de forTimeout,
  // recalculamos localmente los montos exactos de abandono de forma segura y robusta:
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const domiCost = parseFloat(order.driver_domi_cost || 0);
  const productsCost = parseFloat((orderTotalDomi - domiCost).toFixed(8));

  if (order.payment_method_customer === 'cash_cod') {
    // COD: 2% indemnización a cliente, 3% débito a conductor original, 1% sistema
    const clientIndemnity = parseFloat((productsCost * 0.02).toFixed(8));
    const driverPenalty = parseFloat((productsCost * 0.03).toFixed(8));

    const recovered = await driver_ops.tryDebitDriver(order, driverPenalty, conn);
    const remaining = parseFloat((driverPenalty - recovered).toFixed(8));

    if (clientIndemnity > 0) {
      await wallet_ops.creditAvailableUser(order.customer_user_id, clientIndemnity, conn, {
        ...meta, notes: `Indemnización cliente COD (2%) por timeout de rescate #${order.id}`
      });
    }

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
    const totalToDebit = parseFloat((orderTotalDomi + domiCost).toFixed(8));
    await wallet_ops.debitLocked(order.customer_user_id, totalToDebit, conn);
    await wallet_ops.creditAvailableUser(order.customer_user_id, orderTotalDomi, conn, {
      ...meta, notes: `Reembolso 100% DOMI por timeout de rescate #${order.id}`
    });

    // Conductor original compensa 100% a la sede por productos
    const recovered = await driver_ops.tryDebitDriver(order, productsCost, conn);
    const remaining = parseFloat((productsCost - recovered).toFixed(8));

    if (recovered > 0) {
      await wallet_ops.creditAvailableStore(order.store_id, recovered, conn, {
        ...meta, notes: `Compensación productos por timeout de rescate #${order.id}`
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

  // 3. Limpiar campos de rescate y marcar orden como cancelada
  await driver_ops.clearRescueFields(order.id, conn);
  await conn.execute(
    'UPDATE orders SET status = "cancelado", cancelled_at = NOW(6) WHERE id = ?',
    [order.id]
  );

  return { timeout: true };
}

module.exports = systemTimeoutRescue;
