const redisClient = require('../config/redis');
const domiEngine = require('./domiEngine');
const appLogger = require('../utils/appLogger');

const STREAM_NAME = 'domi:tx_stream';
const GROUP_NAME = 'domi-workers';
const CONSUMER_NAME = `worker-${process.pid}`;

let isRunning = false;
let workerRedis = null;

/**
 * Determina si el error es de lógica de negocios o de integridad relacional (check constraint, etc.)
 * y por tanto no debe ser reintentado.
 */
function isFatalError(err) {
  const errMsg = err.message || '';
  const errCode = err.code || '';
  return (
    errMsg.includes('DOMI_ERROR') ||
    errMsg.includes('DOMI_ENGINE') ||
    errMsg.includes('DOMI:') ||
    errMsg.includes('no encontrada') ||
    errMsg.includes('no encontrado') ||
    errMsg.includes('ER_SIGNAL_EXCEPTION') ||
    errMsg.includes('chk_balances') ||
    errMsg.includes('CONSTRAINT') ||
    errMsg.includes('constraint') ||
    errMsg.includes('foreign key') ||
    errMsg.includes('WARN_DATA_TRUNCATED') ||
    errMsg.includes('DATA_TRUNCATED') ||
    errCode.startsWith('ER_') ||
    errCode === 'WARN_DATA_TRUNCATED'
  );
}

/**
 * Inicializa el Stream y el Consumer Group si no existen.
 */
async function initQueue(client) {
  try {
    await client.xGroupCreate(STREAM_NAME, GROUP_NAME, '0', { MKSTREAM: true });
    appLogger.info(`[WORKER_INIT] Redis Stream Group '${GROUP_NAME}' creado/verificado.`);
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      appLogger.error(`[WORKER_INIT_ERROR] Error al crear el grupo de stream: ${err.message}`);
      throw err;
    }
  }
}

/**
 * Reclama y procesa transacciones huérfanas pendientes en el PEL (Pending Entries List).
 */
async function reclaimOrphanedTransactions(client) {
  try {
    const isMaintenance = await client.get('system:maintenance_mode');
    if (isMaintenance === 'true') {
      appLogger.warn('[WORKER_RECOVERY] Sistema en mantenimiento activo. Recuperación de transacciones huérfanas pospuesta.');
      return;
    }

    appLogger.info('[WORKER_RECOVERY] Buscando transacciones huérfanas en el PEL...');
    const claimResult = await client.xAutoClaim(
      STREAM_NAME,
      GROUP_NAME,
      CONSUMER_NAME,
      30000, // 30 segundos
      '0-0',
      { COUNT: 100 }
    );

    if (claimResult && claimResult.messages && claimResult.messages.length > 0) {
      appLogger.info(`[WORKER_RECOVERY] Reclamadas ${claimResult.messages.length} transacciones huérfanas. Procesando...`);
      for (const msg of claimResult.messages) {
        const payload = JSON.parse(msg.message.payload);
        if (payload.action === 'charge_order') {
          try {
            appLogger.info(`[WORKER_RECOVERY] Procesando pedido huérfano #${payload.orderId}...`);
            await domiEngine.processChargeSync(
              payload.orderId,
              payload.storeId,
              payload.driverUserId,
              payload.storeCost,
              payload.driverCost
            );
            await client.xAck(STREAM_NAME, GROUP_NAME, msg.id);
            appLogger.info(`[WORKER_RECOVERY] Pedido huérfano #${payload.orderId} procesado con éxito.`);
          } catch (err) {
            appLogger.error(`[WORKER_RECOVERY_ERROR] Error al procesar pedido huérfano #${payload.orderId}: ${err.message}`);
            if (isFatalError(err)) {
              appLogger.error(`[WORKER_RECOVERY_FAIL_FATAL] Transacción huérfana inválida detectada. Haciendo ACK para descartar. Pedido #${payload.orderId}`);
              await client.xAck(STREAM_NAME, GROUP_NAME, msg.id);
            }
          }
        } else if (payload.action === 'charge_delivery_company_order') {
          try {
            appLogger.info(`[WORKER_RECOVERY] Procesando pedido huérfano de empresa #${payload.orderId}...`);
            await domiEngine.processChargeDeliveryCompanySync(
              payload.orderId,
              payload.deliveryCompanyId,
              payload.cost
            );
            await client.xAck(STREAM_NAME, GROUP_NAME, msg.id);
            appLogger.info(`[WORKER_RECOVERY] Pedido huérfano de empresa #${payload.orderId} procesado con éxito.`);
          } catch (err) {
            appLogger.error(`[WORKER_RECOVERY_ERROR] Error al procesar pedido huérfano de empresa #${payload.orderId}: ${err.message}`);
            if (isFatalError(err)) {
              appLogger.error(`[WORKER_RECOVERY_FAIL_FATAL] Transacción huérfana de empresa inválida detectada. Haciendo ACK para descartar. Pedido #${payload.orderId}`);
              await client.xAck(STREAM_NAME, GROUP_NAME, msg.id);
            }
          }
        }
      }
    } else {
      appLogger.info('[WORKER_RECOVERY] No se encontraron transacciones huérfanas en el PEL.');
    }
  } catch (claimErr) {
    appLogger.error(`[WORKER_RECOVERY_FAIL] Error durante auto-claim de transacciones huérfanas: ${claimErr.message}`);
  }
}

