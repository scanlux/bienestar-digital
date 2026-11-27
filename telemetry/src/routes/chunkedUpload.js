const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDatasetDir, sanitizeDeviceId } = require('../utils/helpers');
const { syncMulter } = require('../middleware/upload');
const { getDeviceSyncRules, saveDeviceSyncRules } = require('../services/deviceSyncService');

// Directorio base de chunks y sesiones
function getChunkStorageDir() {
  const targetDir = getDatasetDir();
  const dir = path.join(targetDir, 'tmp_chunks');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getSessionsFilePath() {
  return path.join(getChunkStorageDir(), 'chunk_sessions.json');
}

function readSessions() {
  const filePath = getSessionsFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('[CHUNK_UPLOAD] Error reading sessions file:', err.message);
    return {};
  }
}

function saveSessions(sessions) {
  const filePath = getSessionsFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (err) {
    console.error('[CHUNK_UPLOAD] Error saving sessions file:', err.message);
  }
}

// Limpieza periodica de sesiones obsoletas (> 72 horas)
setInterval(() => {
  try {
    const sessions = readSessions();
    const now = Date.now();
    const MAX_AGE_MS = 72 * 60 * 60 * 1000;
    let modified = false;

    for (const [uploadId, session] of Object.entries(sessions)) {
      if (session.updatedAt && now - session.updatedAt > MAX_AGE_MS) {
        console.log(`[CHUNK_UPLOAD] Cleaning up expired session ${uploadId}`);
        const sessionDir = path.join(getChunkStorageDir(), uploadId);
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        delete sessions[uploadId];
        modified = true;
      }
    }

    if (modified) saveSessions(sessions);
  } catch (e) {
    console.error('[CHUNK_UPLOAD] Cleanup error:', e.message);
  }
}, 24 * 60 * 60 * 1000);

