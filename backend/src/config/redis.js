const { createClient } = require('redis');

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  }
});

redisClient.on('error', (err) => {
  console.error('[REDIS ERROR]', err);
});

redisClient.on('connect', () => {
  console.log('[REDIS] Conectado exitosamente');
});

redisClient.on('ready', () => {
  console.log('[REDIS] Cliente listo para recibir comandos');
});

// Autoconectar
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('[REDIS INIT ERROR]', error);
  }
})();

module.exports = redisClient;
