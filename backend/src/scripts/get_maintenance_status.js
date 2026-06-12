const redisClient = require('../config/redis');

async function main() {
  try {
    const isMaintenance = await redisClient.get('system:maintenance_mode');
    const detailsJson = await redisClient.get('system:maintenance_details');
    const globalEpoch = await redisClient.get('system:global_revocation_epoch');
    const criticalEpoch = await redisClient.get('system:critical_revocation_epoch');

    console.log('--- REDIS MAINTENANCE STATUS ---');
    console.log('system:maintenance_mode:', isMaintenance);
    console.log('system:maintenance_details:', detailsJson);
    console.log('system:global_revocation_epoch:', globalEpoch);
    console.log('system:critical_revocation_epoch:', criticalEpoch);
    console.log('--------------------------------');
  } catch (err) {
    console.error('Error reading Redis:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
