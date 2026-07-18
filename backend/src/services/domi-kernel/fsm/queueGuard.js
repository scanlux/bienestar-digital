// fsm/queueGuard.js
// Capa 1 de concurrencia: serialización por order_id usando Redis.
// Ver REGLAS_DE_NEGOCIO.md §8 — Capa 1: Cola de serialización.
//
// Implementación con Redis SET NX (set if not exists) + TTL como mutex distribuido.
// Una cancelación en proceso mantiene el lock por MAX_LOCK_TTL_MS milisegundos.
// Si el proceso falla, el TTL garantiza que el lock se libere automáticamente.

const MAX_LOCK_TTL_MS = 30_000; // 30 segundos máximo por operación
const LOCK_PREFIX     = 'fsm:lock:order:';

/**
 * Intenta adquirir el slot de procesamiento para una orden.
 * Utiliza SET NX (atómico) para garantizar que solo un proceso
 * puede tener el lock a la vez.
 *
 * @param {number} orderId
 * @param {object} redis - Instancia del cliente Redis (@redis/client)
 * @returns {Promise<string|null>} lockToken si adquirido, null si ya está en proceso
 */
async function acquire(orderId, redis) {
  const key   = `${LOCK_PREFIX}${orderId}`;
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  // SET key token NX PX ttl — compatible con @redis/client v4
  const result = await redis.set(key, token, {
    NX: true,
    PX: MAX_LOCK_TTL_MS
  });

  if (result !== 'OK') return null; // otra instancia ya tiene el lock
  return token;
}

/**
 * Libera el slot de procesamiento.
 * Verifica que el token sea el mismo que adquirió el lock
 * para evitar que un proceso libere el lock de otro.
 *
 * @param {number} orderId
 * @param {string} token   - Token devuelto por acquire()
 * @param {object} redis
 */
async function release(orderId, token, redis) {
  const key = `${LOCK_PREFIX}${orderId}`;

  // Script Lua: verificar y borrar de forma atómica
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  await redis.eval(luaScript, {
    keys: [key],
    arguments: [token]
  });
}

module.exports = { acquire, release };
