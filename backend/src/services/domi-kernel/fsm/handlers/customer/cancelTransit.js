// fsm/handlers/customer/cancelTransit.js
// Escenario: Cliente cancela en en_camino o en_rescate.
//
// Ver MATRIZ_CANCELACIONES.md — columna 'en_camino'.
// Ver MATRIZ_CANCELACIONES.md — NOTE de en_rescate.

const calc       = require('../../calculators/customerCancel.calc');
const wallet_ops = require('../../ops/wallet.ops');
const driver_ops = require('../../ops/driver.ops');
const debt_ops   = require('../../ops/debt.ops');

async function cancelTransit({ order, conn, meta: fsmMeta }) {
  const amounts = calc.forTransit(order, fsmMeta);
  const meta    = { referenceId: order.id };
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // 1. PENALIZAR SCORE
  await wallet_ops.deductScore(order.customer_user_id, amounts.scorePenalty, conn);

  // 2. RECUPERAR / DISTRIBUIR
  if (amounts.isCod) {
    const recovered = await wallet_ops.tryDebitCustody(order.customer_user_id, amounts.debtTotal, conn);
    const remaining = parseFloat((amounts.debtTotal - recovered).toFixed(8));

    // (1) Comisiones a sede y conductor original
    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeCommissionRefund, conn,
      { ...meta, notes: `Anticipo comisión sede — transit cancel #${order.id}` });
    await driver_ops.creditDriver(order, amounts.driverCommissionRefund, conn,
      { ...meta, notes: `Anticipo comisión conductor — transit cancel #${order.id}` });

    // (2) 100% del domicilio al conductor activo (original o rescatista)
    if (amounts.hasRescuer) {
      // Hay rescatista activo → le pagamos a él el domicilio
      await driver_ops.creditRescuer(order, amounts.deliveryCompensation, conn,
        { ...meta, notes: `100% domicilio rescatista activo — transit cancel #${order.id}` });
    } else {
      // Sin rescatista → conductor original
      await driver_ops.creditDriver(order, amounts.deliveryCompensation, conn,
        { ...meta, notes: `100% domicilio conductor — transit cancel #${order.id}` });
    }

    // (3) Productos al conductor (COD: el conductor pagó en efectivo a la sede)
    if (amounts.productsToDriver > 0) {
      if (amounts.hasRescuer) {
        await driver_ops.creditRescuer(order, amounts.productsToDriver, conn,
          { ...meta, notes: `Reembolso productos rescatista — transit cancel #${order.id}` });
      } else {
        await driver_ops.creditDriver(order, amounts.productsToDriver, conn,
          { ...meta, notes: `Reembolso productos conductor — transit cancel #${order.id}` });
      }
    }

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

    // Comisiones
    await wallet_ops.creditAvailableStore(order.store_id, amounts.storeCommissionRefund, conn,
      { ...meta, notes: `Comisión sede DOMI transit #${order.id}` });
    await driver_ops.creditDriver(order, amounts.driverCommissionRefund, conn,
      { ...meta, notes: `Comisión conductor DOMI transit #${order.id}` });

    // 100% domicilio → conductor activo (original o rescatista)
    if (amounts.hasRescuer) {
      await driver_ops.creditRescuer(order, amounts.deliveryCompensation, conn,
        { ...meta, notes: `100% domicilio rescatista DOMI transit #${order.id}` });
    } else {
      await driver_ops.creditDriver(order, amounts.deliveryCompensation, conn,
        { ...meta, notes: `100% domicilio conductor DOMI transit #${order.id}` });
    }

    // DOMI en_camino: productos van a la sede (conductor devuelve físicamente)
    if (amounts.productsToStore > 0) {
      await wallet_ops.creditAvailableStore(order.store_id, amounts.productsToStore, conn,
        { ...meta, notes: `Productos (100%) sede DOMI transit #${order.id}` });
    }
  }

  return { amounts };
}

module.exports = cancelTransit;
