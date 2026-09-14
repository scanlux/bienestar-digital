const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const clientOptions = { url: redisUrl };
if (process.env.REDIS_PASSWORD) {
  clientOptions.password = process.env.REDIS_PASSWORD;
}

const pubClient = createClient(clientOptions);
const subClient = pubClient.duplicate();

module.exports = { pubClient, subClient };
