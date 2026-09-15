const axios = require('axios');

// Enviar logs de seguridad al backend principal por HTTP
const logTelemetrySecurityEvent = async (userId, eventType, severity, details = null, resourceType = null, resourceId = null) => {
  const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
  try {
    await axios.post(`${backendUrl}/api/public/internal/security-logs`, {
      userId,
      eventType,
      severity,
      details,
      resourceType,
      resourceId
    }, {
      headers: {
        'x-internal-key': process.env.INTERNAL_API_KEY || ''
      }
    });
    console.log(`[SECURITY_FORWARD] Evento ${eventType} enviado correctamente al backend principal.`);
  } catch (err) {
    console.error(`[SECURITY_FORWARD_ERROR] Fallo al reenviar evento ${eventType} al backend:`, err.message);
  }
};

module.exports = {
  logTelemetrySecurityEvent
};
