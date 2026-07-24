// fsm/handlers/customer/cancelPreparation.js
// Escenario: Cliente cancela en aceptado / preparando / listo.
// Mismo handler para los 3 estados.
//
// PIPELINE:
//   1. PENALIZAR SCORE → deductScore
//   2. RECUPERAR / DISTRIBUIR → COD o DOMI
//   3. DEUDA (COD) → domi_order_debts si falta saldo

const calc       = require('../../calculators/customerCancel.calc');
const wallet_ops = require('../../ops/wallet.ops');
const driver_ops = require('../../ops/driver.ops');
const debt_ops   = require('../../ops/debt.ops');

async function cancelPreparation({ order, conn, meta: fsmMeta }) {
  const amounts = calc.forPreparation(order, fsmMeta);
  const meta    = { referenceId: order.id };
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // 1. PENALIZAR SCORE
  await wallet_ops.deductScore(order.customer_user_id, amounts.scorePenalty, conn);

  // 2. RECUPERAR / DISTRIBUIR
  if (amounts.isCod) {
    // Intentar debitar del balance disponible del cliente
    const recovered = await wallet_ops.tryDebitCustody(order.customer_user_id, amounts.debtTotal, conn);
    const remaining = parseFloat((amounts.debtTotal - recovered).toFixed(8));

    // (1) Comisiones a sede y conductor
    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeCommissionRefund, conn, {
      ...meta, notes: `Reembolso anticipo comisión sede — pedido #${order.id} cancelado`
    });
    if (amounts.hasDriver && amounts.driverCommissionRefund > 0) {
      await driver_ops.creditDriver(order, amounts.driverCommissionRefund, conn, {
        ...meta, notes: `Reembolso anticipo comisión conductor — pedido #${order.id} cancelado`
      });
    }
    // (2) 50% del domicilio al conductor (si asignado)
    if (amounts.hasDriver && amounts.driverDeliveryPay > 0) {
      await driver_ops.creditDriver(order, amounts.driverDeliveryPay, conn, {
        ...meta, notes: `Compensación 50% domicilio — pedido #${order.id} cancelado`
      });
    }
    // (3) Productos a la sede (90%)
    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeProductPayout, conn, {
      ...meta, notes: `Pago productos (90%) sede — pedido #${order.id} cancelado`
    });

    // 3. DEUDA (si no alcanzó el saldo recuperado)
    if (remaining > 0) {
      const { ownerType, ownerId } = order.driver_user_id 
        ? driver_ops.resolveDriverWallet(order) 
        : { ownerType: 'user', ownerId: 1 };

      await debt_ops.create({
        orderId: order.id,
        debtorId: order.customer_user_id,
        beneficiaryType: 'system',
        beneficiaryId: null,
        amountDomis: remaining,
        fiatPeg: fiatPeg,
        metadata: {
          store_id: order.store_id,
          driver_owner_type: ownerType,
          driver_owner_id: ownerId,
          storeAdvanceRemaining: 0,
          driverAdvanceRemaining: 0,
          storeShare: amounts.storeProductPayout || 0,
          deliveryShare: amounts.driverDeliveryPay || 0
        }
      }, conn);
    }

  } else {
    // DOMI: redistribuir desde locked_balance
    const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
    const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
    const domiCost = parseFloat(order.driver_domi_cost || 0);
    const totalToDebit = parseFloat((orderTotalDomi + domiCost).toFixed(8));
    await wallet_ops.debitLocked(order.customer_user_id, totalToDebit, conn);

    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeCommissionRefund, conn, {
      ...meta, notes: `Reembolso anticipo comisión sede DOMI — pedido #${order.id}`
    });
    if (amounts.hasDriver && amounts.driverCommissionRefund > 0) {
      await driver_ops.creditDriver(order, amounts.driverCommissionRefund, conn, {
        ...meta, notes: `Reembolso anticipo comisión conductor DOMI — pedido #${order.id}`
      });
    }
    if (amounts.hasDriver && amounts.driverDeliveryPay > 0) {
      await driver_ops.creditDriver(order, amounts.driverDeliveryPay, conn, {
        ...meta, notes: `Compensación 50% domicilio DOMI — pedido #${order.id}`
      });
    }
    // Productos: 90% sede / 7% cliente / 3% sistema
    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeProductPayout, conn, {
      ...meta, notes: `Pago productos (90%) sede DOMI — pedido #${order.id}`
    });
    await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.clientDeliveryRefund + amounts.clientProductRefund, conn, {
      ...meta, notes: `Devolución parcial cliente DOMI — pedido #${order.id}`
    });
  }

  return { amounts };
}

module.exports = cancelPreparation;
