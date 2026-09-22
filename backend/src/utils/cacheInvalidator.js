const redisClient = require('../config/redis');
const appLogger = require('./appLogger');

async function invalidatePublicCommercesCache() {
  try {
    await redisClient.del('public:commerces:full');
    appLogger.info('[CACHE] public:commerces:full cache key invalidated.');
  } catch (err) {
    appLogger.error('[CACHE] Error invalidating public:commerces:full cache key:', err);
  }
}

module.exports = { invalidatePublicCommercesCache };
