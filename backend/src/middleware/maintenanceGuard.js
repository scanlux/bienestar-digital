const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

const matchesBypass = (url, requestPath) => {
  // Quitar query string para la comparacion
  const cleanPath = requestPath.split('?')[0];
  // Si el patron termina en '/', es un prefijo de namespace (ej: '/api/public/')
  if (url.endsWith('/')) return cleanPath.startsWith(url);
  // Si no, debe ser exacto o el siguiente caracter debe ser '/' o '?' (evita /api/public-otros)
  return cleanPath === url || cleanPath.startsWith(url + '/') || cleanPath.startsWith(url + '?');
};

const maintenanceGuard = async (req, res, next) => {
  try {
    const isMaintenance = await redisClient.get('system:maintenance_mode');
    if (isMaintenance !== 'true' && isMaintenance !== 'quiescing') {
      return next();
    }

    // 1. Obtener URLs exceptuadas dinámicamente desde Redis
    const fallbackApis = [
      '/api/auth/login',
      '/api/public/maintenance-status',
      '/api/manage/system/maintenance/status',
      '/api/manage/system/maintenance/disable',
      '/api/manage/system/maintenance/panic',
      '/api/manage/system/maintenance/logs',
      '/api/manage/system/maintenance/bypass-rules',
      '/api/public/maintenance-bypass-rules'
    ];

    let bypassApisJson = null;
    let detailsJson = null;
    try {
      const results = await redisClient.mGet([
        'system:maintenance_bypass_apis',
        'system:maintenance_details'
      ]);
      bypassApisJson = results[0];
      detailsJson = results[1];
    } catch (redisErr) {
      console.error('[MAINTENANCE_GUARD] Error al hacer mGet en Redis:', redisErr.message);
    }

    let bypassUrls = fallbackApis;
    if (bypassApisJson) {
      try {
        bypassUrls = JSON.parse(bypassApisJson);
      } catch (parseErr) {
        console.error('[MAINTENANCE_GUARD] Error al parsear bypass_apis de Redis:', parseErr.message);
      }
    }

    if (bypassUrls.some(url => matchesBypass(url, req.path))) {
      return next();
    }

    // 2. Comprobar si el token JWT pertenece a un usuario de sistema
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (verified && verified.actorType === 'system_user') {
          return next(); // Permitir el paso a los administradores del sistema
        }
      } catch (err) {
        // Ignorar errores del token
      }
    }

    // 3. Responder con error HTTP 503 Service Unavailable y Retry-After header
    const details = detailsJson ? JSON.parse(detailsJson) : { message: 'El sistema se encuentra en mantenimiento programado.' };

    const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().replace('Z', '');
    console.warn(`\x1b[33m[WARN]\x1b[0m [${timestamp}] [MAINTENANCE_GUARD] Bloqueando petición por mantenimiento: ${req.method} ${req.originalUrl}`);

    res.setHeader('Retry-After', '300'); // 5 minutos
    res.status(503).json({
      code: 'SYSTEM_IN_MAINTENANCE',
      error: details.message || 'Servicio temporalmente no disponible por mantenimiento.',
      estimated_end: details.estimated_end,
      started_at: details.started_at
    });
  } catch (error) {
    console.error('[MAINTENANCE_GUARD_ERROR]', error);
    next();
  }
};

module.exports = maintenanceGuard;
