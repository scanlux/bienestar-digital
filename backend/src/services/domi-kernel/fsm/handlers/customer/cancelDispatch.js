// fsm/handlers/customer/cancelDispatch.js
// Escenario: Cliente cancela en listo_despacho.
//
// Ver MATRIZ_CANCELACIONES.md — columna 'listo_despacho'.

const calc       = require('../../calculators/customerCancel.calc');
const wallet_ops = require('../../ops/wallet.ops');
const driver_ops = require('../../ops/driver.ops');
const debt_ops   = require('../../ops/debt.ops');

async function cancelDispatch({ order, conn, meta: fsmMeta }) {
  const amounts = calc.forDispatch(order, fsmMeta);
  const meta    = { referenceId: order.id };
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // 1. PENALIZAR SCORE
  await wallet_ops.deductScore(order.customer_user_id, amounts.scorePenalty, conn);

  // 2. RECUPERAR / DISTRIBUIR
  if (amounts.isCod) {
    const recovered = await wallet_ops.tryDebitCustody(order.customer_user_id, amounts.debtTotal, conn);
    const remaining = parseFloat((amounts.debtTotal - recovered).toFixed(8));

    // (1) Comisiones
    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeCommissionRefund, conn, {
      ...meta, notes: `Anticipo comisión sede — dispatch cancel pedido #${order.id}`
    });
    await driver_ops.creditDriver(order, amounts.driverCommissionRefund, conn, {
      ...meta, notes: `Anticipo comisión conductor — dispatch cancel pedido #${order.id}`
    });
    // (2) 50% domicilio al conductor
    await driver_ops.creditDriver(order, amounts.driverDeliveryPay, conn, {
      ...meta, notes: `50% domicilio conductor — dispatch cancel pedido #${order.id}`
    });
    // (3) Productos a la sede (95%)
    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeProductPayout, conn, {
      ...meta, notes: `Productos (95%) sede — dispatch cancel pedido #${order.id}`
    });

    if (remaining > 0) {
      await debt_ops.create({
        orderId: order.id,
        debtorId: order.customer_user_id,
        beneficiaryType: 'system',
        beneficiaryId: null,
        amountDomis: remaining,
        fiatPeg: fiatPeg
      }, conn);
    }

  } else {
    // DOMI: redistribuir locked_balance
    const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
    const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
    const domiCost = parseFloat(order.driver_domi_cost || 0);
    const totalToDebit = parseFloat((orderTotalDomi + domiCost).toFixed(8));
    await wallet_ops.debitLocked(order.customer_user_id, totalToDebit, conn);

    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeCommissionRefund, conn,
      { ...meta, notes: `Comisión sede DOMI dispatch #${order.id}` });
    await driver_ops.creditDriver(order, amounts.driverCommissionRefund, conn,
      { ...meta, notes: `Comisión conductor DOMI dispatch #${order.id}` });
    await driver_ops.creditDriver(order, amounts.driverDeliveryPay, conn,
      { ...meta, notes: `50% domicilio DOMI dispatch #${order.id}` });
    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeProductPayout, conn,
      { ...meta, notes: `Productos 95% DOMI dispatch #${order.id}` });
    await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.clientDeliveryRefund + amounts.clientProductRefund, conn,
      { ...meta, notes: `Devolución parcial cliente DOMI dispatch #${order.id}` });
  }

  return { amounts };
}

module.exports = cancelDispatch;
