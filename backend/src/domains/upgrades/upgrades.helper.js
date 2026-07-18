const db = require('../../config/db');
const redisClient = require('../../config/redis');

/**
 * Calcula el límite de sedes operativas de un comercio basándose en sus mejoras activas y las reglas de negocio globales.
 * Fuente única de verdad.
 * 
 * @param {Object} systemParams Parámetros leídos de protocol_rules (free_tier_stores_limit, business_status_bonus_stores)
 * @param {Array} upgrades Listado de mejoras activas de la entidad
 * @returns {number} Límite máximo de sedes operativas
 */
function calculateStoresLimit(systemParams, upgrades) {
  const freeLimit = parseInt(systemParams?.free_tier_stores_limit || '1', 10);
  const bonusStores = parseInt(systemParams?.business_status_bonus_stores || '1', 10);
  
  const hasBusinessStatus = upgrades.some(u => u.upgrade_type === 'estado_empresarial');
  const additionalStores = upgrades.filter(u => u.upgrade_type === 'adicionar_sede').length;
  
  return freeLimit + (hasBusinessStatus ? bonusStores : 0) + additionalStores;
}

/**
 * Recupera un parámetro de sistema de forma cacheada y segura.
 */
async function fetchSystemParam(key, defaultVal, connection = db) {
  const cacheKey = `sys:param:${key}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached !== null) return parseInt(cached, 10);
  } catch (err) {
    console.error('[REDIS ERROR] fetchSystemParam:', err.message);
  }

  try {
    const [rows] = await connection.query(
      'SELECT `value` FROM system_parameters WHERE `key` = ?',
      [key]
    );
    const val = rows[0] ? parseInt(rows[0].value, 10) : defaultVal;
    try {
      await redisClient.setEx(cacheKey, 60, String(val));
    } catch (_) {}
    return val;
  } catch (dbErr) {
    console.error('[DB ERROR] fetchSystemParam:', dbErr.message);
    return defaultVal;
  }
}

/**
 * Obtiene los parámetros del sistema requeridos para calcular límites de sedes.
 */
async function fetchStoreSystemParams(connection = db) {
  const freeLimit = await fetchSystemParam('free_tier_stores_limit', 1, connection);
  const bonusLimit = await fetchSystemParam('business_status_bonus_stores', 1, connection);
  return {
    free_tier_stores_limit: freeLimit,
    business_status_bonus_stores: bonusLimit
  };
}

module.exports = {
  calculateStoresLimit,
  fetchSystemParam,
  fetchStoreSystemParams
};
