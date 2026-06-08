/**
 * Motor Financiero DOMI v3 - Cobro Inmediato y Reembolsos Manuales
 * 
 * - El sistema cobra INMEDIATAMENTE al aceptar el pedido (tienda y repartidor).
 * - No hay retención temporal (locked_balance se deja de usar para pedidos).
 * - Los restaurantes NUNCA reciben reembolsos.
 * - Los reembolsos a repartidores son MANUALES (aprobados por el operador).
 * - Si un repartidor es asignado a un rescate, se le cobra la tarifa normal al aceptar.
 */

const crypto = require('crypto');
const db = require('../config/db');
const domiRedis = require('./domiRedis');
const redisClient = require('../config/redis');

// =============================================
// UTILIDADES INTERNAS
// =============================================

function generateTxHash(txType, fromWalletId, toWalletId, amount, referenceId) {
  const payload = `${txType}|${fromWalletId || 'null'}|${toWalletId || 'null'}|${amount}|${referenceId}|${Date.now()}|${Math.random()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function getProtocolRules(conn) {
  const [rows] = await conn.query('SELECT * FROM protocol_rules WHERE id = 1');
  if (rows.length === 0) throw new Error('DOMI_ENGINE: protocol_rules no encontrado.');
  return rows[0];
}

async function getTokenRegistry(conn) {
  const [rows] = await conn.query('SELECT * FROM token_registry WHERE id = 1');
  if (rows.length === 0) throw new Error('DOMI_ENGINE: token_registry no encontrado.');
  return rows[0];
}

async function getSystemWallet(conn) {
  const [rows] = await conn.query("SELECT * FROM wallets WHERE owner_type = 'system' AND owner_id IS NULL");
  if (rows.length === 0) throw new Error('DOMI_ENGINE: Billetera del sistema no encontrada.');
  return rows[0];
}

async function getOrCreateStoreWallet(conn, storeId) {
  const [rows] = await conn.query("SELECT * FROM wallets WHERE owner_type = 'store' AND owner_id = ?", [storeId]);
  if (rows.length > 0) return rows[0];
  const [result] = await conn.query("INSERT INTO wallets (owner_type, owner_id) VALUES ('store', ?)", [storeId]);
  const [w] = await conn.query("SELECT * FROM wallets WHERE id = ?", [result.insertId]);
  return w[0];
}

async function getOrCreateUserWallet(conn, userId) {
  const [rows] = await conn.query("SELECT * FROM wallets WHERE owner_type = 'user' AND owner_id = ?", [userId]);
  if (rows.length > 0) return rows[0];
  const [result] = await conn.query("INSERT INTO wallets (owner_type, owner_id) VALUES ('user', ?)", [userId]);
  const [w] = await conn.query("SELECT * FROM wallets WHERE id = ?", [result.insertId]);
  return w[0];
}

async function appendLedger(conn, { txType, fromWalletId, toWalletId, amountDomis, amountFiatCop, referenceType, referenceId, protocolSnapshot, notes }) {
  const txHash = generateTxHash(txType, fromWalletId, toWalletId, amountDomis, referenceId);
  await conn.query(`
    INSERT INTO domi_ledger 
    (tx_hash, tx_type, from_wallet_id, to_wallet_id, amount_domis, amount_fiat_cop, reference_type, reference_id, protocol_snapshot, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [txHash, txType, fromWalletId || null, toWalletId || null, amountDomis, amountFiatCop || null, referenceType, referenceId, JSON.stringify(protocolSnapshot), notes || null]);
  return txHash;
}

// =============================================
// FUNCIONES PUBLICAS
// =============================================

async function verifyIntegrity() {
  const conn = await db.getConnection();
  try {
    const token = await getTokenRegistry(conn);
    const expectedPayload = `${token.symbol}|${token.name}|${token.decimals}|${parseFloat(token.fiat_peg_cop).toFixed(4)}|${token.protocol_version}`;
    const expectedHash = crypto.createHash('sha256').update(expectedPayload).digest('hex');
    if (token.integrity_hash !== expectedHash) {
      throw new Error(`DOMI_ENGINE: Integridad comprometida!`);
    }
    console.log('[DOMI] Integridad del token verificada.');
    return true;
  } finally {
    conn.release();
  }
}

