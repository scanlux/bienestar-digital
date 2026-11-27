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

const MAX_STANDBY_THRESHOLD = 100 * 1024 * 1024; // 100 MB umbral de separacion entre Carril 1 y Carril 2

// Helper para cargar mapa de metadatos (sizeBytes, lastModified) desde file_index.json
function loadDeviceIndexMetaMap(safeId) {
  const targetDir = getDatasetDir();
  const indexPath = path.join(targetDir, 'devices', safeId, 'file_index.json');
  const metaMap = new Map();

  if (fs.existsSync(indexPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const list = Array.isArray(raw) ? raw : (raw.files || []);
      for (const item of list) {
        if (item && !item.isDirectory && item.absolutePath) {
          metaMap.set(item.absolutePath, {
            sizeBytes: Number(item.sizeBytes) || 0,
            lastModified: Number(item.lastModified) || 0
          });
        }
      }
    } catch (e) {
      console.warn(`[WARN] No se pudo leer file_index.json para ${safeId}: ${e.message}`);
    }
  }
  return metaMap;
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
  let updatedMeta = false;

  for (const item of indexList) {
    if (!item || item.isDirectory) continue;
    const filePath = item.absolutePath;
    if (!filePath) continue;

    const sizeBytes = Number(item.sizeBytes) || 0;
    const lastModified = Number(item.lastModified) || 0;

    // Si ya reside en el servidor segun downloaded_files.json
    if (downloadedMap[filePath]) {
      if (reqMap.has(filePath)) {
        const reqObj = reqMap.get(filePath);
        if (reqObj.status !== 'COMPLETED') {
          reqObj.status = 'COMPLETED';
          reqObj.completedAt = reqObj.completedAt || new Date().toISOString();
          updatedMeta = true;
        }
      }
      continue;
    }

    const existingReq = reqMap.get(filePath);
    if (!existingReq) {
      const isLarge = sizeBytes > MAX_STANDBY_THRESHOLD;
      const status = (isLarge && !options.includeLarge) ? 'STANDBY' : 'PENDING';

      const newRecord = {
        path: filePath,
        status,
        sizeBytes,
        lastModified,
        requestedAt: new Date().toISOString()
      };
      rulesData.requestedFiles.push(newRecord);
      reqMap.set(filePath, newRecord);

      if (status === 'PENDING') enqueuedPending++;
      else enqueuedStandby++;
    } else {
      if (!existingReq.lastModified && lastModified > 0) {
        existingReq.lastModified = lastModified;
        updatedMeta = true;
      }
      if (!existingReq.sizeBytes && sizeBytes > 0) {
        existingReq.sizeBytes = sizeBytes;
        updatedMeta = true;
      }
      if (existingReq.status === 'STANDBY' && options.includeLarge) {
        existingReq.status = 'PENDING';
        existingReq.requestedAt = new Date().toISOString();
        enqueuedPending++;
      }
    }
  }

  if (enqueuedPending > 0 || enqueuedStandby > 0 || updatedMeta) {
    saveDeviceSyncRules(safeId, rulesData);
  }

  return {
    totalIndexed: indexList.length,
    enqueuedPending,
    enqueuedStandby,
    totalPending: rulesData.requestedFiles.filter(r => r.status === 'PENDING').length
  };
}

// Obtener colas ordenadas cronologicamente (del mas nuevo al mas viejo) separadas por Carril 1 (<=100MB) y Carril 2 (>100MB)
function getOrderedQueues(safeId, options = {}) {
  const normalLimit = options.normalLimit || 25;
  const largeLimit = options.largeLimit || 5;

  const metaMap = loadDeviceIndexMetaMap(safeId);
  let rulesData = getDeviceSyncRules(safeId);

  const countActiveNormal = (rulesData.requestedFiles || []).filter(r => {
    if (r.status !== 'PENDING') return false;
    const meta = metaMap.get(r.path);
    const size = meta ? meta.sizeBytes : (Number(r.sizeBytes) || 0);
    return size <= MAX_STANDBY_THRESHOLD;
  }).length;

  // Reabastecer dinamicamente desde file_index.json si hay pocos en cola normal
  if (countActiveNormal < normalLimit) {
    const enqueueRes = autoEnqueueDeviceFiles(safeId);
    if (enqueueRes && (enqueueRes.enqueuedPending > 0 || enqueueRes.enqueuedStandby > 0)) {
      rulesData = getDeviceSyncRules(safeId);
    }
  }

  const normalAll = [];
  const largeAll = [];

  for (const r of (rulesData.requestedFiles || [])) {
    if (!r || !r.path) continue;
    if (r.status !== 'PENDING' && r.status !== 'STANDBY') continue;

    const meta = metaMap.get(r.path);
    const sizeBytes = meta ? meta.sizeBytes : (Number(r.sizeBytes) || 0);
    const lastModified = meta ? meta.lastModified : (Number(r.lastModified) || 0);

    const enriched = {
      path: r.path,
      name: path.basename(r.path),
      sizeBytes,
      lastModified,
      status: r.status,
      requestedAt: r.requestedAt
    };

    if (sizeBytes > MAX_STANDBY_THRESHOLD) {
      largeAll.push(enriched);
    } else if (r.status === 'PENDING') {
      normalAll.push(enriched);
    }
  }

  // Carril 1: Ordenar del mas nuevo al mas viejo (lastModified DESC)
  normalAll.sort((a, b) => (b.lastModified - a.lastModified) || (a.sizeBytes - b.sizeBytes));

  // Carril 2 (>100MB): Priorizados manualmente (PENDING) primero, luego del mas nuevo al mas viejo (lastModified DESC)
  largeAll.sort((a, b) => {
    const prioA = a.status === 'PENDING' ? 1 : 0;
    const prioB = b.status === 'PENDING' ? 1 : 0;
    if (prioA !== prioB) return prioB - prioA;
    return (b.lastModified - a.lastModified) || (a.sizeBytes - b.sizeBytes);
  });

  return {
    normalBatch: normalAll.slice(0, normalLimit),
    largeBatch: largeAll.slice(0, largeLimit),
    normalAll,
    largeAll,
    autoSyncFolders: rulesData.auto_sync_folders || []
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
  let downloadedBytes = 0;
  if (fs.existsSync(downloadsMapPath)) {
    try {
      const map = JSON.parse(fs.readFileSync(downloadsMapPath, 'utf8'));
      // Contar solo las rutas que efectivamente pertenecen al indice del dispositivo
      if (fs.existsSync(indexPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
          const list = Array.isArray(raw) ? raw : (raw.files || []);
          const indexSizeMap = new Map();
          for (const x of list) {
            if (x && !x.isDirectory && x.absolutePath) {
              indexSizeMap.set(x.absolutePath, Number(x.sizeBytes) || 0);
            }
          }
          let count = 0;
          let bytes = 0;
          for (const key of Object.keys(map)) {
            if (indexSizeMap.has(key)) {
              count++;
              bytes += indexSizeMap.get(key);
            }
          }
          downloadedFiles = count;
          downloadedBytes = bytes;
        } catch (e) {
          downloadedFiles = Object.keys(map).length;
        }
      } else {
        downloadedFiles = Object.keys(map).length;
      }
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
    downloadedBytes,
    completedFiles,
    pendingFiles,
    standbyFiles
  };
}

module.exports = {
  MAX_STANDBY_THRESHOLD,
  loadDeviceIndexMetaMap,
  getDeviceSyncRules,
  saveDeviceSyncRules,
  autoEnqueueDeviceFiles,
  getOrderedQueues,
  getDeviceSyncStats
};
