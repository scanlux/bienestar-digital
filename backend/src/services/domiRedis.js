const redisClient = require('../config/redis');
const db = require('../config/db');

function getCacheKey(ownerType, ownerId) {
  return `domi:balance:${ownerType}:${ownerId}`;
}

/**
 * Obtiene el balance desde Redis. Si no existe, lo carga desde MariaDB y lo guarda en Redis.
 */
async function getWalletBalance(ownerType, ownerId) {
  const cacheKey = getCacheKey(ownerType, ownerId);
  const cachedBalance = await redisClient.get(cacheKey);

  if (cachedBalance !== null) {
    return parseFloat(cachedBalance);
  }

  // Fallback a MariaDB
  const [rows] = await db.query(
    "SELECT balance_custody FROM wallets WHERE owner_type = ? AND owner_id = ?", 
    [ownerType, ownerId]
  );
  
  const balance = rows.length > 0 ? parseFloat(rows[0].balance_custody) : 0;
  
  // Guardar en Redis (Expira en 24 horas por limpieza, aunque se auto-renovará)
  await redisClient.set(cacheKey, balance, { EX: 86400 });
  
  return balance;
}

/**
 * Decrementa de forma atómica el balance en Redis.
 * Usamos INCRBYFLOAT con valor negativo.
 */
async function decrementBalance(ownerType, ownerId, amount) {
  const cacheKey = getCacheKey(ownerType, ownerId);
  
  // Asegurarnos de que existe en cache antes de decrementar
  await getWalletBalance(ownerType, ownerId); 
  
  const newBalanceStr = await redisClient.incrByFloat(cacheKey, -amount);
  const newBalance = parseFloat(newBalanceStr);
  
  // Evitar precision issues (e.g. 0.99999999999)
  const fixedBalance = parseFloat(newBalance.toFixed(4));
  if (fixedBalance !== newBalance) {
    await redisClient.set(cacheKey, fixedBalance);
  }
  
  return fixedBalance;
}

/**
 * Incrementa de forma atómica el balance en Redis (Usado para Mint o Refunds)
 */
async function incrementBalance(ownerType, ownerId, amount) {
  const cacheKey = getCacheKey(ownerType, ownerId);
  
  await getWalletBalance(ownerType, ownerId);
  
  const newBalanceStr = await redisClient.incrByFloat(cacheKey, amount);
  const newBalance = parseFloat(newBalanceStr);
  
  const fixedBalance = parseFloat(newBalance.toFixed(4));
  if (fixedBalance !== newBalance) {
    await redisClient.set(cacheKey, fixedBalance);
  }
  
  return fixedBalance;
}

/**
 * Fuerza una actualización del caché desde un valor dado (Sincronización manual)
 */
async function setBalance(ownerType, ownerId, amount) {
  const cacheKey = getCacheKey(ownerType, ownerId);
  await redisClient.set(cacheKey, parseFloat(amount).toFixed(4));
}

/**
 * Obtiene la longitud de la cola de transacciones.
 */
async function getQueueLength() {
  return await redisClient.lLen('domi:tx_queue');
}

module.exports = {
  getWalletBalance,
  decrementBalance,
  incrementBalance,
  setBalance,
  getQueueLength
};
