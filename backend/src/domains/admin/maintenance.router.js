const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const redisClient = require('../../config/redis');
const adminRepository = require('./admin.repository');
const { hasPermission, rootOnly } = require('../../middleware/auth');
const appLogger = require('../../utils/appLogger');
const { logSecurityEvent } = require('../../utils/securityLogger');

const lastLogsViewByUser = new Map();

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
      maintenanceMode: isMaintenance === 'true' || isMaintenance === 'quiescing',
      maintenanceState: isMaintenance,
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

    // 1. Establecer en estado intermedio QUIESCING
    await redisClient.set('system:maintenance_mode', 'quiescing');
    await redisClient.set('system:maintenance_details', JSON.stringify(details));

    // Desconectar a todos (actualizar epoch de revocacion global)
    const currentEpoch = Math.floor(Date.now() / 1000);
    await redisClient.set('system:global_revocation_epoch', currentEpoch.toString());

    appLogger.warn(`Mantenimiento INICIADO (Fase QUIESCING) por el usuario de sistema ${req.user.id}. Duracion: ${duration} minutos.`);

    await logSecurityEvent(
      req.user.id,
      'MAINTENANCE_QUIESCING_ACTIVATED',
      'CRITICAL',
      req,
      { message, durationMinutes: duration, estimatedEnd, epoch: currentEpoch },
      'system',
      null
    );

    // 2. Transición asíncrona a modo MAINTENANCE completo tras 10 segundos
    setTimeout(async () => {
      try {
        const currentMode = await redisClient.get('system:maintenance_mode');
        // Asegurarse de que no fue desactivado o cancelado durante la quietud
        if (currentMode === 'quiescing') {
          await redisClient.set('system:maintenance_mode', 'true');
          const pendingQueueLen = await redisClient.xLen('domi:tx_stream').catch(() => 0);
          appLogger.warn(`[MAINTENANCE] Fase de quietud completada. Transacciones en cola: ${pendingQueueLen}. Modo mantenimiento completo ACTIVO.`);
        }
      } catch (err) {
        appLogger.error(`[MAINTENANCE_QUIESCE_ERROR] Fallo al pasar a mantenimiento completo: ${err.message}`);
      }
    }, 10000);

    res.json({
      success: true,
      message: 'Fase de quietud iniciada. El modo mantenimiento completo se activará en 10 segundos y las sesiones previas han sido revocadas.',
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

    // Leer ultimas 100 lineas de forma asincrona y no bloqueante mediante streams
    const lastLines = await new Promise((resolve, reject) => {
      const instream = fs.createReadStream(logFile);
      const rl = readline.createInterface({
        input: instream,
        terminal: false
      });
      const buffer = [];
      rl.on('line', (line) => {
        if (line.trim().length > 0) {
          buffer.push(line);
          if (buffer.length > 100) {
            buffer.shift();
          }
        }
      });
      rl.on('close', () => {
        resolve(buffer);
      });
      rl.on('error', (err) => {
        reject(err);
      });
    });

    const userId = req.user.id;
    const now = Date.now();
    const lastView = lastLogsViewByUser.get(userId);

    if (!lastView || (now - lastView > 60000)) {
      lastLogsViewByUser.set(userId, now);
      await logSecurityEvent(
        userId,
        'VIEW_SYSTEM_LOGS',
        'HIGH',
        req,
        { linesCount: lastLines.length },
        'system',
        null
      );
    }

    res.json({ logs: lastLines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /system/maintenance/cronjobs
router.get('/cronjobs', rootOnly, async (req, res) => {
  try {
    const jobs = [
      {
        name: 'expire_upgrades',
        description: 'Verifica y expira las mejoras comerciales activas (como el estado empresarial) que hayan concluido su vigencia.',
        schedule: 'Cada 1 hora (Cronjob)',
        script: 'cron_expire_upgrades.js'
      },
      {
        name: 'cron_normalize',
        description: 'Normaliza el catálogo de productos eliminando stop-words y generando tags optimizados de búsqueda.',
        schedule: 'Diario a las 03:00 UTC (Cronjob)',
        script: 'cron_normalize.js'
      },
      {
        name: 'daily_popularity_update',
        description: 'Calcula y actualiza la popularidad y el volumen diario de ventas de cada producto en el catálogo.',
        schedule: 'Diario a las 00:00 UTC (Cronjob)',
        script: 'daily_popularity_update.js'
      }
    ];

    const results = [];
    for (const job of jobs) {
      const lastRun = await redisClient.get(`cron:${job.name}:last_run`);
      const status = await redisClient.get(`cron:${job.name}:status`);
      const message = await redisClient.get(`cron:${job.name}:message`);

      let history = [];
      try {
        const historyJson = await redisClient.lRange(`cron:${job.name}:history`, 0, -1);
        if (historyJson && historyJson.length > 0) {
          history = historyJson.map(h => JSON.parse(h));
        }
      } catch (historyErr) {
        console.error(`Error al leer historial para ${job.name}:`, historyErr.message);
      }

      results.push({
        ...job,
        lastRun: lastRun || null,
        status: status || 'unknown',
        message: message || null,
        history
      });
    }

    res.json({
      success: true,
      cronjobs: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const maintenanceService = require('./maintenance.service');

// GET /system/maintenance/bypass-rules
router.get('/bypass-rules', hasPermission('manage_maintenance'), async (req, res) => {
  try {
    const rules = await maintenanceService.getBypassRules();
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /system/maintenance/bypass-rules
router.post('/bypass-rules', hasPermission('manage_maintenance'), async (req, res) => {
  const { pattern, type, description } = req.body;
  try {
    const rule = await maintenanceService.addBypassRule(pattern, type, description);
    
    await logSecurityEvent(
      req.user.id,
      'MAINTENANCE_BYPASS_RULE_CREATED',
      'HIGH',
      req,
      { pattern, type, description, ruleId: rule.id },
      'maintenance_bypass_rule',
      rule.id
    );

    res.status(201).json({ success: true, message: 'Excepción de mantenimiento agregada con éxito.', rule });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// DELETE /system/maintenance/bypass-rules/:id
router.delete('/bypass-rules/:id', hasPermission('manage_maintenance'), async (req, res) => {
  const { id } = req.params;
  try {
    const ruleId = parseInt(id, 10);
    await maintenanceService.removeBypassRule(ruleId);

    await logSecurityEvent(
      req.user.id,
      'MAINTENANCE_BYPASS_RULE_DELETED',
      'HIGH',
      req,
      { ruleId },
      'maintenance_bypass_rule',
      ruleId
    );

    res.json({ success: true, message: 'Excepción de mantenimiento eliminada con éxito.' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = router;
