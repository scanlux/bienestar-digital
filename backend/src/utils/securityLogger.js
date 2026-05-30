const db = require('../config/db');

/**
 * Registra un evento de seguridad en la base de datos y la consola del sistema.
 * 
 * @param {number|null} userId - ID del usuario autenticado (si aplica)
 * @param {string} eventType - Tipo de evento (ej: 'BOLA_ATTEMPT', 'UNAUTHORIZED_ROUTE_ACCESS')
 * @param {string} severity - Gravedad ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
 * @param {Object} req - Objeto Request de Express (para obtener IP y User Agent)
 * @param {Object|null} details - Datos adicionales en formato JSON
 */
async function logSecurityEvent(userId, eventType, severity, req = null, details = null) {
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

    await db.query(
      'INSERT INTO security_audit_logs (user_id, event_type, severity, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)',
      [userId || null, eventType, severity, ipAddress, userAgent, detailsJson]
    );

    // Escribir en logs del sistema con un formato premium y llamativo
    console.warn(`\x1b[33m[SECURITY_ALERT] [${severity}] [${eventType}] - User: ${userId || 'ANONYMOUS'} - IP: ${ipAddress || 'unknown'} - Details: ${JSON.stringify(details)}\x1b[0m`);
  } catch (error) {
    console.error('❌ Error guardando log de auditoría de seguridad:', error.message);
  }
}

module.exports = { logSecurityEvent };
