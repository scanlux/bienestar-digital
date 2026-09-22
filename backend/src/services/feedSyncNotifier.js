const { getIO } = require('../config/socketio');
const { SOCKET_EVENTS } = require('../utils/socketEvents');
const { invalidatePublicCommercesCache } = require('../utils/cacheInvalidator');
const redisClient = require('../config/redis');
const { isStoreCurrentlyOpen } = require('../utils/timeUtils');
const storeRepository = require('../domains/store/store.repository');
const appLogger = require('../utils/appLogger');

async function notifyStoreUpdated(storeId) {
  try {
    const targetStoreId = Number(storeId);
    if (isNaN(targetStoreId)) return;

    // 1. Invalida cache de comercios pública
    await invalidatePublicCommercesCache();

    // 2. Obtiene datos del store y su horario
    const store = await storeRepository.findById(targetStoreId);
    if (!store) {
      appLogger.warn(`[WS_FEED] Intentando notificar store inexistente: ${targetStoreId}`);
      return;
    }
    const schedule = await storeRepository.findStoreHours(targetStoreId);
    
    // 3. Calcula isOpen
    const isOpen = isStoreCurrentlyOpen(store.estado, schedule);

    // 4. Guarda en Redis el estado liviano
    const cacheKey = `feed:store:${targetStoreId}`;
    const payload = {
      storeId: targetStoreId,
      isOpen,
      updatedAt: new Date().toISOString()
    };
    await redisClient.set(cacheKey, JSON.stringify(payload), { EX: 300 }); // TTL 300s (5 minutos)
    appLogger.info(`[REDIS] Guardado estado liviano de store en Redis: ${cacheKey}`);

    // 5. Emitir el evento de WebSockets
    const io = getIO();
    if (io) {
      io.to('feed:public').emit(SOCKET_EVENTS.STORE_UPDATED, payload);
      appLogger.info(`[WS_FEED] Evento store:updated emitido para store ${targetStoreId}. isOpen: ${isOpen}`);
    }
  } catch (err) {
    appLogger.error(`[WS_FEED_ERROR] Error al notificar actualización de store ${storeId}:`, err);
  }
}

module.exports = { notifyStoreUpdated };
