const fs = require('fs');
const path = require('path');
const appLogger = require('../../utils/appLogger');

const TELEMETRY_SECRET_KEY = process.env.TELEMETRY_API_KEY || 'HkA8RFB9Yx2M1Lp7vQ4w9R0';

/**
 * Middleware para validar el API Key de telemetría enviado por KeyboardAndroid
 */
const validateTelemetryKey = (req, res, next) => {
  const apiKey = req.headers['x-telemetry-api-key'] || req.headers['authorization'];
  const primaryKey = process.env.TELEMETRY_API_KEY || 'HkA8RFB9Yx2M1Lp7vQ4w9R0';
  const legacyKey = 'TECLA_NLP_SECRET_KEY_2026';
  const validKeys = [primaryKey, legacyKey];
  const isValid = apiKey && validKeys.some(k => apiKey === k || apiKey === `Bearer ${k}`);
  if (!isValid) {
    return res.status(401).json({ error: 'Acceso no autorizado al servicio de telemetría.' });
  }
  next();
};

/**
 * Controlador para procesar lote (batch) de muestras de lenguaje humano (Exclusivo JSON en Disco)
 */
const handleDatasetBatch = async (req, res) => {
  try {
    const { device_id, samples } = req.body;

    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ error: 'El cuerpo de la petición debe contener un arreglo "samples" no vacío.' });
    }

    // Determinación de la ruta de almacenamiento de archivos en servidor
    let targetDir = '/var/www/bienestar/dataset_nlp';
    if (!fs.existsSync(targetDir)) {
      // Fallback para desarrollo local
      targetDir = path.join(__dirname, '../../uploads/dataset_nlp');
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const devicesDir = path.join(targetDir, 'devices');
    if (!fs.existsSync(devicesDir)) {
      fs.mkdirSync(devicesDir, { recursive: true });
    }

    const targetFilePath = path.join(targetDir, 'dataset_lenguaje_humano.json');

    const headerDeviceId = req.headers['x-device-id'];
    const rawDeviceId = device_id || headerDeviceId || 'unknown_device';
    const safeDeviceId = String(rawDeviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const deviceFilePath = path.join(devicesDir, `dataset_${safeDeviceId}.json`);

    // Preparación y sanitización de muestras
    const sampleObjects = [];
    const now = new Date();

    for (const sample of samples) {
      if (!sample) continue;
      const rawText = sample.texto || sample.textoL || sample.textoC || '';
      if (typeof rawText !== 'string' || !rawText.trim()) {
        continue;
      }

      const cleanText = rawText.trim();
      if (
        cleanText.includes('Sistema de captura Dataset NLP activado') ||
        cleanText.includes('Dataset NLP sincronizado')
      ) {
        continue;
      }
      const cleanPackage = sample.app_contexto ? String(sample.app_contexto).trim() : 'unknown';
      const sampleDeviceId = safeDeviceId;
      const sampleTs = sample.ts || Date.now();

      const sampleObj = {
        app_contexto: cleanPackage,
        texto: cleanText,
        textoL: sample.textoL || cleanText,
        textoC: sample.textoC || cleanText,
        device_id: sampleDeviceId,
        ts: sampleTs,
        created_at: now.toISOString()
      };

      sampleObjects.push(sampleObj);
    }

    if (sampleObjects.length === 0) {
      return res.status(400).json({ error: 'No se encontraron muestras válidas para guardar.' });
    }

    // Helper para guardar como arreglo JSON estándar compatible con cualquier navegador
    const saveSamplesToJsonArray = (filePath, newSamples) => {
      let existing = [];
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8').trim();
          if (content.startsWith('[') && content.endsWith(']')) {
            existing = JSON.parse(content);
          } else {
            // Migración automática de formato JSONL antiguo a arreglo JSON estándar
            const lines = content.split('\n').filter(l => l.trim());
            existing = lines.map(l => {
              try { return JSON.parse(l); } catch (e) { return { raw_text: l }; }
            });
          }
        } catch (e) {
          existing = [];
        }
      }
      const combined = existing.concat(newSamples);
      fs.writeFileSync(filePath, JSON.stringify(combined, null, 2), 'utf8');
    };

    saveSamplesToJsonArray(targetFilePath, sampleObjects);
    saveSamplesToJsonArray(deviceFilePath, sampleObjects);

    appLogger.info(`[TELEMETRY] ${sampleObjects.length} muestras guardadas como arreglo JSON válido en ${targetFilePath} y ${deviceFilePath}`);

    return res.status(200).json({
      success: true,
      message: `${sampleObjects.length} muestras de dataset almacenadas correctamente en formato JSON estándar.`,
      received_count: sampleObjects.length,
      device_id: safeDeviceId
    });

  } catch (error) {
    appLogger.error('[TELEMETRY_ERROR] Error al procesar lote de muestras: ' + error.message);
    return res.status(500).json({ error: 'Error interno al procesar telemetría.' });
  }
};

