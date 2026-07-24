const sessionStampService = require('../../../services/sessionStampService');

/**
 * Resuelve u obtiene/crea de forma atómica el session stamp del usuario en Redis/DB.
 */
async function getOrCreateSessionStamp(actorType, userId) {
  let stamp = await sessionStampService.getStamp(actorType, userId);
  if (!stamp) {
    stamp = await sessionStampService.setStamp(actorType, userId);
  }
  return stamp;
}

module.exports = getOrCreateSessionStamp;
