const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const redisClient = require('../../config/redis');
const adminRepository = require('./admin.repository');
const { hasPermission } = require('../../middleware/auth');
const appLogger = require('../../utils/appLogger');
const { logSecurityEvent } = require('../../utils/securityLogger');

// GET /system/maintenance/status
router.get('/status', hasPermission('view_maintenance_status'), async (req, res) => {
  try {
    const isMaintenance = await redisClient.get('system:maintenance_mode');
    const detailsJson = await redisClient.get('system:maintenance_details');
    const details = detailsJson ? JSON.parse(detailsJson) : null;
    const globalRevocationEpoch = await redisClient.get('system:global_revocation_epoch');

    // Diagnosticos basicos
    const diagnostics = {
      database: 'FAILED',
      redis: 'FAILED'
    };

    try {
      if (redisClient.isOpen) {
        diagnostics.redis = 'OK';
      }
    } catch (err) {}

    try {
      const isDbAlive = await adminRepository.ping();
      if (isDbAlive) {
        diagnostics.database = 'OK';
      }
    } catch (err) {}

    res.json({
      maintenanceMode: isMaintenance === 'true',
      details,
      globalRevocationEpoch: globalRevocationEpoch ? parseInt(globalRevocationEpoch, 10) : null,
      diagnostics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /system/maintenance/enable
router.post('/enable', hasPermission('manage_maintenance'), async (req, res) => {
  const { message, durationMinutes } = req.body;
  
  try {
    const duration = parseInt(durationMinutes, 10) || 15;
    const estimatedEnd = new Date(Date.now() + duration * 60 * 1000).toISOString();
    const startedAt = new Date().toISOString();

    const details = {
      message: message || 'El sistema se encuentra en mantenimiento programado.',
      estimated_end: estimatedEnd,
      started_at: startedAt
    };

    await redisClient.set('system:maintenance_mode', 'true');
    await redisClient.set('system:maintenance_details', JSON.stringify(details));

    // Desconectar a todos (actualizar epoch de revocacion global)
    const currentEpoch = Math.floor(Date.now() / 1000);
    await redisClient.set('system:global_revocation_epoch', currentEpoch.toString());

    appLogger.warn(`Mantenimiento INICIADO por el usuario de sistema ${req.user.id}. Duracion: ${duration} minutos. Mensaje: "${details.message}".`);

    await logSecurityEvent(
      req.user.id,
      'ENABLE_MAINTENANCE_MODE',
      'CRITICAL',
      req,
      { message, durationMinutes: duration, estimatedEnd, epoch: currentEpoch },
      'system',
      null
    );

    res.json({
      success: true,
      message: 'Modo mantenimiento activado y todas las sesiones previas han sido revocadas.',
      details
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /system/maintenance/disable
router.post('/disable', hasPermission('manage_maintenance'), async (req, res) => {
  try {
    await redisClient.set('system:maintenance_mode', 'false');
    await redisClient.del('system:maintenance_details');
    await redisClient.del('system:critical_revocation_epoch');

    appLogger.info(`Mantenimiento FINALIZADO por el usuario de sistema ${req.user.id}. Conexion restablecida para el publico.`);

    await logSecurityEvent(
      req.user.id,
      'DISABLE_MAINTENANCE_MODE',
      'CRITICAL',
      req,
      { action: 'restore_public_access' },
      'system',
      null
    );

    res.json({
      success: true,
      message: 'Modo mantenimiento desactivado. El sistema esta ahora abierto al publico.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /system/maintenance/panic
router.post('/panic', hasPermission('manage_maintenance'), async (req, res) => {
  try {
    const currentEpoch = Math.floor(Date.now() / 1000);
    await redisClient.set('system:critical_revocation_epoch', currentEpoch.toString());

    appLogger.error(`CIERRE CRITICO DE EMERGENCIA (Boton de Panico) activado por el usuario de sistema ${req.user.id}.`);

    await logSecurityEvent(
      req.user.id,
      'CRITICAL_PANIC_REVOCATION',
      'CRITICAL',
      req,
      { epoch: currentEpoch },
      'system',
      null
    );

    res.json({
      success: true,
      message: 'Revocacion critica absoluta completada. Todas las sesiones han sido destruidas.',
      epoch: currentEpoch
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /system/maintenance/logs
router.get('/logs', hasPermission('view_system_logs'), async (req, res) => {
  try {
    const logFile = path.join(__dirname, '../../../logs/combined.log');
    if (!fs.existsSync(logFile)) {
      return res.json({ logs: ['[SYSTEM] Archivo de logs no encontrado.'] });
    }

    // Leer ultimas 100 lineas
    const data = fs.readFileSync(logFile, 'utf8');
    const lines = data.split('\n').filter(line => line.trim().length > 0);
    const lastLines = lines.slice(-100);

    await logSecurityEvent(
      req.user.id,
      'VIEW_SYSTEM_LOGS',
      'HIGH',
      req,
      { linesCount: lastLines.length },
      'system',
      null
    );

    res.json({ logs: lastLines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
