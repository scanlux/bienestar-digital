const appLogger = require('../utils/appLogger');
const redisClient = require('../config/redis');
const db = require('../config/db');

const onStartup = async () => {
  appLogger.info('Iniciando arranque seguro del servidor arm-usa...');

  try {
    // 1. Forzar modo mantenimiento
    await redisClient.set('system:maintenance_mode', 'true');
    const details = {
      message: 'El sistema se encuentra en modo mantenimiento por reinicio de servicios.',
      estimated_end: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutos por defecto para desarrollo
      started_at: new Date().toISOString()
    };
    await redisClient.set('system:maintenance_details', JSON.stringify(details));
    appLogger.info('Estado de mantenimiento forzado a: ACTIVO (Bloqueo de Arranque).');

    // 2. Revocación global de sesiones (Epoch en segundos) - Paridad exacta de desarrollo y producción
    const currentEpoch = Math.floor(Date.now() / 1000);
    await redisClient.set('system:global_revocation_epoch', currentEpoch.toString());
    appLogger.info(`Epoca de revocacion global establecida a: ${currentEpoch} (${new Date(currentEpoch * 1000).toISOString()}). Todos los tokens previos quedan invalidados.`);

    // 3. Loop de diagnóstico de conectividad con la Base de Datos
    let dbConnected = false;
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        appLogger.info(`Verificando conexion a MariaDB (Intento ${attempt}/10)...`);
        const [rows] = await db.query('SELECT 1');
        if (rows) {
          dbConnected = true;
          appLogger.info('Diagnostico MariaDB: CONEXION EXITOSA.');
          break;
        }
      } catch (err) {
        appLogger.warn(`Diagnostico MariaDB fallido: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!dbConnected) {
      appLogger.error('[CRITICAL] No se pudo establecer conexion con MariaDB tras 10 intentos.');
    } else {
      appLogger.info('Chequeo de arranque seguro finalizado con exito. El sistema permanece bloqueado para revision administrativa.');
      try {
        const maintenanceService = require('../domains/admin/maintenance.service');
        await maintenanceService.syncBypassRulesToRedis();
      } catch (syncErr) {
        appLogger.error(`Error al sincronizar reglas de bypass en arranque: ${syncErr.message}`);
      }
    }
  } catch (err) {
    appLogger.error(`Error critico en la inicializacion de arranque seguro: ${err.message}`);
  }
};

module.exports = { onStartup };
