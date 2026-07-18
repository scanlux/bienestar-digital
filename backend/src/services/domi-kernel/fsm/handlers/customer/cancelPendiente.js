// fsm/handlers/customer/cancelPendiente.js
// Escenario: Cliente (o sede) cancela en estado 'pendiente'.
//
// REGLA: Sin penalización. Sin comisiones cobradas aún.
// COD:   Ningún movimiento financiero. La orden se cancela sin cambios de wallet.
// DOMI:  Devolver 100% del locked_balance al cliente (sin platform_processing_fee).
//
// Ver REGLAS_DE_NEGOCIO.md §10 — Cancelación en estado pendiente.
// Ver MATRIZ_CANCELACIONES.md — columna 'pendiente'.

const calc       = require('../../calculators/customerCancel.calc');
const wallet_ops = require('../../ops/wallet.ops');

async function cancelPendiente({ order, actorId, conn }) {
  const amounts = calc.forPendiente(order);

  if (amounts.isDomi && amounts.clientRefund > 0) {
    // DOMI: liberar locked_balance y acreditar al balance_custody del cliente
    await wallet_ops.debitLocked(order.customer_user_id, amounts.clientRefund, conn);
    await wallet_ops.creditAvailableUser(order.customer_user_id, amounts.clientRefund, conn, {
      referenceId: order.id,
      notes: `Reembolso completo (100%) por cancelación en estado pendiente. Pedido #${order.id}`,
    });
  }
  // COD: sin movimiento financiero

  // Sin deducción de Score (§10: penalización = 0 en pendiente)

  return { amounts };
}

module.exports = cancelPendiente;
