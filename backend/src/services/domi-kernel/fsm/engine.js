// fsm/engine.js
// Punto de entrada ÚNICO del FSM de órdenes.
// Nadie escribe al estado de una orden directamente — todo pasa por aquí.
//
// Pipeline de ejecución:
//   [Redis lock] → [lock BD] → [validar transición] → [UPDATE atómico] → [handler] → [commit]
//
// Ver REGLAS_DE_NEGOCIO.md §8 — Doble capa de concurrencia.
// Ver implementation_plan.md §4 — Motor FSM.

const TRANSITIONS  = require('./transitions');
const HANDLERS     = require('./handlerRegistry');
const guard        = require('./guard');
const queueGuard   = require('./queueGuard');

/**
 * Construye un error tipado del FSM.
 * @param {string} code        - Código de error del FSM
 * @param {number} statusCode  - HTTP status code
 * @param {string} message     - Mensaje descriptivo
 */
function fsmError(code, statusCode, message) {
  const err = new Error(message);
  err.code       = code;
  err.statusCode = statusCode;
  return err;
}

/**
 * Ejecuta una transición de estado para una orden.
 * Es la única función que modifica el estado de una orden en la base de datos.
 *
 * @param {object} params
 * @param {string} [params.action]    - Acción del FSM (ej: 'CUSTOMER_CANCEL')
 * @param {string} [params.trigger]   - Alias para action
 * @param {number} params.orderId     - ID de la orden
 * @param {number} params.actorId     - ID del usuario que ejecuta la acción
 * @param {string} params.actorRole   - 'customer' | 'store' | 'driver' | 'system'
 * @param {object} params.meta        - Datos adicionales: { rescue_attempt_count, ... }
 * @param {object} params.db          - Pool de conexiones o conexión activa a la base de datos
 * @returns {Promise<object>}         - { success, newStatus, financial }
 */
async function executeTransition({ action, trigger, orderId, actorId, actorRole, meta = {}, db }) {
  const fsmAction = action || trigger;
  const redis = require('../../../config/redis');

  // ── CAPA 1: Serialización Redis (previene la mayoría de duplicados) ───────
  const lockToken = await queueGuard.acquire(orderId, redis);
  if (!lockToken) {
    throw fsmError(
      'FSM_QUEUED_CONFLICT',
      409,
      `Another operation is already in progress for order ${orderId}`
    );
  }

  // Determinar si db es una conexión o un pool
  const conn = typeof db.getConnection === 'function' ? await db.getConnection() : db;
  const isCustomConnection = (conn === db);

  if (!isCustomConnection) {
    await conn.beginTransaction();
  }

  try {
    // ── CAPA 2: Bloqueo de fila en BD (SELECT FOR UPDATE) ─────────────────
    const order = await guard.lockOrder(orderId, conn);

    // ── VALIDAR TRANSICIÓN EN LA TABLA ────────────────────────────────────
    const transition = TRANSITIONS[fsmAction]?.[order.status];
    if (!transition) {
      throw fsmError(
        'FSM_TRANSITION_NOT_ALLOWED',
        400,
        `Transition '${fsmAction}' is not allowed from state '${order.status}'`
      );
    }

    // ── VALIDAR QUE EL ACTOR TIENE PERMISO SOBRE ESTA ORDEN ───────────────
    _assertActorOwnership(order, actorId, actorRole, fsmAction);

    // ── UPDATE ATÓMICO con guardas dinámicas ─────────────────────────────
    const locked = await guard.atomicTransition({
      orderId,
      expectedState: order.status,
      nextState:     transition.nextState,
      guardExtras:   transition.guard || {},
      conn,
    });

    if (!locked) {
      throw fsmError(
        'FSM_CONFLICT',
        409,
        `Concurrent modification detected for order ${orderId}. Please retry.`
      );
    }

    // ── EJECUTAR HANDLER FINANCIERO ───────────────────────────────────────
    const handler = HANDLERS[transition.handler];
    if (!handler) {
      throw fsmError(
        'FSM_HANDLER_NOT_FOUND',
        500,
        `Handler '${transition.handler}' not registered in handlerRegistry.js`
      );
    }

    const result = await handler({ order, actorId, actorRole, meta, conn });

    // ── COMMIT ────────────────────────────────────────────────────────────
    if (!isCustomConnection) {
      await conn.commit();
    }
    return {
      success:   true,
      newStatus: transition.nextState,
      financial: result,
    };

  } catch (err) {
    if (!isCustomConnection) {
      await conn.rollback();
    }
    throw err;
  } finally {
    if (!isCustomConnection) {
      conn.release();
    }
    await queueGuard.release(orderId, lockToken, redis);
  }
}

/**
 * Valida que el actor que ejecuta la acción sea el propietario correcto de la orden.
 * Previene que un cliente cancele la orden de otro cliente, etc.
 *
 * @param {object} order
 * @param {number} actorId
 * @param {string} actorRole
 * @param {string} action
 */
function _assertActorOwnership(order, actorId, actorRole, action) {
  if (actorRole === 'system') return; // el sistema siempre tiene permiso

  const ownershipMap = {
    customer: () => parseInt(order.customer_user_id) === parseInt(actorId),
    store:    () => parseInt(order.store_id) === parseInt(actorId),
    driver:   () => parseInt(order.driver_user_id) === parseInt(actorId) || parseInt(order.rescue_driver_id) === parseInt(actorId),
  };

  const check = ownershipMap[actorRole];
  if (!check || !check()) {
    const err = new Error(
      `Actor ${actorId} (role: ${actorRole}) is not authorized to execute '${action}' on order ${order.id}`
    );
    err.code       = 'FSM_UNAUTHORIZED';
    err.statusCode = 403;
    throw err;
  }
}

module.exports = { executeTransition };
