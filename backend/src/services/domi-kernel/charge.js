const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../domiRedis');
const protocol = require('./protocol');
const wallets = require('./wallets');
const ledger = require('./ledger');

/**
 * Cobra INMEDIATAMENTE el saldo usando Redis (Write-Behind Cache).
 * Bloquea el dinero ultrarrápido y encola el cobro para MariaDB.
 */
async function chargeForOrder(orderId, storeId, driverUserId, storeCost, driverCost) {
  // 1. Obtener regla del margen mínimo de saldo del repartidor de protocol_rules
  const conn = await db.getConnection();
  let minDomiBalanceDriver = 0.75;
  try {
    const rules = await protocol.getProtocolRules(conn);
    const token = await protocol.getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);

    if (rules && rules.min_domi_balance_driver !== undefined && rules.min_domi_balance_driver !== null) {
      minDomiBalanceDriver = parseFloat(rules.min_domi_balance_driver);
    }

    // Calcular las comisiones en DOMIs usando el peg actual
    const storeCostDomi = parseFloat((parseFloat(rules.store_fixed_fee_cop) / fiatPeg).toFixed(8));
    const driverCostDomi = parseFloat((parseFloat(rules.driver_fixed_fee_cop) / fiatPeg).toFixed(8));

    storeCost = (storeCost > 0 || storeCost === undefined) ? storeCostDomi : 0;
    driverCost = (driverCost > 0 || driverCost === undefined) ? driverCostDomi : 0;
  } finally {
    conn.release();
  }

  // 2. Asegurar que los saldos están en caché (evita fallos de lectura en Lua)
  const [storeRows] = await db.query('SELECT usuario_id FROM stores WHERE id = ?', [storeId]);
  const storeUserId = storeRows[0]?.usuario_id;
  if (!storeUserId) {
    throw new Error(`DOMI: Sede (storeId: ${storeId}) no posee administrador único.`);
  }

  await domiRedis.getWalletBalance('user', storeUserId);
  if (driverUserId) {
    await domiRedis.getWalletBalance('user', driverUserId);
  }

  // 3. Ejecutar descuento atómico usando un script de Lua (previene doble gasto y race conditions)
  const storeKey = `domi:balance:user:${storeUserId}`;
  const driverKey = driverUserId ? `domi:balance:user:${driverUserId}` : 'domi:balance:user:none';

  const luaScript = `
    local storeKey = KEYS[1]
    local driverKey = KEYS[2]
    local storeCost = tonumber(ARGV[1])
    local driverCost = tonumber(ARGV[2])
    local minDriverBal = tonumber(ARGV[3])

    local storeBal = tonumber(redis.call('GET', storeKey) or '0')
    local driverBal = 0
    if driverKey ~= 'domi:balance:user:none' then
      driverBal = tonumber(redis.call('GET', driverKey) or '0')
    end

    if storeBal < storeCost then
      return {0, 'INSUFFICIENT_STORE_BALANCE', tostring(storeBal)}
    end
    if driverKey ~= 'domi:balance:user:none' and driverCost > 0 and driverBal < minDriverBal then
      return {0, 'INSUFFICIENT_DRIVER_MARGIN', tostring(driverBal)}
    end

    local newStore = tonumber(string.format("%.8f", storeBal - storeCost))
    local newDriver = driverBal
    if driverKey ~= 'domi:balance:user:none' and driverCost > 0 then
      newDriver = tonumber(string.format("%.8f", driverBal - driverCost))
      redis.call('SET', driverKey, tostring(newDriver))
    end

    redis.call('SET', storeKey, tostring(newStore))

    return {1, tostring(newStore), tostring(newDriver)}
  `;

  const result = await redisClient.eval(luaScript, {
    keys: [storeKey, driverKey],
    arguments: [String(storeCost), String(driverCost), String(minDomiBalanceDriver)]
  });

  const success = result[0];
  if (success === 0) {
    const errorType = result[1];
    const balance = parseFloat(result[2]);
    if (errorType === 'INSUFFICIENT_STORE_BALANCE') {
      throw new Error(`DOMI: Saldo insuficiente tienda. Disponible: ${balance}, Requerido: ${storeCost}`);
    } else if (errorType === 'INSUFFICIENT_DRIVER_MARGIN') {
      throw new Error(`DOMI: Saldo inferior al margen mínimo requerido (${minDomiBalanceDriver} DOMIs). Disponible: ${balance}`);
    } else {
      throw new Error(`DOMI: Saldo insuficiente repartidor. Disponible: ${balance}`);
    }
  }

  // 4. Encolar la transacción para que el Worker la procese en MariaDB
  const payload = {
    action: 'charge_order',
    orderId,
    storeId,
    driverUserId: driverUserId || null,
    storeCost,
    driverCost,
    timestamp: Date.now()
  };
  
  await redisClient.xAdd('domi:tx_stream', '*', { payload: JSON.stringify(payload) });
  console.log(`[DOMI STREAM] Pedido #${orderId} encolado para cobro asíncrono.`);

  return { status: 'queued', store_charged: storeCost, driver_charged: driverCost };
}

