const redisClient = require('../config/redis');
const domiEngine = require('./domiEngine');

const QUEUE_NAME = 'domi:tx_queue';

let isRunning = false;
let workerRedis = null;

/**
 * Worker Asíncrono para procesar transacciones financieras.
 * Extrae elementos de la cola y los aplica en MariaDB.
 */
async function startWorker() {
  if (isRunning) return;
  isRunning = true;
  console.log(`[WORKER_START] Iniciando procesamiento persistente de la cola: ${QUEUE_NAME}...`);
  
  // Usar conexión dedicada para comandos bloqueantes
  if (!workerRedis) {
      workerRedis = redisClient.duplicate();
      await workerRedis.connect();
      workerRedis.on('error', (err) => console.error('[WORKER_REDIS_ERROR]', err));
  }
  
  while (isRunning) {
    try {
      // blPop con timeout (1 seg) para permitir que el loop evalúe isRunning en caso de shutdown
      const result = await workerRedis.blPop(QUEUE_NAME, 1);
      
      if (result) {
        const payload = JSON.parse(result.element);
        
        if (payload.action === 'charge_order') {
          try {
            await domiEngine.processChargeSync(
              payload.orderId, 
              payload.storeId, 
              payload.driverUserId, 
              payload.storeCost, 
              payload.driverCost
            );
            console.log(`[TRANSACTION_PROCESSED] Pedido #${payload.orderId} persistido en MariaDB con éxito.`);
          } catch (businessErr) {
            // Manejar error SQL/Negocio: Respeto a la Inmutabilidad
            console.error(`[WORKER_ERROR] Reglas de Negocio / Trigger (Pedido #${payload.orderId}):`, businessErr.message);
            
            // Si NO es un error intencional del trigger SQL (ej. DOMI_ERROR), re-encolamos
            if (!businessErr.message.includes('DOMI_ERROR') && !businessErr.message.includes('ER_SIGNAL_EXCEPTION')) {
               console.warn(`[WORKER_RETRY] Re-encolando Pedido #${payload.orderId} debido a error no esperado.`);
               await workerRedis.rPush(QUEUE_NAME, result.element);
            }
          }
        } else {
           console.warn(`[WORKER_WARN] Acción no reconocida en cola: ${payload.action}`);
        }
      }
    } catch (err) {
      if (!isRunning) break; // Si está apagándose, salir sin loguear error de conexión interrumpida
      console.error('[WORKER_ERROR] Falla crítica en el loop del worker (Conexión Redis):', err.message);
      // Resiliencia: Esperar 2 segundos antes de intentar reconectar (re-loop)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`[WORKER_STOP] Procesamiento de cola ${QUEUE_NAME} detenido.`);
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
  stopWorker
};