async function calculateOrderCost(orderTotalCop) {
  const conn = await db.getConnection();
  try {
    const rules = await getProtocolRules(conn);
    const token = await getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);

    // Costo del RESTAURANTE
    let storeCost;
    if (orderTotalCop < parseFloat(rules.threshold_fiat_cop)) {
      storeCost = parseFloat(rules.base_cost_domis);
    } else {
      storeCost = parseFloat(((orderTotalCop / fiatPeg) * parseFloat(rules.percentage_rate)).toFixed(4));
    }

    // Costo del REPARTIDOR
    let driverCost;
    if (orderTotalCop < parseFloat(rules.driver_threshold_fiat_cop)) {
      driverCost = parseFloat(rules.driver_base_cost_domis);
    } else {
      driverCost = parseFloat(((orderTotalCop / fiatPeg) * parseFloat(rules.driver_percentage_rate)).toFixed(4));
    }

    return {
      store_cost_domis: storeCost,
      driver_cost_domis: driverCost,
      total_cost_domis: parseFloat((storeCost + driverCost).toFixed(4)),
      reglas_usadas: {
        store: { threshold: parseFloat(rules.threshold_fiat_cop), base_cost: parseFloat(rules.base_cost_domis), rate: parseFloat(rules.percentage_rate) },
        driver: { threshold: parseFloat(rules.driver_threshold_fiat_cop), base_cost: parseFloat(rules.driver_base_cost_domis), rate: parseFloat(rules.driver_percentage_rate) },
        fiat_peg_cop: fiatPeg
      }
    };
  } finally {
    conn.release();
  }
}

async function mintDomis(ownerType, ownerId, fiatAmount, paymentRef) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const token = await getTokenRegistry(conn);
    const rules = await getProtocolRules(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    const domis = parseFloat((fiatAmount / fiatPeg).toFixed(4));

    const wallet = ownerType === 'store'
      ? await getOrCreateStoreWallet(conn, ownerId)
      : await getOrCreateUserWallet(conn, ownerId);

    const [pkgResult] = await conn.query(`
      INSERT INTO domi_packages (store_id, wallet_id, domis_purchased, fiat_paid_cop, exchange_rate, payment_ref, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
    `, [ownerType === 'store' ? ownerId : null, wallet.id, domis, fiatAmount, fiatPeg, paymentRef || null]);
    const packageId = pkgResult.insertId;

    await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [domis, wallet.id]);

    await appendLedger(conn, {
      txType: 'mint', fromWalletId: null, toWalletId: wallet.id,
      amountDomis: domis, amountFiatCop: fiatAmount,
      referenceType: 'package', referenceId: packageId,
      protocolSnapshot: { token, rules },
      notes: `Mint ${domis} DOMI para ${ownerType} #${ownerId}`
    });

    await conn.query("UPDATE domi_packages SET status = 'confirmado', confirmed_at = NOW() WHERE id = ?", [packageId]);
    await conn.commit();
    
    // Sincronizar Caché de Redis
    await domiRedis.incrementBalance(ownerType, ownerId, domis);
    
    console.log(`[DOMI] Mint: ${domis} DOMI para ${ownerType} #${ownerId} (Paquete #${packageId})`);
    return { packageId, domis, fiatAmount, exchangeRate: fiatPeg };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Cobra INMEDIATAMENTE el saldo usando Redis (Write-Behind Cache).
 * Bloquea el dinero ultrarrápido y encola el cobro para MariaDB.
 */
