// fsm/handlers/store/cancelPreparation.js
// Escenario: La sede cancela la orden durante pendiente / aceptado / preparando / listo.
// Mismo handler para estos estados.
//
// PIPELINE:
//   1. PENALIZAR CONFIABILIDAD SEDE → addReliabilityPenalty
//   2. COMPENSAR CONDUCTOR (desde sistema) → creditAvailableUser
//   3. COMPENSAR CLIENTE (bono de fidelización debitado a la sede)
//      - Debitar store. Si falta, generar deuda en domi_store_debts.
//   4. REEMBOLSAR CLIENTE (DOMI: locked_balance completo; COD: nada).
//
// Ver MATRIZ_CANCELACIONES_SEDE.md — preparando / listo.

const calc       = require('../../calculators/storeCancel.calc');
const wallet_ops = require('../../ops/wallet.ops');
const driver_ops = require('../../ops/driver.ops');
const store_ops  = require('../../ops/store.ops');
const debt_ops   = require('../../ops/debt.ops');

async function cancelPreparation({ order, conn }) {
  const amounts = calc.forPreparation(order);
  const meta    = { referenceId: order.id };
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // 1. PENALIZAR CONFIABILIDAD SEDE
  await store_ops.addReliabilityPenalty(order.store_id, amounts.storePenaltyPoints, conn);

  // 2. COMPENSAR CONDUCTOR ASIGNADO (desde el balance de utilidad del sistema)
  if (amounts.hasDriver) {
    // Reembolso 90% de comisión
    if (amounts.driverCommissionFromSystem > 0) {
      await wallet_ops.creditFromSystem(order.driver_user_id, amounts.driverCommissionFromSystem, conn, {
        ...meta, notes: `Comisión conductor cubierta por sistema por cancelación de sede #${order.id}`
      });
    }
    // Compensación 50% domicilio
    if (amounts.driverDeliveryFromSystem > 0) {
      await wallet_ops.creditFromSystem(order.driver_user_id, amounts.driverDeliveryFromSystem, conn, {
        ...meta, notes: `Compensación 50% domicilio conductor cubierta por sistema por cancelación de sede #${order.id}`
      });
    }
  }

  // 3. COMPENSAR CLIENTE (bono de fidelización)
  if (amounts.clientIndemnity > 0) {
    // Intentar debitar de la sede
    const recovered = await wallet_ops.tryDebitStore(order.store_id, amounts.clientIndemnity, conn);
    const remaining = parseFloat((amounts.clientIndemnity - recovered).toFixed(8));

    // Acreditar el bono completo al cliente
    await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.clientIndemnity, conn, {
      ...meta, notes: `Bono de fidelización por cancelación de la sede #${order.id}`
    });

    // Si la sede no tiene saldo, se genera una deuda a favor del sistema (que cubrió el bono)
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
    // DOMI: reembolsar locked_balance al disponible del cliente
    await wallet_ops.debitLocked(order.customer_user_id, amounts.lockedBalance, conn);
    await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.lockedBalance, conn, {
      ...meta, notes: `Reembolso 100% locked_balance al cliente por cancelación de sede #${order.id}`
    });
  }

  return { amounts };
}

module.exports = cancelPreparation;
