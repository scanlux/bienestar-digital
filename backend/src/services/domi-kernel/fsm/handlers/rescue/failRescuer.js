// fsm/handlers/rescue/failRescuer.js
// Escenario: El rescatista asignado también reporta un incidente (fallo en cadena).
// La orden permanece en 'en_rescate' para un nuevo intento (en_rescate → en_rescate).
//
// PIPELINE:
//   1. PENALIZAR CONTADOR RESCATISTA → +1 pt (driver_rescue_chain_penalty_points_snapshot)
//   2. MARCAR ASIGNACIÓN ACTIVA COMO FALLIDA
//   3. LIMPIAR rescue_driver_id (para permitir nuevo rescatista)
//
// Ver REGLAS_DE_NEGOCIO.md §9 — Protocolo de Incidente y Rescate.
// Ver MATRIZ_CANCELACIONES_REPARTIDOR.md Sección C — Rescatista también falla.

const calc = require('../../calculators/rescue.calc');

async function failRescuer({ order, conn }) {
  const amounts = calc.forFailRescuer(order);

  // 1. Penalizar contador de prioridad del rescatista que falló
  // Los rescatistas son usuarios independientes (repartidores individuales)
  if (amounts.rescuerPriorityPenalty > 0) {
    await conn.execute(
      `INSERT INTO driver_priority_counters (owner_type, owner_id, penalty_points, updated_at)
       VALUES ('user', ?, ?, NOW(6))
       ON DUPLICATE KEY UPDATE penalty_points = penalty_points + ?, updated_at = NOW(6)`,
      [order.rescue_driver_id, amounts.rescuerPriorityPenalty, amounts.rescuerPriorityPenalty]
    );
  }

  // 2. Marcar la asignación de rescate activa como 'fallida'
  await conn.execute(
    `UPDATE rescue_assignments
     SET    status = 'fallido', completed_at = NOW(6)
     WHERE  order_id = ? AND status = 'en_camino'`,
    [order.id]
  );

  // 3. Limpiar rescue_driver_id en la orden para permitir la búsqueda de otro rescatista
  // Mantenemos rescue_attempt_count y rescue_started_at para el tracking y timeout
  await conn.execute(
    `UPDATE orders
     SET    rescue_driver_id = NULL
     WHERE  id = ?`,
    [order.id]
  );

  return { amounts };
}

module.exports = failRescuer;
