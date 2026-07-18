const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

module.exports = { pubClient, subClient };