async function chargeForOrder(orderId, storeId, driverUserId, storeCost, driverCost) {
  // 1. Asegurar que los saldos están en caché (evita fallos de lectura en Lua)
  await domiRedis.getWalletBalance('store', storeId);
  await domiRedis.getWalletBalance('user', driverUserId);

  // 2. Ejecutar descuento atómico usando un script de Lua (previene doble gasto y race conditions)
  const storeKey = `domi:balance:store:${storeId}`;
  const driverKey = `domi:balance:user:${driverUserId}`;

  const luaScript = `
    local storeKey = KEYS[1]
    local driverKey = KEYS[2]
    local storeCost = tonumber(ARGV[1])
    local driverCost = tonumber(ARGV[2])

    local storeBal = tonumber(redis.call('GET', storeKey) or '0')
    local driverBal = tonumber(redis.call('GET', driverKey) or '0')

    if storeBal < storeCost then
      return {0, 'INSUFFICIENT_STORE_BALANCE', tostring(storeBal)}
    end
    if driverBal < driverCost then
      return {0, 'INSUFFICIENT_DRIVER_BALANCE', tostring(driverBal)}
    end

    local newStore = tonumber(string.format("%.4f", storeBal - storeCost))
    local newDriver = tonumber(string.format("%.4f", driverBal - driverCost))

    redis.call('SET', storeKey, tostring(newStore))
    redis.call('SET', driverKey, tostring(newDriver))

    return {1, tostring(newStore), tostring(newDriver)}
  `;

  const result = await redisClient.eval(luaScript, {
    keys: [storeKey, driverKey],
    arguments: [String(storeCost), String(driverCost)]
  });

  const success = result[0];
  if (success === 0) {
    const errorType = result[1];
    const balance = parseFloat(result[2]);
    if (errorType === 'INSUFFICIENT_STORE_BALANCE') {
      throw new Error(`DOMI: Saldo insuficiente tienda. Disponible: ${balance}, Requerido: ${storeCost}`);
    } else {
      throw new Error(`DOMI: Saldo insuficiente repartidor. Disponible: ${balance}, Requerido: ${driverCost}`);
    }
  }

  // 3. Encolar la transacción para que el Worker la procese en MariaDB
  const payload = {
    action: 'charge_order',
    orderId,
    storeId,
    driverUserId,
    storeCost,
    driverCost,
    timestamp: Date.now()
  };
  
  await redisClient.lPush('domi:tx_queue', JSON.stringify(payload));
  console.log(`[DOMI QUEUE] Pedido #${orderId} encolado para cobro asíncrono.`);

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
    const rules = await getProtocolRules(conn);
    const storeWallet = await getOrCreateStoreWallet(conn, storeId);
    const driverWallet = await getOrCreateUserWallet(conn, driverUserId);
    const systemWallet = await getSystemWallet(conn);

    // Cobrar a tienda
    await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [storeCost, storeWallet.id]);
    await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [storeCost, systemWallet.id]);
    await appendLedger(conn, {
      txType: 'burn_service', fromWalletId: storeWallet.id, toWalletId: systemWallet.id,
      amountDomis: storeCost, referenceType: 'order', referenceId: orderId,
      protocolSnapshot: { rules }, notes: `Cobro asíncrono tienda. Pedido #${orderId}`
    });

    // Cobrar a repartidor
    await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [driverCost, driverWallet.id]);
    await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [driverCost, systemWallet.id]);
    await appendLedger(conn, {
      txType: 'burn_service', fromWalletId: driverWallet.id, toWalletId: systemWallet.id,
      amountDomis: driverCost, referenceType: 'order', referenceId: orderId,
      protocolSnapshot: { rules }, notes: `Cobro asíncrono repartidor. Pedido #${orderId}`
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

/**
 * Solo reporta la incidencia, NO mueve dinero.
 * Si es post_pickup, crea la tarea de rescate (buscando_rescatista).
 */
async function reportIncident(orderId, driverUserId, phase, reason) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) throw new Error(`Pedido #${orderId} no encontrado.`);
    const order = orderRows[0];

    const status = phase === 'post_pickup' ? 'en_rescate' : 'abierta';

    const [incResult] = await conn.query(
      "INSERT INTO order_incidents (order_id, reported_by_user_id, incident_phase, reason, status) VALUES (?, ?, ?, ?, ?)", 
      [orderId, driverUserId, phase, reason, status]
    );
    const incidentId = incResult.insertId;

    let rescueId = null;
    if (phase === 'post_pickup') {
      const totalCommission = parseFloat(order.store_cost_domis || 0) + parseFloat(order.driver_domi_cost || 0); // Opcional
      const [rescueResult] = await conn.query(
        "INSERT INTO rescue_assignments (incident_id, order_id, original_driver_id, original_commission, status) VALUES (?, ?, ?, ?, 'buscando_rescatista')", 
        [incidentId, orderId, driverUserId, parseFloat(order.driver_domi_cost || 0)]
      );
      rescueId = rescueResult.insertId;
      await conn.query("UPDATE orders SET status = 'en_rescate' WHERE id = ?", [orderId]);
    } else {
      await conn.query("UPDATE orders SET status = 'cancelado' WHERE id = ?", [orderId]);
    }

    await conn.commit();
    return { incidentId, rescueId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Operador resuelve incidencia pre-pickup.
 * Si aprueba (approveRefund = true), devuelve 70% SOLO al repartidor.
 * La tienda NUNCA recibe reembolso.
 */
async function resolvePrePickupIncident(incidentId, approveRefund) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const rules = await getProtocolRules(conn);
    const [incRows] = await conn.query('SELECT * FROM order_incidents WHERE id = ?', [incidentId]);
    if (incRows.length === 0) throw new Error('Incidencia no encontrada.');
    const incident = incRows[0];

    if (incident.status !== 'abierta') throw new Error('Incidencia no está abierta.');

    const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [incident.order_id]);
    const order = orderRows[0];
    const driverCost = parseFloat(order.driver_domi_cost);
    const refundRate = parseFloat(rules.refund_standard_rate);

    let refundedDomis = 0;

    if (approveRefund) {
      const driverWallet = await getOrCreateUserWallet(conn, incident.reported_by_user_id);
      const systemWallet = await getSystemWallet(conn);
      refundedDomis = parseFloat((driverCost * refundRate).toFixed(4));

      // Sistema devuelve al repartidor
      await conn.query('UPDATE wallets SET balance_utility = balance_utility - ? WHERE id = ?', [refundedDomis, systemWallet.id]);
      await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [refundedDomis, driverWallet.id]);

      await appendLedger(conn, { 
        txType: 'refund', fromWalletId: systemWallet.id, toWalletId: driverWallet.id, 
        amountDomis: refundedDomis, referenceType: 'incident', referenceId: incidentId, 
        protocolSnapshot: { rules }, notes: `Operador aprobo refund 70% a repartidor. Pedido #${order.id}` 
      });
      
      // Sincronizar Caché de Redis
      await domiRedis.incrementBalance('user', incident.reported_by_user_id, refundedDomis);
    }

    await conn.query("UPDATE order_incidents SET status = 'resuelta', resolved_at = NOW() WHERE id = ?", [incidentId]);
    await conn.commit();
    return { incidentId, approved: approveRefund, refunded_to_driver: refundedDomis };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Operador asigna un nuevo repartidor a un rescate.
 * COBRA INMEDIATAMENTE la tarifa normal al nuevo repartidor.
 */
