const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

const maintenanceGuard = async (req, res, next) => {
  try {
    const isMaintenance = await redisClient.get('system:maintenance_mode');
    if (isMaintenance !== 'true') {
      return next();
    }

    // 1. URLs exceptuadas del modo mantenimiento
    const bypassUrls = [
      '/api/auth/system-login',
      '/api/public/maintenance-status',
      '/api/manage/system/maintenance/status',
      '/api/manage/system/maintenance/disable',
      '/api/manage/system/maintenance/panic',
      '/api/manage/system/maintenance/logs'
    ];

    if (bypassUrls.some(url => req.originalUrl.startsWith(url))) {
      return next();
    }

    // 2. Comprobar si el token JWT pertenece a un usuario de sistema
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (verified && verified.actorType === 'system_user') {
          return next(); // Permitir el paso a los administradores del sistema
        }
      } catch (err) {
        // Ignorar errores del token
      }
    }

    // 3. Responder con error HTTP 503 Service Unavailable
    const detailsJson = await redisClient.get('system:maintenance_details');
    const details = detailsJson ? JSON.parse(detailsJson) : { message: 'El sistema se encuentra en mantenimiento programado.' };

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
