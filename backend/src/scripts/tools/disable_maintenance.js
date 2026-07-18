const redisClient = require('../config/redis');

async function main() {
  try {
    await redisClient.set('system:maintenance_mode', 'false');
    console.log('Maintenance mode disabled in Redis.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