async function assignRescue(incidentId, rescueDriverId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const rules = await getProtocolRules(conn);
    const [incRows] = await conn.query('SELECT * FROM order_incidents WHERE id = ?', [incidentId]);
    const incident = incRows[0];
    
    const [rescueRows] = await conn.query('SELECT * FROM rescue_assignments WHERE incident_id = ?', [incidentId]);
    if (rescueRows.length === 0) throw new Error('No hay rescate asociado a esta incidencia.');
    const rescue = rescueRows[0];

    const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [rescue.order_id]);
    const order = orderRows[0];

    // Calcular costo para el rescatista
    const token = await getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    const orderTotalCop = parseFloat(order.total_cop);
    
    let rescuerCost;
    if (orderTotalCop < parseFloat(rules.driver_threshold_fiat_cop)) {
      rescuerCost = parseFloat(rules.driver_base_cost_domis);
    } else {
      rescuerCost = parseFloat(((orderTotalCop / fiatPeg) * parseFloat(rules.driver_percentage_rate)).toFixed(4));
    }

    const rescuerWallet = await getOrCreateUserWallet(conn, rescueDriverId);
    const systemWallet = await getSystemWallet(conn);

    if (parseFloat(rescuerWallet.balance_custody) < rescuerCost) {
      throw new Error(`DOMI: Saldo insuficiente rescatista. Disponible: ${rescuerWallet.balance_custody}, Requerido: ${rescuerCost}`);
    }

    // Cobrar al rescatista (Paga el sistema)
    await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [rescuerCost, rescuerWallet.id]);
    await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [rescuerCost, systemWallet.id]);
    await appendLedger(conn, {
      txType: 'burn_service', fromWalletId: rescuerWallet.id, toWalletId: systemWallet.id,
      amountDomis: rescuerCost, referenceType: 'order', referenceId: order.id,
      protocolSnapshot: { rules }, notes: `Cobro a rescatista. Rescate #${rescue.id}`
    });
    
    // Sincronizar Caché (El operador llama esto, podemos hacerlo sincrono o asincrono. Lo dejamos atómico aquí)
    await domiRedis.decrementBalance('user', rescueDriverId, rescuerCost);

    // Actualizar asignacion
    await conn.query("UPDATE rescue_assignments SET rescue_driver_id = ?, status = 'en_camino' WHERE id = ?", [rescueDriverId, rescue.id]);

    await conn.commit();
    return { rescueId: rescue.id, rescuer_charged: rescuerCost };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Completa el rescate. 
 * Resoluciones:
 * - 'delivered': Repartidor original recibe 30% de cashback.
 * - 'customer_no_show': Cliente no aparecio. Se devuelve 70% al original y 70% al rescatista.
 * - 'failed': Falla del repartidor. Nadie recibe nada.
 */
