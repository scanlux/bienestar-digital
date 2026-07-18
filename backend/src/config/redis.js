const { createClient } = require('redis');
const appLogger = require('../utils/appLogger');

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  }
});

redisClient.on('error', (err) => {
  appLogger.error(`[REDIS ERROR] ${err.message}`);
});

redisClient.on('connect', () => {
  appLogger.info('[REDIS] Conectado exitosamente');
});

redisClient.on('ready', () => {
  appLogger.info('[REDIS] Cliente listo para recibir comandos');
});

// Autoconectar
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    appLogger.error(`[REDIS INIT ERROR] ${error.message}`);
  }
})();

module.exports = redisClient;
