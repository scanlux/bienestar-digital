const { createClient } = require('redis');
const { REDIS_URL } = require('./env');

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

const initRedis = async () => {
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('[INFO] Redis clients connected successfully');
  } catch (err) {
    console.error('[CRITICAL] Failed to connect to Redis:', err);
    process.exit(1);
  }
};

module.exports = {
  pubClient,
  subClient,
  initRedis
};