async function completeRescue(rescueId, resolution) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const rules = await getProtocolRules(conn);
    const [rescueRows] = await conn.query('SELECT * FROM rescue_assignments WHERE id = ?', [rescueId]);
    if (rescueRows.length === 0) throw new Error(`Rescate #${rescueId} no encontrado.`);
    const rescue = rescueRows[0];
    if (rescue.cashback_paid) throw new Error(`Rescate #${rescueId} ya procesado.`);

    const systemWallet = await getSystemWallet(conn);

    if (resolution === 'delivered') {
      const cashbackRate = parseFloat(rules.rescue_cashback_rate);
      const cashback = parseFloat((parseFloat(rescue.original_commission) * cashbackRate).toFixed(4));

      const driverWallet = await getOrCreateUserWallet(conn, rescue.original_driver_id);

      await conn.query('UPDATE wallets SET balance_utility = balance_utility - ? WHERE id = ?', [cashback, systemWallet.id]);
      await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [cashback, driverWallet.id]);

      await appendLedger(conn, { 
        txType: 'rescue_cashback', fromWalletId: systemWallet.id, toWalletId: driverWallet.id, 
        amountDomis: cashback, referenceType: 'incident', referenceId: rescue.incident_id, 
        protocolSnapshot: { rules }, notes: `Cashback ${cashbackRate * 100}% al repartidor original. Rescate #${rescueId}` 
      });
      
      // Sincronizar Caché de Redis
      await domiRedis.incrementBalance('user', rescue.original_driver_id, cashback);

      await conn.query("UPDATE orders SET status = 'entregado', delivered_at = NOW() WHERE id = ?", [rescue.order_id]);
      await conn.query("UPDATE rescue_assignments SET status = 'entregado', cashback_paid = 1, completed_at = NOW() WHERE id = ?", [rescueId]);

    } else if (resolution === 'customer_no_show') {
      // Cliente no apareció: Devolución del 70% a AMBOS (original y rescatista)
      const refundRate = parseFloat(rules.refund_standard_rate);
      
      // Reembolso al original
      const refundOriginal = parseFloat((parseFloat(rescue.original_commission) * refundRate).toFixed(4));
      const originalWallet = await getOrCreateUserWallet(conn, rescue.original_driver_id);
      
      await conn.query('UPDATE wallets SET balance_utility = balance_utility - ? WHERE id = ?', [refundOriginal, systemWallet.id]);
      await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [refundOriginal, originalWallet.id]);
      await appendLedger(conn, { 
        txType: 'refund', fromWalletId: systemWallet.id, toWalletId: originalWallet.id, 
        amountDomis: refundOriginal, referenceType: 'incident', referenceId: rescue.incident_id, 
        protocolSnapshot: { rules }, notes: `Refund 70% a original por cliente ausente. Rescate #${rescueId}` 
      });
      
      await domiRedis.incrementBalance('user', rescue.original_driver_id, refundOriginal);

      // Reembolso al rescatista
      if (rescue.rescue_driver_id) {
        // Necesitamos saber cuánto se le cobró al rescatista. Se puede recalcular o leer del ledger.
        // Como el costo del rescatista es el estándar basado en total_cop, recalculamos:
        const [orderRows] = await conn.query('SELECT total_cop FROM orders WHERE id = ?', [rescue.order_id]);
        const token = await getTokenRegistry(conn);
        const orderTotalCop = parseFloat(orderRows[0].total_cop);
        let rescuerCost;
        if (orderTotalCop < parseFloat(rules.driver_threshold_fiat_cop)) {
          rescuerCost = parseFloat(rules.driver_base_cost_domis);
        } else {
          rescuerCost = parseFloat(((orderTotalCop / parseFloat(token.fiat_peg_cop)) * parseFloat(rules.driver_percentage_rate)).toFixed(4));
        }

        const refundRescuer = parseFloat((rescuerCost * refundRate).toFixed(4));
        const rescuerWallet = await getOrCreateUserWallet(conn, rescue.rescue_driver_id);

        await conn.query('UPDATE wallets SET balance_utility = balance_utility - ? WHERE id = ?', [refundRescuer, systemWallet.id]);
        await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [refundRescuer, rescuerWallet.id]);
        await appendLedger(conn, { 
          txType: 'refund', fromWalletId: systemWallet.id, toWalletId: rescuerWallet.id, 
          amountDomis: refundRescuer, referenceType: 'incident', referenceId: rescue.incident_id, 
          protocolSnapshot: { rules }, notes: `Refund 70% a rescatista por cliente ausente. Rescate #${rescueId}` 
        });
        
        await domiRedis.incrementBalance('user', rescue.rescue_driver_id, refundRescuer);
      }

      await conn.query("UPDATE orders SET status = 'cancelado', cancelled_at = NOW() WHERE id = ?", [rescue.order_id]);
      await conn.query("UPDATE rescue_assignments SET status = 'fallido', cashback_paid = 1, completed_at = NOW() WHERE id = ?", [rescueId]);

    } else {
      // failed (El repartidor fallo)
      await conn.query("UPDATE orders SET status = 'cancelado', cancelled_at = NOW() WHERE id = ?", [rescue.order_id]);
      await conn.query("UPDATE rescue_assignments SET status = 'fallido', cashback_paid = 0, completed_at = NOW() WHERE id = ?", [rescueId]);
    }

    await conn.query("UPDATE order_incidents SET status = 'resuelta', resolved_at = NOW() WHERE id = ?", [rescue.incident_id]);

    await conn.commit();
    return { rescueId, resolution };
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
    const rules = await getProtocolRules(conn);
    const token = await getTokenRegistry(conn);
    const wallet = await getOrCreateStoreWallet(conn, storeId);
    const systemWallet = await getSystemWallet(conn);

    const balance = parseFloat(wallet.balance_custody);
    if (balance < amountDomis) {
      throw new Error(`DOMI: Saldo insuficiente para suscripción. Disponible: ${balance}, Requerido: ${amountDomis}`);
    }

    // Descontar de la custodia de la tienda y depositar en la utilidad del sistema
    await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [amountDomis, wallet.id]);
    await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [amountDomis, systemWallet.id]);

    const txHash = await appendLedger(conn, {
      txType: 'burn_service',
      fromWalletId: wallet.id,
      toWalletId: systemWallet.id,
      amountDomis,
      referenceType: 'subscription',
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

module.exports = {
  verifyIntegrity,
  calculateOrderCost,
  mintDomis,
  chargeForOrder,
  processChargeSync,
  reportIncident,
  resolvePrePickupIncident,
  assignRescue,
  completeRescue,
  chargeStoreSubscription
};