const generateDatasetHtml = ({ title, deviceId, items, devicesList = [], downloadUrl }) => {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Telemetría</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    h1 { font-size: 1.35rem; font-weight: 700; color: #38bdf8; margin: 0; display: flex; align-items: center; gap: 10px; }
    .subtitle { color: #94a3b8; font-size: 0.9rem; margin-top: 4px; }
    .controls { display: flex; gap: 16px; align-items: center; background: #1e293b; padding: 14px 20px; border-radius: 10px; margin-bottom: 24px; border: 1px solid #334155; flex-wrap: wrap; }
    .checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 0.95rem; color: #f1f5f9; font-weight: 600; background: #0f172a; padding: 8px 14px; border-radius: 6px; border: 1px solid #475569; }
    .checkbox-label input { width: 18px; height: 18px; cursor: pointer; accent-color: #3b82f6; }
    .badge { background: #0284c7; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
    .search-input { background: #0f172a; border: 1px solid #475569; color: #f8fafc; padding: 8px 14px; border-radius: 6px; font-size: 0.9rem; flex: 1; min-width: 200px; outline: none; }
    .search-input:focus { border-color: #38bdf8; }
    .btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.88rem; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s; }
    .btn:hover { background: #1d4ed8; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    
    #dataset-container { display: flex; flex-direction: column; gap: 12px; }
    .entry-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 14px 18px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.88rem; transition: border-color 0.2s; }
    .entry-card:hover { border-color: #475569; }
    .entry-card.formatted { white-space: pre-wrap; word-break: break-word; color: #34d399; }
    .entry-card.raw { white-space: nowrap; overflow-x: auto; color: #e2e8f0; }
    
    pre { margin: 0; font-family: inherit; white-space: pre-wrap; word-break: break-word; font-size: 0.88rem; line-height: 1.6; color: #34d399; }
    
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-top: 20px; }
    .device-card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px 20px; text-decoration: none; color: inherit; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
    .device-card:hover { border-color: #38bdf8; transform: translateY(-2px); background: #26334d; }
    .device-name { font-weight: 600; color: #f8fafc; font-size: 0.95rem; word-break: break-all; }
    .device-size { color: #94a3b8; font-size: 0.82rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📊 ${title}</h1>
        <div class="subtitle">Servidor de Telemetría y Dataset NLP - KeyboardAndroid</div>
      </div>
      <div>
        ${deviceId ? `<a href="/dataset" class="btn btn-secondary">← Volver a Dispositivos</a>` : ''}
        ${downloadUrl ? `<a href="${downloadUrl}" download class="btn">⬇ Descargar JSON</a>` : ''}
      </div>
    </div>

    ${devicesList.length > 0 ? `
      <h2 style="font-size: 1.1rem; color: #94a3b8; margin-top: 24px;">Dispositivos Registrados (${devicesList.length})</h2>
      <div class="device-list">
        <a href="/dataset" class="device-card" style="border-color: #0284c7;">
          <div>
            <div class="device-name" style="color: #38bdf8;">🌐 Dataset Global Acumulado</div>
            <div class="device-size">Todas las muestras combinadas</div>
          </div>
          <span class="badge">GLOBAL</span>
        </a>
        ${devicesList.map(d => `
          <a href="/dataset/devices/${d.id}" class="device-card">
            <div>
              <div class="device-name">📱 ${d.id}</div>
              <div class="device-size">${d.lineCount} registros • ${(d.size / 1024).toFixed(1)} KB</div>
            </div>
            <span class="btn btn-secondary" style="font-size:0.75rem; padding:4px 8px;">Ver →</span>
          </a>
        `).join('')}
      </div>
    ` : ''}

    ${items ? `
      <div class="controls">
        <label class="checkbox-label">
          <input type="checkbox" id="formatCheck" checked />
          Dar formato al texto (JSON Identado)
        </label>

        <input type="text" id="searchInput" placeholder="Filtrar por texto, app_contexto o timestamp..." class="search-input" />

        <span class="badge" id="recordCount">Total registros: ${items.length}</span>
      </div>

      <div id="dataset-container"></div>
    ` : ''}
  </div>

  ${items ? `
  <script>
    const rawItems = ${JSON.stringify(items)};
    const checkbox = document.getElementById('formatCheck');
    const searchInput = document.getElementById('searchInput');
    const container = document.getElementById('dataset-container');
    const recordCount = document.getElementById('recordCount');

    function render() {
      const isFormatted = checkbox.checked;
      const query = searchInput.value.toLowerCase().trim();
      
      const filtered = rawItems.filter(item => {
        if (!query) return true;
        const str = typeof item === 'string' ? item : JSON.stringify(item);
        return str.toLowerCase().includes(query);
      });

      recordCount.textContent = 'Total registros: ' + filtered.length + (filtered.length !== rawItems.length ? ' (de ' + rawItems.length + ')' : '');
      container.innerHTML = '';

      if (filtered.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; padding:30px; text-align:center; background:#1e293b; border-radius:8px;">No se encontraron registros que coincidan con la búsqueda.</div>';
        return;
      }

      filtered.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'entry-card ' + (isFormatted ? 'formatted' : 'raw');
        
        if (isFormatted) {
          const pre = document.createElement('pre');
          pre.textContent = typeof item === 'object' ? JSON.stringify(item, null, 2) : item;
          card.appendChild(pre);
        } else {
          card.textContent = typeof item === 'object' ? JSON.stringify(item) : item;
        }
        
        container.appendChild(card);
      });
    }

    checkbox.addEventListener('change', render);
    searchInput.addEventListener('input', render);
    render();
  </script>
  ` : ''}
</body>
</html>`;
};

const getDatasetDir = () => {
  let targetDir = '/var/www/bienestar/dataset_nlp';
  if (!fs.existsSync(targetDir)) {
    targetDir = path.join(__dirname, '../../uploads/dataset_nlp');
  }
  return targetDir;
};

const readJsonLinesFile = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { raw: line };
      }
    });
  } catch (e) {
    return [];
  }
};

const renderMainDatasetView = (req, res) => {
  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');
  const globalFilePath = path.join(targetDir, 'dataset_lenguaje_humano.json');

  let devicesList = [];
  if (fs.existsSync(devicesDir)) {
    const files = fs.readdirSync(devicesDir).filter(f => f.endsWith('.json'));
    devicesList = files.map(filename => {
      const id = filename.replace(/^dataset_/, '').replace(/\.json$/, '');
      const fullPath = path.join(devicesDir, filename);
      const stat = fs.statSync(fullPath);
      const lines = readJsonLinesFile(fullPath);
      return {
        id,
        filename,
        size: stat.size,
        lineCount: lines.length
      };
    });
  }

  const items = readJsonLinesFile(globalFilePath);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateDatasetHtml({
    title: 'Dataset NLP - Global (Todos los dispositivos)',
    items,
    devicesList,
    downloadUrl: fs.existsSync(globalFilePath) ? '/dataset.json' : null
  }));
};

const renderDeviceDatasetView = (req, res) => {
  const rawId = req.params.deviceId;
  const cleanId = rawId.replace(/^dataset_/, '').replace(/\.json$/, '');
  
  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');
  
  let deviceFilePath = path.join(devicesDir, `dataset_${cleanId}.json`);
  if (!fs.existsSync(deviceFilePath)) {
    deviceFilePath = path.join(devicesDir, `${cleanId}.json`);
  }

  if (!fs.existsSync(deviceFilePath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(generateDatasetHtml({
      title: `Dispositivo no encontrado: ${cleanId}`,
      items: [],
      devicesList: []
    }));
  }

  const items = readJsonLinesFile(deviceFilePath);
  const downloadUrl = `/dataset/raw/devices/${cleanId}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(generateDatasetHtml({
    title: `Dataset NLP - Dispositivo: ${cleanId}`,
    deviceId: cleanId,
    items,
    downloadUrl
  }));
};

module.exports = {
  validateTelemetryKey,
  handleDatasetBatch,
  renderMainDatasetView,
  renderDeviceDatasetView
};

