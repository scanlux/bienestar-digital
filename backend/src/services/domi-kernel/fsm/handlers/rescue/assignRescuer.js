// fsm/handlers/rescue/assignRescuer.js
// Escenario: El sistema (o un operador) asigna un rescatista a la orden en rescate.
// La orden permanece en 'en_rescate' (transición en_rescate → en_rescate).
//
// El handler actualiza la orden y el registro activo de rescue_assignments.
//
// Ver REGLAS_DE_NEGOCIO.md §9.1 — Activación y reglas de acceso.

const driver_ops = require('../../ops/driver.ops');
const wallets = require('../../../wallets');
const ledger = require('../../../ledger');
const domiRedis = require('../../../../domiRedis');

async function assignRescuer({ order, meta = {}, conn }) {
  const rescueDriverId = meta.rescueDriverId;
  if (!rescueDriverId) {
    throw new Error('rescueDriverId is required in meta to assign rescuer');
  }

  // 1. Obtener reglas para calcular la comisión del repartidor
  const [tokenRows] = await conn.execute('SELECT fiat_peg_cop FROM token_registry LIMIT 1');
  const fiatPeg = parseFloat(tokenRows[0]?.fiat_peg_cop || 400.0);
  const [rulesRows] = await conn.execute('SELECT driver_fixed_fee_cop FROM protocol_rules LIMIT 1');
  const driverFixedFeeCop = parseFloat(rulesRows[0]?.driver_fixed_fee_cop || 800.0);
  const rescuerCost = parseFloat((driverFixedFeeCop / fiatPeg).toFixed(8));

  // 2. Validar saldo del rescatista
  const rescuerWallet = await wallets.getUserWallet(conn, rescueDriverId);
  if (parseFloat(rescuerWallet.balance_custody || 0) < rescuerCost) {
    throw new Error(`DOMI: Saldo insuficiente rescatista. Disponible: ${rescuerWallet.balance_custody}, Requerido: ${rescuerCost}`);
  }

  const systemWallet = await wallets.getSystemWallet(conn);

  // 3. Cobrar al rescatista
  await conn.execute(
    'UPDATE wallets SET balance_custody = GREATEST(0, balance_custody - ?) WHERE id = ?',
    [rescuerCost, rescuerWallet.id]
  );
  await conn.execute(
    'UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?',
    [rescuerCost, systemWallet.id]
  );

  // 4. Registrar en ledger
  await ledger.appendLedger(conn, {
    txType: 'burn_service',
    fromWalletId: rescuerWallet.id,
    toWalletId: systemWallet.id,
    amountDomis: rescuerCost,
    referenceType: 'order',
    referenceId: order.id,
    protocolSnapshot: {},
    notes: `Cobro a rescatista. Pedido #${order.id}`
  });

  // 5. Sincronizar cache de Redis
  await domiRedis.incrementBalance('user', rescueDriverId, -rescuerCost);

  // 6. Actualizar la orden: asignar rescue_driver_id e incrementar rescue_attempt_count
  await driver_ops.assignRescuer(order.id, rescueDriverId, conn);

  // 7. Actualizar el registro de rescue_assignments activo
  await conn.execute(
    `UPDATE rescue_assignments
     SET    rescue_driver_id = ?,
            rescuer_commission = ?,
            status = 'en_camino'
     WHERE  order_id = ? AND status = 'buscando_rescatista'`,
    [
      rescueDriverId,
      rescuerCost,
      order.id
    ]
  );

  return { rescueDriverId, rescuerCost };
}

module.exports = assignRescuer;
