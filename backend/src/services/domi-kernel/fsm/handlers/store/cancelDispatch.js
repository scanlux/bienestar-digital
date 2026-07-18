// fsm/handlers/store/cancelDispatch.js
// Escenario: La sede cancela la orden durante 'listo_despacho'.
//
// PIPELINE:
//   1. PENALIZAR CONFIABILIDAD SEDE → addReliabilityPenalty (+2 pts)
//   2. COMPENSAR CONDUCTOR (desde sistema) → creditAvailableUser
//   3. COMPENSAR CLIENTE (bono de fidelización debitado a la sede)
//   4. REEMBOLSAR CLIENTE (DOMI: locked_balance completo; COD: nada).
//
// Ver MATRIZ_CANCELACIONES_SEDE.md — listo_despacho.

const calc       = require('../../calculators/storeCancel.calc');
const wallet_ops = require('../../ops/wallet.ops');
const driver_ops = require('../../ops/driver.ops');
const store_ops  = require('../../ops/store.ops');
const debt_ops   = require('../../ops/debt.ops');

async function cancelDispatch({ order, conn }) {
  const amounts = calc.forDispatch(order);
  const meta    = { referenceId: order.id };
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // 1. PENALIZAR CONFIABILIDAD SEDE
  await store_ops.addReliabilityPenalty(order.store_id, amounts.storePenaltyPoints, conn);

  // 2. COMPENSAR CONDUCTOR ASIGNADO (desde el balance de utilidad del sistema)
  if (amounts.driverCommissionFromSystem > 0) {
    await wallet_ops.creditFromSystem(order.driver_user_id, amounts.driverCommissionFromSystem, conn, {
      ...meta, notes: `Comisión conductor cubierta por sistema por cancelación de sede en despacho #${order.id}`
    });
  }
  if (amounts.driverDeliveryFromSystem > 0) {
    await wallet_ops.creditFromSystem(order.driver_user_id, amounts.driverDeliveryFromSystem, conn, {
      ...meta, notes: `Compensación 50% domicilio conductor cubierta por sistema por cancelación de sede en despacho #${order.id}`
    });
  }

  // 3. COMPENSAR CLIENTE (bono de fidelización)
  if (amounts.clientIndemnity > 0) {
    // Intentar debitar de la sede
    const recovered = await wallet_ops.tryDebitStore(order.store_id, amounts.clientIndemnity, conn);
    const remaining = parseFloat((amounts.clientIndemnity - recovered).toFixed(8));

    // Acreditar el bono completo al cliente
    await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.clientIndemnity, conn, {
      ...meta, notes: `Bono de fidelización por cancelación de la sede en despacho #${order.id}`
    });

    // Si la sede no tiene saldo, se genera una deuda a favor del sistema
    if (remaining > 0) {
      await debt_ops.createStoreDebt({
        orderId: order.id,
        storeId: order.store_id,
        beneficiaryType: 'system',
        beneficiaryId: null,
        amountDomis: remaining,
        fiatPeg: fiatPeg
      }, conn);
    }
  }

  // 4. REEMBOLSAR CLIENTE
  if (!amounts.isCod && amounts.lockedBalance > 0) {
    await wallet_ops.debitLocked(order.customer_user_id, amounts.lockedBalance, conn);
    await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.lockedBalance, conn, {
      ...meta, notes: `Reembolso 100% locked_balance al cliente por cancelación de sede en despacho #${order.id}`
    });
  }

  return { amounts };
}

module.exports = cancelDispatch;
