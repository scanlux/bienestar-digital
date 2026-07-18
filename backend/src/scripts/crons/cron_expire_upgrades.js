const db = require('../config/db');
const redisClient = require('../config/redis');

async function logCronStatus(name, status, message) {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const timestamp = new Date().toISOString();
    await redisClient.set(`cron:${name}:last_run`, timestamp);
    await redisClient.set(`cron:${name}:status`, status);
    await redisClient.set(`cron:${name}:message`, message);
    
    // Guardar en el historial (lista en Redis) y mantener un límite de 20 entradas
    const entry = JSON.stringify({ timestamp, status, message });
    await redisClient.lPush(`cron:${name}:history`, entry);
    await redisClient.lTrim(`cron:${name}:history`, 0, 19);

    console.log(`[REDIS LOG] Cron ${name} status set to ${status}: ${message}`);
  } catch (e) {
    console.error('Error logging status to Redis:', e.message);
  }
}

async function run() {
  let connection;
  try {
    connection = await db.getConnection();
    console.log('Iniciando cron de expiración de mejoras...');

    // Las mejoras expiran automáticamente al ser consultadas en tiempo real de forma dinámica.
    // Mantenemos este cronjob para monitoreo de estado y telemetría.
    const msg = 'Expiración de mejoras activa (cálculo en tiempo real)';
    console.log(`SUCCESS: ${msg}`);
    await logCronStatus('expire_upgrades', 'success', msg);
    
    // Cerrar conexiones para salir limpiamente
    if (connection) connection.release();
    if (redisClient.isOpen) await redisClient.quit();
    process.exit(0);
  } catch (err) {
    console.error('ERROR: Error en el cron de expiración de mejoras:', err);
    await logCronStatus('expire_upgrades', 'failure', err.message);
    if (connection) connection.release();
    if (redisClient.isOpen) await redisClient.quit();
    process.exit(1);
  }
}

run();