/**
 * USO INTERNO (Worker): Ejecuta el cobro en MariaDB.
 * Ya no verifica saldos, porque Redis ya los garantizó y bloqueó.
 */
async function processChargeSync(orderId, storeId, driverUserId, storeCost, driverCost) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SET @domi_session_user_id = (SELECT id FROM users WHERE rol = 'root' LIMIT 1)");
    const rules = await protocol.getProtocolRules(conn);
    const systemWallet = await wallets.getSystemWallet(conn);

    // Cobrar a tienda
    if (storeCost > 0) {
      const storeWallet = await wallets.getStoreWallet(conn, storeId);
      await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [storeCost, storeWallet.id]);
      await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [storeCost, systemWallet.id]);
      await ledger.appendLedger(conn, {
        txType: 'burn_service', fromWalletId: storeWallet.id, toWalletId: systemWallet.id,
        amountDomis: storeCost, referenceType: 'order', referenceId: orderId,
        protocolSnapshot: { rules }, notes: `Cobro asíncrono tienda. Pedido #${orderId}`
      });
    }

    // Cobrar a repartidor
    if (driverUserId && driverCost > 0) {
      const driverWallet = await wallets.getUserWallet(conn, driverUserId);
      await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [driverCost, driverWallet.id]);
      await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [driverCost, systemWallet.id]);
      await ledger.appendLedger(conn, {
        txType: 'burn_service', fromWalletId: driverWallet.id, toWalletId: systemWallet.id,
        amountDomis: driverCost, referenceType: 'order', referenceId: orderId,
        protocolSnapshot: { rules }, notes: `Cobro asíncrono repartidor. Pedido #${orderId}`
      });
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function chargeStoreSubscription(commerceId, storeId, amountDomis) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const rules = await protocol.getProtocolRules(conn);
    const token = await protocol.getTokenRegistry(conn);
    const wallet = await wallets.getOrCreateStoreWallet(conn, storeId);
    const systemWallet = await wallets.getSystemWallet(conn);

    const balance = parseFloat(wallet.balance_custody);
    if (balance < amountDomis) {
      throw new Error(`DOMI: Saldo insuficiente para suscripción. Disponible: ${balance}, Requerido: ${amountDomis}`);
    }

    // Descontar de la custodia de la tienda y depositar en la utilidad del sistema
    await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [amountDomis, wallet.id]);
    await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [amountDomis, systemWallet.id]);

    const txHash = await ledger.appendLedger(conn, {
      txType: 'service_charge',
      fromWalletId: wallet.id,
      toWalletId: systemWallet.id,
      amountDomis,
      referenceType: 'manual',
      referenceId: commerceId,
      protocolSnapshot: { token, rules },
      notes: `Cobro suscripción mensual plan Empresarial para comercio #${commerceId} debitado de sede #${storeId}`
    });

    await conn.commit();

    // Sincronizar Caché de Redis
    await domiRedis.decrementBalance('store', storeId, amountDomis);

    return { success: true, txHash, amountDomis };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function chargeCommerceSubscription(commerceId, amountDomis, conn) {
  if (!conn) {
    throw new Error('Conexión a la base de datos es obligatoria para chargeCommerceSubscription.');
  }

  const rules = await protocol.getProtocolRules(conn);
  const token = await protocol.getTokenRegistry(conn);
  const wallet = await wallets.getOrCreateCommerceWallet(conn, commerceId);
  const systemWallet = await wallets.getSystemWallet(conn);

  const balance = parseFloat(wallet.balance_custody);
  if (balance < amountDomis) {
    throw new Error(`DOMI: Saldo insuficiente para suscripción corporativa. Disponible: ${balance}, Requerido: ${amountDomis}`);
  }

  // Descontar de la custodia del comercio y depositar en la utilidad del sistema
  await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [amountDomis, wallet.id]);
  await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [amountDomis, systemWallet.id]);

  const txHash = await ledger.appendLedger(conn, {
    txType: 'service_charge',
    fromWalletId: wallet.id,
    toWalletId: systemWallet.id,
    amountDomis,
    referenceType: 'manual',
    referenceId: commerceId,
    protocolSnapshot: { token, rules },
    notes: `Cobro suscripción mensual plan Empresarial para comercio #${commerceId} debitado de billetera corporativa`
  });

  return { success: true, txHash, amountDomis };
}