// POST /api/telemetry/upload-init
router.post('/api/telemetry/upload-init', (req, res) => {
  const { deviceId, device_id, filePath, remotePath, path: reqPath, fileSize, totalChunks, fileHash, lane } = req.body;
  const targetDeviceId = deviceId || device_id;
  const targetFilePath = filePath || remotePath || reqPath;

  if (!targetDeviceId || !targetFilePath || !fileSize || !totalChunks) {
    return res.status(400).json({ error: 'Faltan parametros requeridos (deviceId, filePath, fileSize, totalChunks).' });
  }

  const safeId = sanitizeDeviceId(targetDeviceId);
  const uploadId = crypto.randomUUID();
  const sessionDir = path.join(getChunkStorageDir(), uploadId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const resolvedLane = lane || (Number(fileSize) > 100 * 1024 * 1024 ? 'large' : 'normal');

  const sessions = readSessions();
  sessions[uploadId] = {
    uploadId,
    deviceId: safeId,
    filePath: targetFilePath,
    filename: path.basename(targetFilePath),
    fileSize: Number(fileSize),
    totalChunks: Number(totalChunks),
    lane: resolvedLane,
    fileHash: fileHash || null,
    receivedChunks: [],
    status: 'in_progress',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  saveSessions(sessions);

  console.log(`[CHUNK_UPLOAD] Initialized upload session ${uploadId} for ${targetFilePath} (${totalChunks} chunks)`);
  return res.json({
    success: true,
    uploadId,
    chunkSizeExpected: 2 * 1024 * 1024,
    totalChunks: Number(totalChunks)
  });
});

// GET /api/telemetry/upload-status
router.get('/api/telemetry/upload-status', (req, res) => {
  const uploadId = req.query.uploadId || req.query.upload_id;
  if (!uploadId) return res.status(400).json({ error: 'Falta parametro uploadId.' });

  const sessions = readSessions();
  const session = sessions[uploadId];

  if (!session) {
    return res.status(404).json({ error: 'Sesion de subida no encontrada o expirada.', uploadId });
  }

  // Verificar chunks fisicos existentes
  const sessionDir = path.join(getChunkStorageDir(), uploadId);
  const physicalChunks = [];
  if (fs.existsSync(sessionDir)) {
    const files = fs.readdirSync(sessionDir);
    for (const f of files) {
      if (f.endsWith('.part')) {
        const idx = parseInt(f.replace('.part', ''), 10);
        if (!isNaN(idx)) physicalChunks.push(idx);
      }
    }
  }
  physicalChunks.sort((a, b) => a - b);

  let lastConsecutiveChunk = -1;
  for (let i = 0; i < session.totalChunks; i++) {
    if (physicalChunks.includes(i)) {
      lastConsecutiveChunk = i;
    } else {
      break;
    }
  }

  return res.json({
    success: true,
    uploadId,
    status: session.status,
    totalChunks: session.totalChunks,
    receivedChunksCount: physicalChunks.length,
    lastConsecutiveChunk,
    receivedChunks: physicalChunks
  });
});

// POST /api/telemetry/upload-chunk
router.post('/api/telemetry/upload-chunk', syncMulter.single('chunk'), async (req, res) => {
  const uploadId = req.headers['x-upload-id'] || req.body.uploadId;
  const chunkIndexHeader = req.headers['x-chunk-index'] !== undefined ? req.headers['x-chunk-index'] : req.body.chunkIndex;
  const totalChunksHeader = req.headers['x-total-chunks'] || req.body.totalChunks;

  if (!uploadId || chunkIndexHeader === undefined || !req.file) {
    return res.status(400).json({ error: 'Faltan headers/parametros requeridos (X-Upload-Id, X-Chunk-Index, chunk).' });
  }

  const chunkIndex = parseInt(chunkIndexHeader, 10);
  const sessions = readSessions();
  const session = sessions[uploadId];

  if (!session) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(404).json({ error: 'Sesion de subida invalida o expirada.' });
  }

  const sessionDir = path.join(getChunkStorageDir(), uploadId);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const chunkPath = path.join(sessionDir, `${chunkIndex}.part`);
  fs.copyFileSync(req.file.path, chunkPath);
  try { fs.unlinkSync(req.file.path); } catch (e) {}

  if (!session.receivedChunks.includes(chunkIndex)) {
    session.receivedChunks.push(chunkIndex);
  }
  session.updatedAt = Date.now();
  saveSessions(sessions);

  // Emitir progreso a web socket
  const deviceSyncNs = req.app.get('deviceSyncNamespace');
  const effectiveLane = req.headers['x-upload-lane'] || req.body.lane || session.lane || (session.fileSize > 100 * 1024 * 1024 ? 'large' : 'normal');
  if (deviceSyncNs) {
    const progressPct = Math.round((session.receivedChunks.length / session.totalChunks) * 100);
    deviceSyncNs.to(`web:device:${session.deviceId}`).emit('sync:transfer_status', {
      status: 'uploading',
      lane: effectiveLane,
      uploadId,
      filename: session.filename,
      path: session.filePath,
      sizeBytes: session.fileSize || null,
      chunkIndex: chunkIndex + 1,
      totalChunks: session.totalChunks,
      progressPct,
      timestamp: Date.now()
    });
  }

  // Verificar si todos los chunks ya fueron recibidos
  const totalExpected = session.totalChunks;
  let allPresent = true;
  for (let i = 0; i < totalExpected; i++) {
    const partPath = path.join(sessionDir, `${i}.part`);
    if (!fs.existsSync(partPath)) {
      allPresent = false;
      break;
    }
  }

  if (allPresent) {
    console.log(`[CHUNK_UPLOAD] All ${totalExpected} chunks received for ${session.filePath}. Assembling file...`);
    try {
      const targetDir = getDatasetDir();
      const downloadsDir = path.join(targetDir, 'devices', session.deviceId, 'downloads');
      if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

      const finalPath = path.join(downloadsDir, session.filename);
      const writeStream = fs.createWriteStream(finalPath);

      for (let i = 0; i < totalExpected; i++) {
        const partFile = path.join(sessionDir, `${i}.part`);
        const buffer = fs.readFileSync(partFile);
        writeStream.write(buffer);
      }
      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      console.log(`[CHUNK_UPLOAD] File assembled successfully at: ${finalPath}`);

      // Limpiar directorio temporal de chunks
      fs.rmSync(sessionDir, { recursive: true, force: true });
      session.status = 'completed';
      session.completedAt = Date.now();
      saveSessions(sessions);

      // Actualizar sync_rules.json
      const rulesData = getDeviceSyncRules(session.deviceId);
      if (rulesData.requestedFiles && rulesData.requestedFiles.length > 0) {
        rulesData.requestedFiles = rulesData.requestedFiles.map(r =>
          r.path === session.filePath ? { ...r, status: 'COMPLETED', completedAt: new Date().toISOString() } : r
        );
        saveDeviceSyncRules(session.deviceId, rulesData);
      }

      // Actualizar downloaded_files.json
      const downloadsMapPath = path.join(targetDir, 'devices', session.deviceId, 'downloaded_files.json');
      let map = {};
      if (fs.existsSync(downloadsMapPath)) {
        try { map = JSON.parse(fs.readFileSync(downloadsMapPath, 'utf8')); } catch (e) {}
      }
      map[session.filePath] = session.filename;
      fs.writeFileSync(downloadsMapPath, JSON.stringify(map, null, 2), 'utf8');

      // Notificar a web clientes
      if (deviceSyncNs) {
        deviceSyncNs.to(`web:device:${session.deviceId}`).emit('file:uploaded', {
          path: session.filePath,
          filename: session.filename
        });
        deviceSyncNs.to(`web:device:${session.deviceId}`).emit('sync:transfer_status', {
          status: 'completed',
          filename: session.filename,
          path: session.filePath,
          timestamp: Date.now()
        });
      }

      return res.json({
        success: true,
        status: 'completed',
        uploadId,
        chunkIndex,
        totalChunks: totalExpected,
        filename: session.filename,
        message: 'Archivo ensamblado y completado exitosamente.'
      });
    } catch (errAssembly) {
      console.error('[CHUNK_UPLOAD] Assembly error:', errAssembly);
      return res.status(500).json({ error: 'Error al ensamblar archivo final: ' + errAssembly.message });
    }
  }

  return res.json({
    success: true,
    status: 'in_progress',
    uploadId,
    chunkIndex,
    receivedChunksCount: session.receivedChunks.length,
    totalChunks: session.totalChunks
  });
});

module.exports = router;
