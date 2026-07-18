const db = require('../../config/db');
const { executeTransition } = require('./fsm/engine');

/**
 * Solo reporta la incidencia en order_incidents y llama al FSM.
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
      const fsmResult = await executeTransition({
        action: 'RESCUE_INITIATE',
        orderId,
        actorId: driverUserId,
        actorRole: 'driver',
        meta: { incidentId },
        db: conn
      });
      rescueId = fsmResult.financial.rescueId;
    } else {
      // pre_pickup cancel
      await conn.query("UPDATE orders SET status = 'cancelado', cancelled_at = NOW(6) WHERE id = ?", [orderId]);
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
 */
async function resolvePrePickupIncident(incidentId, approveRefund) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [incRows] = await conn.query('SELECT * FROM order_incidents WHERE id = ?', [incidentId]);
    const incident = incRows[0];
    if (incident.status !== 'abierta') throw new Error('Incidencia no está abierta.');

    let refundedDomis = 0;
    if (approveRefund) {
      const protocol = require('./protocol');
      const wallets = require('./wallets');
      const ledger = require('./ledger');
      const domiRedis = require('../domiRedis');

      const rules = await protocol.getProtocolRules(conn);
      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [incident.order_id]);
      const order = orderRows[0];

      const refundRate = parseFloat(rules.refund_standard_rate || 0.70);
      const driverPlatformFee = parseFloat(order.driver_cost_domi_snapshot || 0);
      refundedDomis = parseFloat((driverPlatformFee * refundRate).toFixed(4));

      const driverWallet = await wallets.getUserWallet(conn, incident.reported_by_user_id);
      const systemWallet = await wallets.getSystemWallet(conn);

      await conn.query('UPDATE wallets SET balance_utility = GREATEST(0, balance_utility - ?) WHERE id = ?', [refundedDomis, systemWallet.id]);
      await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [refundedDomis, driverWallet.id]);

      await ledger.appendLedger(conn, {
        txType: 'refund',
        fromWalletId: systemWallet.id,
        toWalletId: driverWallet.id,
        amountDomis: refundedDomis,
        referenceType: 'incident',
        referenceId: incidentId,
        protocolSnapshot: { rules },
        notes: `Reembolso pre-pickup de comisión (${refundRate * 100}%) al repartidor`
      });

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
 * Asigna rescatista delegando a la FSM.
 */
async function assignRescue(incidentId, rescueDriverId) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [incRows] = await conn.query('SELECT * FROM order_incidents WHERE id = ?', [incidentId]);
    const incident = incRows[0];
    
    const [rescueRows] = await conn.query('SELECT * FROM rescue_assignments WHERE incident_id = ?', [incidentId]);
    if (rescueRows.length === 0) throw new Error('No hay rescate asociado a esta incidencia.');
    const rescue = rescueRows[0];

    const fsmResult = await executeTransition({
      action: 'RESCUE_ASSIGN',
      orderId: rescue.order_id,
      actorId: 1, // system actor
      actorRole: 'system',
      meta: { rescueDriverId },
      db: conn
    });

    await conn.commit();
    return { rescueId: rescue.id, rescuer_charged: fsmResult.financial.rescuerCost };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Completa el rescate delegando a la FSM.
 */
async function completeRescue(rescueId, resolution) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rescueRows] = await conn.query('SELECT * FROM rescue_assignments WHERE id = ?', [rescueId]);
    if (rescueRows.length === 0) throw new Error(`Rescate #${rescueId} no encontrado.`);
    const rescue = rescueRows[0];
    if (rescue.cashback_paid) throw new Error(`Rescate #${rescueId} ya procesado.`);

    let action = 'RESCUE_COMPLETE';
    if (resolution === 'customer_no_show') {
      action = 'RESCUE_TIMEOUT';
    } else if (resolution === 'failed') {
      action = 'RESCUE_FAIL_RESCUER';
    }

    const fsmResult = await executeTransition({
      action,
      orderId: rescue.order_id,
      actorId: 1, // system
      actorRole: 'system',
      db: conn
    });

    // Marcar incidencia como resuelta
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

module.exports = {
  reportIncident,
  resolvePrePickupIncident,
  assignRescue,
  completeRescue
};
