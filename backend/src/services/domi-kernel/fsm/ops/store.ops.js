// fsm/ops/store.ops.js
// Operaciones de gestión de la sede (establecimiento).
//
// Maneja las penalizaciones del Contador de Confiabilidad de la Sede.
// Ver REGLAS_DE_NEGOCIO.md — Contador de Confiabilidad de la Sede.

/**
 * Incrementa los puntos del Contador de Confiabilidad de la Sede.
 * Si no existe un registro para la sede, lo crea de forma idempotente.
 *
 * @param {number} storeId
 * @param {number} points - Puntos a sumar (+1 = preparación, +2 = dispatch)
 * @param {object} conn
 */
async function addReliabilityPenalty(storeId, points, conn) {
  if (!points || points <= 0) return;

  await conn.execute(
    `INSERT INTO store_reliability_counters (store_id, penalty_points, updated_at)
     VALUES (?, ?, NOW(6))
     ON DUPLICATE KEY UPDATE penalty_points = penalty_points + ?, updated_at = NOW(6)`,
    [storeId, points, points]
  );
}

module.exports = { addReliabilityPenalty };
