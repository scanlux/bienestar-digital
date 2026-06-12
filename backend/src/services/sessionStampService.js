const redisClient = require('../config/redis');
const db = require('../config/db');
const crypto = require('crypto');

function getCacheKey(userType, userId) {
  return `session_stamps:${userType}:${userId}`;
}

async function getStamp(userType, userId) {
  const cacheKey = getCacheKey(userType, userId);
  return await redisClient.get(cacheKey);
}

async function setStamp(userType, userId) {
  const stamp = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const cacheKey = getCacheKey(userType, userId);
  await redisClient.set(cacheKey, stamp, { EX: 604800 });
  return stamp;
}

async function invalidateUser(userType, userId) {
  return await setStamp(userType, userId);
}

function invalidateUsersAsync(users) {
  setImmediate(async () => {
    try {
      if (!users || users.length === 0) {
        return;
      }
      
      console.log(`[sessionStampService] Iniciando invalidacion asincrona de ${users.length} usuarios`);
      
      const batchSize = 50;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const multi = redisClient.multi();
        
        for (const user of batch) {
          const stamp = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
          const cacheKey = getCacheKey(user.user_type, user.user_id);
          multi.set(cacheKey, stamp, { EX: 604800 });
        }
        
        await multi.exec();
      }
      
      console.log(`[sessionStampService] Invalidacion completada exitosamente para ${users.length} usuarios`);
    } catch (error) {
      console.error('[sessionStampService] Error al invalidar usuarios asincronamente:', error);
    }
  });
}

function invalidateRoleUsersAsync(roleId) {
  setImmediate(async () => {
    try {
      const [rows] = await db.query(
        'SELECT user_type, user_id FROM user_roles WHERE role_id = ?',
        [roleId]
      );
      
      if (!rows || rows.length === 0) {
        console.log(`[sessionStampService] No hay usuarios vinculados al rol ${roleId} para invalidar.`);
        return;
      }
      
      invalidateUsersAsync(rows);
    } catch (error) {
      console.error('[sessionStampService] Error al obtener usuarios del rol para invalidar:', error);
    }
  });
}

module.exports = {
  getStamp,
  setStamp,
  invalidateUser,
  invalidateUsersAsync,
  invalidateRoleUsersAsync
};