async function chargeDeliveryCompanyForOrder(orderId, deliveryCompanyId, deliveryCompanyCost) {
  const conn = await db.getConnection();
  let dcUserId;
  try {
    const rules = await protocol.getProtocolRules(conn);
    const token = await protocol.getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);

    const driverCostDomi = parseFloat((parseFloat(rules.driver_fixed_fee_cop) / fiatPeg).toFixed(8));
    deliveryCompanyCost = (deliveryCompanyCost > 0 || deliveryCompanyCost === undefined) ? deliveryCompanyCost : driverCostDomi;

    const [dcRows] = await conn.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [deliveryCompanyId]);
    dcUserId = dcRows[0]?.usuario_id;
  } finally {
    conn.release();
  }

  if (!dcUserId) {
    throw new Error(`DOMI: Empresa de reparto (deliveryCompanyId: ${deliveryCompanyId}) no posee administrador único.`);
  }

  await domiRedis.getWalletBalance('user', dcUserId);

  const companyKey = `domi:balance:user:${dcUserId}`;

  const luaScript = `
    local companyKey = KEYS[1]
    local cost = tonumber(ARGV[1])

    local balance = tonumber(redis.call('GET', companyKey) or '0')

    if balance < cost then
      return {0, 'INSUFFICIENT_COMPANY_BALANCE', tostring(balance)}
    end

    local newBalance = tonumber(string.format("%.8f", balance - cost))
    redis.call('SET', companyKey, tostring(newBalance))

    return {1, tostring(newBalance)}
  `;

  const result = await redisClient.eval(luaScript, {
    keys: [companyKey],
    arguments: [String(deliveryCompanyCost)]
  });

  const success = result[0];
  if (success === 0) {
    const balance = parseFloat(result[2]);
    throw new Error(`DOMI: Saldo insuficiente empresa de reparto. Disponible: ${balance}, Requerido: ${deliveryCompanyCost}`);
  }

  const payload = {
    action: 'charge_delivery_company_order',
    orderId,
    deliveryCompanyId,
    cost: deliveryCompanyCost,
    timestamp: Date.now()
  };

  await redisClient.xAdd('domi:tx_stream', '*', { payload: JSON.stringify(payload) });
  console.log(`[DOMI STREAM] Pedido #${orderId} de empresa de reparto encolado para cobro asíncrono.`);

  return { status: 'queued', company_charged: deliveryCompanyCost };
}

async function processChargeDeliveryCompanySync(orderId, deliveryCompanyId, cost) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SET @domi_session_user_id = (SELECT id FROM users WHERE rol = 'root' LIMIT 1)");
    const rules = await protocol.getProtocolRules(conn);
    const systemWallet = await wallets.getSystemWallet(conn);

    const companyWallet = await wallets.getDeliveryCompanyWallet(conn, deliveryCompanyId);
    await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [cost, companyWallet.id]);
    await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [cost, systemWallet.id]);
    await ledger.appendLedger(conn, {
      txType: 'burn_service', fromWalletId: companyWallet.id, toWalletId: systemWallet.id,
      amountDomis: cost, referenceType: 'order', referenceId: orderId,
      protocolSnapshot: { rules }, notes: `Cobro asíncrono empresa de reparto. Pedido #${orderId}`
    });

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  chargeForOrder,
  processChargeSync,
  chargeStoreSubscription,
  chargeCommerceSubscription,
  chargeDeliveryCompanyForOrder,
  processChargeDeliveryCompanySync
};