/**
 * Worker Asíncrono para procesar transacciones financieras.
 * Extrae elementos del Redis Stream y los aplica en MariaDB.
 */
async function startWorker() {
  if (isRunning) return;
  isRunning = true;
  appLogger.info(`[WORKER_START] Iniciando procesamiento persistente del stream: ${STREAM_NAME}...`);
  
  // Usar conexión dedicada para comandos bloqueantes
  if (!workerRedis) {
      workerRedis = redisClient.duplicate();
      await workerRedis.connect();
      workerRedis.on('error', (err) => appLogger.error(`[WORKER_REDIS_ERROR] ${err.message}`));
  }

  // Inicializar cola y reclamar huérfanos antes del loop principal
  await initQueue(redisClient);
  await reclaimOrphanedTransactions(redisClient);
  
  let wasInMaintenance = false;
  
  while (isRunning) {
    try {
      // Verificar mantenimiento en cada iteración
      const isMaintenance = await redisClient.get('system:maintenance_mode');
      if (isMaintenance === 'true') {
        if (!wasInMaintenance) {
          appLogger.warn('[WORKER] Sistema entra en mantenimiento completo. Worker pausado.');
          wasInMaintenance = true;
        } else {
          // Mostrar en consola sin guardar en archivo de logs
          const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().replace('Z', '');
          console.warn(`\x1b[33m[WARN]\x1b[0m [${timestamp}] [WORKER] Sistema en mantenimiento completo. Worker pausado 5s...`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue; // No procesar — esperar a que el mantenimiento se desactive
      }

      if (wasInMaintenance) {
        appLogger.info('[WORKER] Mantenimiento finalizado. Reanudando procesamiento de cola...');
        wasInMaintenance = false;
      }

      // Leer mensaje con consumer group (bloqueo de 1 seg)
      const readResult = await workerRedis.xReadGroup(
        GROUP_NAME,
        CONSUMER_NAME,
        [{ key: STREAM_NAME, id: '>' }],
        { COUNT: 1, BLOCK: 1000 }
      );
      
      if (readResult && readResult.length > 0) {
        const messages = readResult[0].messages;
        for (const msg of messages) {
          const payload = JSON.parse(msg.message.payload);
          
          if (payload.action === 'charge_order') {
            try {
              await domiEngine.processChargeSync(
                payload.orderId, 
                payload.storeId, 
                payload.driverUserId, 
                payload.storeCost, 
                payload.driverCost
              );
              
              // Confirmar lectura y procesamiento exitoso
              await workerRedis.xAck(STREAM_NAME, GROUP_NAME, msg.id);
              appLogger.info(`[TRANSACTION_PROCESSED] Pedido #${payload.orderId} persistido en MariaDB con éxito.`);
            } catch (businessErr) {
              appLogger.error(`[WORKER_ERROR] Reglas de Negocio / Trigger (Pedido #${payload.orderId}): ${businessErr.message}`);
              
              // Si es un error crítico de lógica de negocios o integridad de BD, hacemos ACK para descartarlo del stream
              if (isFatalError(businessErr)) {
                 appLogger.error(`[WORKER_FAIL_FATAL] Transacción inválida detectada (BD / Negocio). Haciendo ACK para descartar. Pedido #${payload.orderId}`);
                 await workerRedis.xAck(STREAM_NAME, GROUP_NAME, msg.id);
              } else {
                 // Error de infraestructura/red (no de negocio): no hacemos ACK para reintento en el próximo ciclo o por otro worker.
                 appLogger.warn(`[WORKER_RETRY] Error recuperable para Pedido #${payload.orderId}. Esperando 5s antes de reintentar.`);
                 await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          } else if (payload.action === 'charge_delivery_company_order') {
            try {
              await domiEngine.processChargeDeliveryCompanySync(
                payload.orderId,
                payload.deliveryCompanyId,
                payload.cost
              );
              
              await workerRedis.xAck(STREAM_NAME, GROUP_NAME, msg.id);
              appLogger.info(`[TRANSACTION_PROCESSED] Pedido de empresa de reparto #${payload.orderId} persistido en MariaDB con éxito.`);
            } catch (businessErr) {
              appLogger.error(`[WORKER_ERROR] Reglas de Negocio / Trigger (Pedido de empresa #${payload.orderId}): ${businessErr.message}`);
              
              if (isFatalError(businessErr)) {
                 appLogger.error(`[WORKER_FAIL_FATAL] Transacción de empresa inválida detectada (BD / Negocio). Haciendo ACK para descartar. Pedido #${payload.orderId}`);
                 await workerRedis.xAck(STREAM_NAME, GROUP_NAME, msg.id);
              } else {
                 appLogger.warn(`[WORKER_RETRY] Error recuperable para Pedido de empresa #${payload.orderId}. Esperando 5s antes de reintentar.`);
                 await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          } else {
             appLogger.warn(`[WORKER_WARN] Acción no reconocida en stream: ${payload.action}`);
             await workerRedis.xAck(STREAM_NAME, GROUP_NAME, msg.id);
          }
        }
      }
    } catch (err) {
      if (!isRunning) break; // Si está apagándose, salir sin loguear error de conexión interrumpida
      
      if (err.message.includes('NOGROUP')) {
        try {
          appLogger.warn('[WORKER_RECOVERY] Stream o Grupo de Redis limpio por reset. Re-creando estructura...');
          await initQueue(redisClient);
        } catch (initErr) {
          appLogger.error(`[WORKER_RECOVERY_ERROR] Fallo al re-inicializar cola en recuperación: ${initErr.message}`);
        }
      } else {
        appLogger.error(`[WORKER_ERROR] Falla crítica en el loop del worker: ${err.message}`);
        // Resiliencia: Esperar 2 segundos antes de reintentar ante otros fallos (ej: conexión)
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  appLogger.info(`[WORKER_STOP] Procesamiento de stream ${STREAM_NAME} detenido.`);
  if (workerRedis && workerRedis.isOpen) {
      await workerRedis.quit();
      workerRedis = null;
  }
}

/**
 * Señal para detener el ciclo infinito del worker.
 */
function stopWorker() {
  console.log(`[WORKER_SIGNAL] Solicitud de detención recibida para el worker...`);
  isRunning = false;
}

module.exports = {
  startWorker,
  stopWorker,
  initQueue
};

