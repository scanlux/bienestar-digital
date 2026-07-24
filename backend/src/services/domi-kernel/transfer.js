const db = require('../../config/db');
const protocol = require('./protocol');
const wallets = require('./wallets');
const ledger = require('./ledger');
const domiRedis = require('../domiRedis');
const domiCashbackEngine = require('../domiCashbackEngine');
const { BusinessError } = require('../../utils/errors');

async function settleOrderPayment(conn, order, costDetails) {
  const clientWallet = await wallets.getUserWallet(conn, order.customer_user_id);
  const storeWallet = await wallets.getStoreWallet(conn, order.store_id);

  const orderTotalDomi = parseFloat((parseFloat(order.total_cop) / costDetails.fiat_peg_used).toFixed(8));
  const deliveryDomi = parseFloat(order.driver_domi_cost || 0);
  const customerTotalDomi = parseFloat((orderTotalDomi + deliveryDomi).toFixed(8));

  // Validar saldo bloqueado
  if (parseFloat(clientWallet.locked_balance) < customerTotalDomi) {
    throw new BusinessError('El saldo bloqueado del cliente es insuficiente para completar el pago del pedido.', 400);
  }

  // Debitar del saldo bloqueado del cliente
  await conn.query(
    'UPDATE wallets SET locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?',
    [customerTotalDomi, clientWallet.id]
  );

  // Acreditar productos a la tienda
  await conn.query(
    'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
    [orderTotalDomi, storeWallet.id]
  );

  // Acreditar envío al conductor (o a su empresa de reparto)
  let driverWallet = null;
  let driverOwnerType = 'user';
  let driverOwnerId = order.driver_user_id;

  if (order.delivery_company_id) {
    driverWallet = await wallets.getDeliveryCompanyWallet(conn, order.delivery_company_id);
    driverOwnerType = 'delivery_company';
    driverOwnerId = order.delivery_company_id;
  } else if (order.driver_user_id) {
    driverWallet = await wallets.getUserWallet(conn, order.driver_user_id);
  }

  if (deliveryDomi > 0 && driverWallet) {
    await conn.query(
      'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
      [deliveryDomi, driverWallet.id]
    );
  }

  // Registrar en el ledger
  const token = await protocol.getTokenRegistry(conn);
  const rules = await protocol.getProtocolRules(conn);
  
  // Ledger de pago a tienda
  await ledger.appendLedger(conn, {
    txType: 'transfer',
    fromWalletId: clientWallet.id,
    toWalletId: storeWallet.id,
    amountDomis: orderTotalDomi,
    amountFiatCop: parseFloat(order.total_cop),
    referenceType: 'order',
    referenceId: order.id,
    protocolSnapshot: { token, rules },
    notes: `Pago de productos de pedido #${order.id} a tienda`
  });

  // Ledger de pago de envío
  if (deliveryDomi > 0 && driverWallet) {
    await ledger.appendLedger(conn, {
      txType: 'transfer',
      fromWalletId: clientWallet.id,
      toWalletId: driverWallet.id,
      amountDomis: deliveryDomi,
      amountFiatCop: deliveryDomi * costDetails.fiat_peg_used,
      referenceType: 'order',
      referenceId: order.id,
      protocolSnapshot: { token, rules },
      notes: `Pago de envío de pedido #${order.id} a repartidor/empresa`
    });
  }

  // Ejecutar ruleta de cashback para el cliente usando Score
  const score = await domiCashbackEngine.resolveScore(order.customer_user_id, conn);
  const cashback = await domiCashbackEngine.rollCashback(
    order.customer_user_id,
    costDetails.max_customer_cashback_domis,
    score,
    order.id,
    conn
  );

  if (cashback > 0) {
    await domiCashbackEngine.awardCashback(order.customer_user_id, cashback, order.id, conn);
    // +10 puntos de Score totales (5 por comprar y 5 por comprar con DOMIs)
    const scoreDelta = (parseInt(rules.score_earned_on_purchase) || 5) + (parseInt(rules.score_earned_on_domi_purchase) || 5);
    await domiCashbackEngine.incrementScore(order.customer_user_id, scoreDelta, conn);
  } else {
    // Si no hubo cashback, igual gana el Score por compra
    const scoreDelta = (parseInt(rules.score_earned_on_purchase) || 5) + (parseInt(rules.score_earned_on_domi_purchase) || 5);
    await domiCashbackEngine.incrementScore(order.customer_user_id, scoreDelta, conn);
  }

  return { 
    cashback, 
    orderTotalDomi, 
    storeId: order.store_id, 
    driverOwnerType, 
    driverOwnerId, 
    deliveryDomi,
    hasDriverPayment: (deliveryDomi > 0 && driverWallet) ? true : false
  };
}

module.exports = {
  settleOrderPayment
};
