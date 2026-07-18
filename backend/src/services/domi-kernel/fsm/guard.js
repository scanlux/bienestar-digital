// fsm/guard.js
// Capa 2 de concurrencia: bloqueo optimista a nivel de base de datos.
// Implementa SELECT ... FOR UPDATE y UPDATE atómico con condiciones dinámicas.
// Ver REGLAS_DE_NEGOCIO.md §8 — Control de Concurrencia.

/**
 * Bloquea la fila de la orden con SELECT FOR UPDATE.
 * Garantiza que ningún otro proceso modifique el registro
 * mientras la transacción actual está activa.
 *
 * @param {number} orderId
 * @param {object} conn - Conexión de BD dentro de una transacción activa
 * @returns {Promise<object>} Fila completa de la orden
 * @throws 404 si la orden no existe
 */
async function lockOrder(orderId, conn) {
  const [rows] = await conn.execute(
    'SELECT * FROM orders WHERE id = ? FOR UPDATE',
    [orderId]
  );
  if (!rows[0]) {
    const err = new Error(`Order ${orderId} not found`);
    err.statusCode = 404;
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }
  return rows[0];
}

/**
 * Ejecuta el UPDATE atómico de estado con condiciones de guarda dinámicas.
 * Si rowsAffected = 0, otro proceso ya modificó el estado → 409 Conflict.
 *
 * Las guardExtras se agregan como cláusulas AND al WHERE:
 *   - valor null         → AND columna IS NULL
 *   - valor 'NOT NULL'   → AND columna IS NOT NULL
 *   - cualquier otro     → AND columna = ? (con escape)
 *
 * Ejemplo de guardExtras:
 *   { rescue_driver_id: null }           → AND rescue_driver_id IS NULL
 *   { rescue_driver_id: 'NOT NULL' }     → AND rescue_driver_id IS NOT NULL
 *   { rescue_attempt_count: 2 }          → AND rescue_attempt_count = 2
 *   { driver_user_id: 'NOT NULL' }       → AND driver_user_id IS NOT NULL
 *
 * @param {object} params
 * @param {number}  params.orderId
 * @param {string}  params.expectedState - Estado actual de la orden (antes del cambio)
 * @param {string}  params.nextState     - Estado al que debe transicionar
 * @param {object}  params.guardExtras   - Condiciones adicionales del WHERE
 * @param {object}  params.conn
 * @returns {Promise<boolean>} true si el UPDATE afectó 1 fila; false = conflict
 */
async function atomicTransition({ orderId, expectedState, nextState, guardExtras = {}, conn }) {
  const extraClauses = [];
  const extraValues  = [];

  for (const [col, val] of Object.entries(guardExtras)) {
    if (val === undefined) continue;
    if (val === null) {
      extraClauses.push(`AND ${col} IS NULL`);
    } else if (val === 'NOT NULL') {
      extraClauses.push(`AND ${col} IS NOT NULL`);
    } else {
      extraClauses.push(`AND ${col} = ?`);
      extraValues.push(val);
    }
  }

  let setClause = 'status = ?';
  if (nextState === 'cancelado') {
    setClause += ', cancelled_at = NOW(6)';
  } else if (nextState === 'aceptado') {
    setClause += ', accepted_at = NOW(6)';
  } else if (nextState === 'en_camino') {
    setClause += ', picked_up_at = NOW(6)';
  } else if (nextState === 'entregado') {
    setClause += ', delivered_at = NOW(6)';
  }

  const sql = `
    UPDATE orders
    SET    ${setClause}
    WHERE  id = ? AND status = ?
    ${extraClauses.join(' ')}
  `;

  const [result] = await conn.execute(sql, [
    nextState,
    orderId,
    expectedState,
    ...extraValues,
  ]);

  return result.affectedRows === 1;
}

module.exports = { lockOrder, atomicTransition };
