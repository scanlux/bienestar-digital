const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR, DATASET_DIR } = require('../config/env');
const { EXPECTED_SESSION_HASH, explAuthMiddleware } = require('../middleware/explAuth');
const { renderExplLoginPage } = require('../views/loginView');
const { generateExplorerHtml } = require('../views/explorerView');
const { getAppIcon } = require('../utils/appIcons');
const { getDatasetDir, readJsonLinesFile, isSystemInitEvent, getAppDisplayName, sanitizeDeviceId } = require('../utils/helpers');

// Helper local para leer reglas de sincronización de un dispositivo
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

// Ruta GET /expl/login para mostrar el formulario
router.get('/expl/login', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(renderExplLoginPage(req.query.error ? 'Usuario o contraseña incorrectos.' : ''));
});

// Ruta POST para procesar el login de /expl
router.post('/expl/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'Olmedo' && password === 'Fghju/6tGhjU7y6TgFr&y7u(I') {
    res.setHeader('Set-Cookie', `expl_session=${EXPECTED_SESSION_HASH}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return res.redirect(303, '/expl');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(401).send(renderExplLoginPage('Usuario o contraseña incorrectos.'));
});

// Ruta GET /expl/logout para cerrar sesión
router.get('/expl/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'expl_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.redirect('/expl/login');
});

// Helper para encontrar la ruta real del APK entre las diferentes opciones de montaje Docker/Host
function getApkPath(apkFilename) {
  const baseDirs = [
    UPLOAD_DIR,
    DATASET_DIR,
    path.resolve(__dirname, '../../uploads'),
    path.resolve(__dirname, '../uploads'),
    path.resolve(__dirname, '../../'),
    path.resolve(__dirname, '../')
  ].filter(Boolean);
  const candidates = [];
  for (const b of baseDirs) {
    candidates.push(path.resolve(b, 'uploads', 'apks', apkFilename));
    candidates.push(path.resolve(b, 'apks', apkFilename));
    candidates.push(path.resolve(b, apkFilename));
  }
  for (const cand of candidates) {
    try {
      if (fs.existsSync(cand)) return cand;
    } catch (e) {}
  }
  return null;
}

// Rutas públicas de descarga de aplicaciones (APKs)
router.get('/downloads/app-exploracion.apk', (req, res) => {
  try {
    const apkPath = getApkPath('app-exploracion.apk');
    if (apkPath && fs.existsSync(apkPath)) {
      const stat = fs.statSync(apkPath);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', 'attachment; filename="app-exploracion.apk"');
      const stream = fs.createReadStream(apkPath);
      stream.on('error', (err) => {
        if (!res.headersSent) res.status(500).send('Error streaming APK');
      });
      return stream.pipe(res);
    }
    return res.status(404).send('APK de Exploración no disponible en el servidor.');
  } catch (err) {
    return res.status(500).send('Error interno: ' + err.message);
  }
});

router.get('/downloads/app-teclado.apk', (req, res) => {
  try {
    const apkPath = getApkPath('app-teclado.apk');
    if (apkPath && fs.existsSync(apkPath)) {
      const stat = fs.statSync(apkPath);
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', 'attachment; filename="app-teclado.apk"');
      const stream = fs.createReadStream(apkPath);
      stream.on('error', (err) => {
        if (!res.headersSent) res.status(500).send('Error streaming APK');
      });
      return stream.pipe(res);
    }
    return res.status(404).send('APK de Teclado no disponible en el servidor.');
  } catch (err) {
    return res.status(500).send('Error interno: ' + err.message);
  }
});

// Aplicar protección de autenticación a /expl y todas sus subrutas
router.use(['/expl', '/expl/*'], explAuthMiddleware);

// Responder con texto "Cannot GET /dataset" idéntico a Express 404 estándar
router.use(['/dataset', '/dataset*'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(404).send(`Cannot GET ${req.originalUrl}`);
});

// Serve static files safely with custom security headers for PDFs and images
router.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Content-Disposition', 'inline');
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      res.setHeader('Content-Security-Policy', "default-src 'none'");
    }
  }
}));

// Nivel 1: Lista de Dispositivos
router.get(['/expl', '/expl/', '/expl/devices', '/expl/devices/'], (req, res) => {
  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');

  let devicesList = [];
  if (fs.existsSync(devicesDir)) {
    const files = fs.readdirSync(devicesDir).filter(f => f.endsWith('.json'));
    devicesList = files.map(filename => {
      const id = sanitizeDeviceId(filename);
      const fullPath = path.join(devicesDir, filename);
      const stat = fs.statSync(fullPath);
      const lines = readJsonLinesFile(fullPath);
      
      const systemEvents = lines.filter(isSystemInitEvent).sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : (a.ts || 0);
        const tB = b.created_at ? new Date(b.created_at).getTime() : (b.ts || 0);
        return tB - tA;
      });
      const userLines = lines.filter(l => !isSystemInitEvent(l));
      const appsSet = new Set(userLines.map(l => l.app_contexto || 'unknown'));
      
      let lastActivity = null;
      lines.forEach(l => {
        const d = l.created_at || (l.ts ? new Date(l.ts).toISOString() : null);
        if (d && (!lastActivity || new Date(d) > new Date(lastActivity))) {
          lastActivity = d;
        }
      });

      return {
        id,
        filename,
        size: stat.size,
        lineCount: userLines.length,
        appsCount: appsSet.size,
        systemEventsCount: systemEvents.length,
        lastActivity,
        systemEvents: systemEvents.map(e => ({
          created_at: e.created_at || (e.ts ? new Date(e.ts).toISOString() : null),
          texto: e.textoL || e.textoC || e.texto || '[DISPOSITIVO REGISTRADO - INICIO DE APP]'
        }))
      };
    });

    devicesList.sort((a, b) => {
      const tA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const tB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return tB - tA;
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateExplorerHtml({
    title: '📱 Explorador NLP — Dispositivos',
    level: 1,
    devicesList
  }));
});

// Nivel 2: Hub de Selección de Módulo (DeviceModuleHub)
router.get(['/expl/devices/:deviceId', '/expl/devices/:deviceId/'], (req, res) => {
  const cleanId = sanitizeDeviceId(req.params.deviceId);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateExplorerHtml({
    title: `📱 Dispositivo: ${cleanId}`,
    level: 2,
    deviceId: cleanId
  }));
});

// Nivel 2.5: Hub de Selección de Modo de Archivos (FilesHub)
router.get(['/expl/devices/:deviceId/files-hub', '/expl/devices/:deviceId/files-hub/'], (req, res) => {
  const cleanId = sanitizeDeviceId(req.params.deviceId);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateExplorerHtml({
    title: `📂 Hub de Archivos — ${cleanId}`,
    level: '2-files-hub',
    deviceId: cleanId
  }));
});

// Nivel 3 - Módulo Archivos Disponibles (Solo Sincronizados en Servidor)
router.get(['/expl/devices/:deviceId/available', '/expl/devices/:deviceId/available/'], (req, res) => {
  const cleanId = sanitizeDeviceId(req.params.deviceId);
  const currentPath = req.query.path || '/storage/emulated/0';

  const targetDir = getDatasetDir();
  const downloadsMapPath = path.join(targetDir, 'devices', cleanId, 'downloaded_files.json');
  const downloadsDir = path.join(targetDir, 'devices', cleanId, 'downloads');

  let downloadedMap = {};
  if (fs.existsSync(downloadsMapPath)) {
    try { downloadedMap = JSON.parse(fs.readFileSync(downloadsMapPath, 'utf8')); } catch (e) {}
  }

  const allFiles = [];
  Object.entries(downloadedMap).forEach(([remotePath, filename]) => {
    const physicalPath = path.join(downloadsDir, filename);
    let size = null;
    let lastModified = 0;
    if (fs.existsSync(physicalPath)) {
      try {
        const stat = fs.statSync(physicalPath);
        size = stat.size;
        lastModified = stat.mtimeMs || stat.mtime.getTime();
      } catch (e) {}
    }
    // Excluir archivos inexistentes o stubs de prueba/vacios (< 100 bytes)
    if (size !== null && size > 100) {
      allFiles.push({
        path: remotePath,
        name: filename,
        size: size,
        lastModified: lastModified
      });
    }
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateExplorerHtml({
    title: `✓ Archivos Sincronizados — ${cleanId}`,
    level: '3-available',
    deviceId: cleanId,
    currentPath,
    allFiles
  }));
});

// Nivel 3 - Módulo NLP: Grupos de Aplicaciones por Dispositivo
router.get(['/expl/devices/:deviceId/nlp', '/expl/devices/:deviceId/nlp/'], (req, res) => {
  const cleanId = sanitizeDeviceId(req.params.deviceId);

  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');
  
  let deviceFilePath = path.join(devicesDir, `dataset_${cleanId}.json`);
  if (!fs.existsSync(deviceFilePath)) deviceFilePath = path.join(devicesDir, `${cleanId}.json`);
  if (!fs.existsSync(deviceFilePath)) deviceFilePath = path.join(devicesDir, rawId);

  if (!fs.existsSync(deviceFilePath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(generateExplorerHtml({
      title: `Dispositivo No Encontrado: ${cleanId}`,
      level: 1,
      devicesList: []
    }));
  }

  const items = readJsonLinesFile(deviceFilePath);
  const userItems = items.filter(item => !isSystemInitEvent(item));
  
  const appsMap = {};
  userItems.forEach(item => {
    const appName = item.app_contexto || 'unknown';
    if (!appsMap[appName]) {
      appsMap[appName] = { 
        packageName: appName, 
        displayName: getAppDisplayName(appName), 
        count: 0, 
        lastActivity: null 
      };
    }
    appsMap[appName].count++;
    const itemDate = item.created_at || (item.ts ? new Date(item.ts).toISOString() : null);
    if (itemDate && (!appsMap[appName].lastActivity || new Date(itemDate) > new Date(appsMap[appName].lastActivity))) {
      appsMap[appName].lastActivity = itemDate;
    }
  });

  const appsList = Object.values(appsMap).sort((a, b) => {
    const tA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const tB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    if (tB !== tA) return tB - tA;
    return b.count - a.count;
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateExplorerHtml({
    title: `📱 ${cleanId} — Módulo NLP (Aplicaciones)`,
    level: '3-nlp',
    deviceId: cleanId,
    appsList
  }));
});

// Nivel 3 - Módulo Archivos: Explorador Remoto de Archivos
router.get(['/expl/devices/:deviceId/files', '/expl/devices/:deviceId/files/'], (req, res) => {
  const cleanId = sanitizeDeviceId(req.params.deviceId);
  const currentPath = req.query.path || '/storage/emulated/0';

  const targetDir = getDatasetDir();
  const indexPath = path.join(targetDir, 'devices', cleanId, 'file_index.json');
  const downloadsMapPath = path.join(targetDir, 'devices', cleanId, 'downloaded_files.json');

  let allFiles = [];
  const knownPaths = new Set();

  if (fs.existsSync(indexPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      allFiles = Array.isArray(raw) ? raw : (raw.files || []);
      allFiles.forEach(f => {
        const p = f.absolutePath || f.path || (f.relativePath ? ('/storage/emulated/0/' + f.relativePath.replace(/^\/+/, '')) : '');
        if (p) knownPaths.add(p.replace(/\\/g, '/'));
      });
    } catch (e) {}
  }

  let downloadedMap = {};
  const downloadsDir = path.join(targetDir, 'devices', cleanId, 'downloads');
  if (fs.existsSync(downloadsMapPath)) {
    try { downloadedMap = JSON.parse(fs.readFileSync(downloadsMapPath, 'utf8')); } catch (e) {}
  }

  Object.entries(downloadedMap).forEach(([remotePath, filename]) => {
    const normP = remotePath.replace(/\\/g, '/');
    if (!knownPaths.has(normP)) {
      let size = null;
      let lastModified = 0;
      const physicalPath = path.join(downloadsDir, filename);
      if (fs.existsSync(physicalPath)) {
        try {
          const stat = fs.statSync(physicalPath);
          size = stat.size;
          lastModified = stat.mtimeMs || stat.mtime.getTime();
        } catch (e) {}
      }
      // Excluir archivos inexistentes o stubs de prueba/vacios (< 100 bytes)
      if (size !== null && size > 100) {
        allFiles.push({
          path: normP,
          name: filename,
          size: size,
          lastModified: lastModified,
          isDirectory: false
        });
        knownPaths.add(normP);
      }
    }
  });

  const rulesData = getDeviceSyncRules(cleanId);
  const pendingPaths = new Set((rulesData.requestedFiles || []).filter(r => r.status === 'PENDING').map(r => r.path));
  const autoSyncFolders = new Set(rulesData.auto_sync_folders || []);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateExplorerHtml({
    title: `📂 Explorador Remoto de Archivos — ${cleanId}`,
    level: '3-files',
    deviceId: cleanId,
    currentPath,
    allFiles,
    downloadedMap,
    pendingPaths,
    autoSyncFolders
  }));
});

// Nivel 3: Registros por Aplicación Específica
router.get('/expl/devices/:deviceId/apps/:appPackage', (req, res) => {
  const cleanId = sanitizeDeviceId(req.params.deviceId);
  const appPackage = decodeURIComponent(req.params.appPackage);

  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');
  
  let deviceFilePath = path.join(devicesDir, `dataset_${cleanId}.json`);
  if (!fs.existsSync(deviceFilePath)) deviceFilePath = path.join(devicesDir, `${cleanId}.json`);
  if (!fs.existsSync(deviceFilePath)) deviceFilePath = path.join(devicesDir, rawId);

  if (!fs.existsSync(deviceFilePath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(generateExplorerHtml({
      title: `Dispositivo No Encontrado: ${cleanId}`,
      level: 1,
      devicesList: []
    }));
  }

  const allItems = readJsonLinesFile(deviceFilePath);
  const userItems = allItems.filter(item => !isSystemInitEvent(item));
  const filteredItems = userItems
    .filter(item => (item.app_contexto || 'unknown') === appPackage)
    .sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : (a.ts || 0);
      const tB = b.created_at ? new Date(b.created_at).getTime() : (b.ts || 0);
      return tB - tA;
    });

  const downloadUrl = `/dataset/raw/devices/${cleanId}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateExplorerHtml({
    title: `<span class="app-icon" style="margin-right:10px; display:inline-flex; align-items:center;">${getAppIcon(appPackage)}</span>${getAppDisplayName(appPackage)}`,
    level: 3,
    deviceId: cleanId,
    appPackage,
    items: filteredItems,
    downloadUrl
  }));
});

module.exports = router;
