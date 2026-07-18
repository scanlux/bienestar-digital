const redisClient = require('../config/redis');
const db = require('../config/db');

function getCacheKey(ownerType, ownerId) {
  return `domi:balance:${ownerType}:${ownerId}`;
}

async function resolveOwner(ownerType, ownerId) {
  let resolvedType = ownerType;
  let resolvedId = ownerId;

  if (ownerType === 'store') {
    const [rows] = await db.query('SELECT usuario_id FROM stores WHERE id = ?', [ownerId]);
    resolvedType = 'user';
    resolvedId = rows[0]?.usuario_id || null;
  } else if (ownerType === 'commerce') {
    const [rows] = await db.query('SELECT usuario_id FROM commerces WHERE id = ?', [ownerId]);
    resolvedType = 'user';
    resolvedId = rows[0]?.usuario_id || null;
  } else if (ownerType === 'delivery_company') {
    const [rows] = await db.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [ownerId]);
    resolvedType = 'user';
    resolvedId = rows[0]?.usuario_id || null;
  }

  return { resolvedType, resolvedId };
}

/**
 * Obtiene el balance desde Redis. Si no existe, lo carga desde MariaDB y lo guarda en Redis.
 */
async function getWalletBalance(ownerType, ownerId) {
  const { resolvedType, resolvedId } = await resolveOwner(ownerType, ownerId);
  if (resolvedType === 'user' && !resolvedId) {
    return 0;
  }

  const cacheKey = getCacheKey(resolvedType, resolvedId);
  const cachedBalance = await redisClient.get(cacheKey);

  if (cachedBalance !== null) {
    return parseFloat(cachedBalance);
  }

  // Fallback a MariaDB
  let query = "";
  let params = [];
  if (resolvedType === 'user') {
    query = "SELECT balance_custody FROM wallets WHERE user_id = ?";
    params = [resolvedId];
  } else if (resolvedType === 'system') {
    query = "SELECT balance_utility as balance_custody FROM wallets WHERE is_system = 1";
    params = [];
  } else {
    throw new Error(`Tipo de dueño de billetera inválido en Redis: ${resolvedType}`);
  }
  const [rows] = await db.query(query, params);
  
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
  const { resolvedType, resolvedId } = await resolveOwner(ownerType, ownerId);
  if (resolvedType === 'user' && !resolvedId) {
    throw new Error(`No se pudo resolver el propietario para decrementar balance: ${ownerType} #${ownerId}`);
  }

  const cacheKey = getCacheKey(resolvedType, resolvedId);
  
  // Asegurarnos de que existe en cache antes de decrementar
  await getWalletBalance(resolvedType, resolvedId); 
  
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
  const { resolvedType, resolvedId } = await resolveOwner(ownerType, ownerId);
  if (resolvedType === 'user' && !resolvedId) {
    throw new Error(`No se pudo resolver el propietario para incrementar balance: ${ownerType} #${ownerId}`);
  }

  const cacheKey = getCacheKey(resolvedType, resolvedId);
  
  await getWalletBalance(resolvedType, resolvedId);
  
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
  const { resolvedType, resolvedId } = await resolveOwner(ownerType, ownerId);
  if (resolvedType === 'user' && !resolvedId) return;

  const cacheKey = getCacheKey(resolvedType, resolvedId);
  await redisClient.set(cacheKey, parseFloat(amount).toFixed(4));
}

/**
 * Obtiene la longitud de la cola de transacciones.
 */
async function getQueueLength() {
  try {
    return await redisClient.xLen('domi:tx_stream');
  } catch (err) {
    // Si el stream no existe aún, xLen puede fallar o retornar 0
    return 0;
  }
}

module.exports = {
  getWalletBalance,
  decrementBalance,
  incrementBalance,
  setBalance,
  getQueueLength
};
