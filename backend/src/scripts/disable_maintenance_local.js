const redisClient = require('../config/redis');

async function main() {
  try {
    await redisClient.set('system:maintenance_mode', 'false');
    console.log('Maintenance mode disabled in Redis.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
