const db = require('../config/db');

/**
 * Registra un evento de seguridad en la base de datos y la consola del sistema.
 * 
 * @param {number|null} userId - ID del usuario autenticado (si aplica)
 * @param {string} eventType - Tipo de evento (ej: 'BOLA_ATTEMPT', 'UNAUTHORIZED_ROUTE_ACCESS')
 * @param {string} severity - Gravedad ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
 * @param {Object} req - Objeto Request de Express (para obtener IP y User Agent)
 * @param {Object|null} details - Datos adicionales en formato JSON
 * @param {string|null} resourceType - Tipo de entidad afectada (ej: 'commerce', 'store')
 * @param {number|null} resourceId - ID de la entidad afectada
 */
async function logSecurityEvent(
  userId, eventType, severity, req = null,
  details = null, resourceType = null, resourceId = null
) {
  let ipAddress = null;
  let userAgent = null;

  if (req) {
    // Intentar obtener la IP real (detrás de proxies como Nginx)
    ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    if (ipAddress && ipAddress.includes(',')) {
      // Si viene una cadena de proxies, tomar el primer elemento (IP real cliente)
      ipAddress = ipAddress.split(',')[0].trim();
    }
    userAgent = req.headers['user-agent'] || null;

    // Enriquecer detalles automáticamente con la URL de la petición si no se especificó
    if (!details) details = {};
    if (!details.url) details.url = req.originalUrl || req.url;
    if (!details.method) details.method = req.method;
  }

  try {
    const detailsJson = details ? JSON.stringify(details) : null;

    // Resolver actor de forma polimórfica
    let actorType = 'user';
    let actorId = userId || null;

    if (req && req.user) {
      actorType = req.user.actorType || 'user';
      actorId = req.user.id || userId || null;
    }

    await db.query(
      'INSERT INTO security_audit_logs (user_id, actor_type, actor_id, event_type, severity, ip_address, user_agent, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        actorType === 'user' ? (actorId || null) : null,
        actorType,
        actorId,
        eventType,
        severity,
        ipAddress,
        userAgent,
        detailsJson,
        resourceType,
        resourceId
      ]
    );

    // Escribir en logs del sistema con un formato premium y llamativo
    const resourceInfo = resourceType ? ` - Resource: ${resourceType} #${resourceId}` : '';
    console.warn(`\x1b[33m[SECURITY_ALERT] [${severity}] [${eventType}] - Actor: ${actorType} #${actorId || 'ANONYMOUS'}${resourceInfo} - IP: ${ipAddress || 'unknown'} - Details: ${JSON.stringify(details)}\x1b[0m`);
  } catch (error) {
    console.error('❌ Error guardando log de auditoría de seguridad:', error.message);
  }
}

module.exports = { logSecurityEvent };
