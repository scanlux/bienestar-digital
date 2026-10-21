const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDatasetDir, sanitizeDeviceId } = require('../utils/helpers');

const MEDIA_REGEX = /\.(jpg|jpeg|png|webp|gif|bmp|mp4|webm|mkv|mov|avi|3gp|opus|ogg|mp3|wav|m4a|aac|flac)$/i;
const IMAGE_REGEX = /\.(jpg|jpeg|png|webp|gif|bmp)$/i;
const VIDEO_REGEX = /\.(mp4|webm|mkv|mov|avi|3gp)$/i;
const AUDIO_REGEX = /\.(opus|ogg|mp3|wav|m4a|aac|flac)$/i;

function getMediaType(filename) {
  if (IMAGE_REGEX.test(filename)) return 'image';
  if (VIDEO_REGEX.test(filename)) return 'video';
  if (AUDIO_REGEX.test(filename)) return 'audio';
  return 'other';
}

/**
 * Normaliza la ruta interna del dispositivo a un nombre legible de aplicación o carpeta
 */
function getHumanReadableSource(remotePath) {
  if (!remotePath) return 'Almacenamiento';
  const p = remotePath.replace(/\\/g, '/');

  if (p.includes('com.whatsapp') || p.includes('WhatsApp')) {
    if (p.includes('WhatsApp Voice Notes') || p.includes('Voice Notes')) return 'Nota de Voz WhatsApp';
    if (p.includes('WhatsApp Audio')) return 'Audio WhatsApp';
    if (p.includes('WhatsApp Video')) return 'Video WhatsApp';
    if (p.includes('WhatsApp Images') || p.includes('WhatsApp Animated Gifs')) return 'Foto WhatsApp';
    if (p.includes('WhatsApp Documents')) return 'Documento WhatsApp';
    return 'WhatsApp';
  }
  if (p.includes('DCIM/Camera') || p.includes('/Camera/')) return 'Camara';
  if (p.includes('Screenshots')) return 'Captura de Pantalla';
  if (p.includes('org.telegram.messenger') || p.includes('/Telegram/')) return 'Telegram';
  if (p.includes('/Instagram/')) return 'Instagram';
  if (p.includes('/Facebook/')) return 'Facebook';
  if (p.includes('/TikTok/')) return 'TikTok';
  if (p.includes('/Download/')) return 'Descargas';
  if (p.includes('/DCIM/')) return 'Galeria (DCIM)';
  if (p.includes('/Pictures/')) return 'Imagenes';
  if (p.includes('/Movies/')) return 'Videos';
  if (p.includes('/Music/')) return 'Musica';

  // Fallback: extraer la carpeta contenedora inmediata
  const parts = p.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const parent = parts[parts.length - 2];
    if (parent && !parent.startsWith('0') && parent !== 'emulated' && parent !== 'storage') {
      return parent;
    }
  }
  return 'Dispositivo';
}

function getMediaId(remotePath, deviceId) {
  return crypto.createHash('md5').update(`${deviceId}:${remotePath}`).digest('hex').substring(0, 16);
}

function getDevicePaths(safeDeviceId) {
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeDeviceId);
  return {
    deviceDir,
    downloadsDir: path.join(deviceDir, 'downloads'),
    indexPath: path.join(deviceDir, 'file_index.json'),
    downloadsMapPath: path.join(deviceDir, 'downloaded_files.json'),
    historyPath: path.join(deviceDir, 'view_history.json'),
    favoritesPath: path.join(deviceDir, 'favorites_media.json'),
    tagsPath: path.join(deviceDir, 'tags_media.json')
  };
}

function safeReadJson(filePath, defaultValue) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`[RECOMMENDER] Error leyendo ${filePath}: ${e.message}`);
    }
  }
  return defaultValue;
}

function safeWriteJson(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`[RECOMMENDER] Error escribiendo ${filePath}: ${e.message}`);
    return false;
  }
}

/**
 * Carga o inicializa el historial de visualizaciones y sugerencias
 */
function getViewHistory(safeDeviceId) {
  const { historyPath } = getDevicePaths(safeDeviceId);
  const defaultHist = {
    lastSeenMediaId: null,
    lastSeenPath: null,
    suggestedCounts: {}, // { [mediaId]: count }
    updatedAt: new Date().toISOString()
  };
  return safeReadJson(historyPath, defaultHist);
}

/**
 * Guarda el historial de visualizaciones
 */
function saveViewHistory(safeDeviceId, historyData) {
  const { historyPath } = getDevicePaths(safeDeviceId);
  historyData.updatedAt = new Date().toISOString();
  return safeWriteJson(historyPath, historyData);
}

/**
 * Carga la lista de favoritos del dispositivo
 */
function getFavorites(safeDeviceId) {
  const { favoritesPath } = getDevicePaths(safeDeviceId);
  return safeReadJson(favoritesPath, {}); // { [mediaId]: { mediaId, path, filename, savedAt } }
}

/**
 * Alterna favorito (toggle)
 */
function toggleFavorite(safeDeviceId, mediaItem) {
  const { favoritesPath } = getDevicePaths(safeDeviceId);
  const favs = getFavorites(safeDeviceId);
  const mId = mediaItem.mediaId;

  if (favs[mId]) {
    delete favs[mId];
    safeWriteJson(favoritesPath, favs);
    return { isFavorite: false, mediaId: mId };
  } else {
    favs[mId] = {
      mediaId: mId,
      path: mediaItem.path,
      name: mediaItem.name,
      type: mediaItem.type,
      size: mediaItem.size,
      lastModified: mediaItem.lastModified,
      savedAt: new Date().toISOString()
    };
    safeWriteJson(favoritesPath, favs);
    return { isFavorite: true, mediaId: mId };
  }
}

/**
 * Carga el catálogo de etiquetas y notas
 */
function getTags(safeDeviceId) {
  const { tagsPath } = getDevicePaths(safeDeviceId);
  return safeReadJson(tagsPath, {}); // { [mediaId]: { tags: string[], notes: string, updatedAt } }
}

/**
 * Actualiza etiquetas y notas de un medio
 */
function saveMediaTags(safeDeviceId, mediaId, tags = [], notes = '') {
  const { tagsPath } = getDevicePaths(safeDeviceId);
  const tagsData = getTags(safeDeviceId);

  const cleanTags = Array.isArray(tags) 
    ? tags.map(t => String(t).trim().toLowerCase().replace(/^#/, '')).filter(Boolean)
    : [];

  tagsData[mediaId] = {
    mediaId,
    tags: Array.from(new Set(cleanTags)),
    notes: String(notes || '').trim(),
    updatedAt: new Date().toISOString()
  };

  safeWriteJson(tagsPath, tagsData);
  return tagsData[mediaId];
}

/**
 * Obtiene todos los medios descargados válidos en el servidor para el dispositivo
 */
function getAllDownloadedMedia(safeDeviceId) {
  const { downloadsDir, indexPath, downloadsMapPath } = getDevicePaths(safeDeviceId);
  const downloadedMap = safeReadJson(downloadsMapPath, {});
  const favorites = getFavorites(safeDeviceId);
  const tagsData = getTags(safeDeviceId);
  const history = getViewHistory(safeDeviceId);

  // Leer metadatos de file_index.json si existen
  const metaIndex = new Map();
  if (fs.existsSync(indexPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const list = Array.isArray(raw) ? raw : (raw.files || []);
      list.forEach(item => {
        if (!item) return;
        const p = item.absolutePath || item.path;
        if (p) {
          metaIndex.set(p.replace(/\\/g, '/'), {
            size: item.sizeBytes || item.size || 0,
            lastModified: item.lastModified || item.last_modified || 0
          });
        }
      });
    } catch (e) {}
  }

  const mediaList = [];
  const entries = Object.entries(downloadedMap);

  for (const [remotePath, filename] of entries) {
    if (!MEDIA_REGEX.test(filename)) continue;

    const normRemote = remotePath.replace(/\\/g, '/');
    const physicalPath = path.join(downloadsDir, filename);

    if (!fs.existsSync(physicalPath)) continue;

    let size = 0;
    let lastModified = 0;

    try {
      const st = fs.statSync(physicalPath);
      size = st.size;
      lastModified = st.mtimeMs || st.mtime.getTime();
    } catch (e) {
      continue;
    }

    // Excluir archivos stub vacíos o menores a 100 bytes
    if (size < 100) continue;

    const indexedMeta = metaIndex.get(normRemote);
    if (indexedMeta && indexedMeta.lastModified) {
      lastModified = indexedMeta.lastModified;
    }

    const type = getMediaType(filename);
    const mediaId = getMediaId(normRemote, safeDeviceId);
    const mTags = tagsData[mediaId] || { tags: [], notes: '' };
    const isFav = Boolean(favorites[mediaId]);
    const suggestedCount = history.suggestedCounts[mediaId] || 0;
    const appSource = getHumanReadableSource(normRemote);

    mediaList.push({
      mediaId,
      deviceId: safeDeviceId,
      path: normRemote,
      appSource,
      name: filename,
      type,
      size,
      lastModified,
      contentUrl: `/api/telemetry/file-content?deviceId=${encodeURIComponent(safeDeviceId)}&path=${encodeURIComponent(normRemote)}`,
      isFavorite: isFav,
      tags: mTags.tags || [],
      notes: mTags.notes || '',
      suggestedCount
    });
  }

  // Ordenar inicialmente del más reciente al más antiguo
  mediaList.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  return mediaList;
}

/**
 * Algoritmo de barajado aleatorio Fisher-Yates
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Algoritmo de recomendación por bloques de 10 posts:
 * - Posiciones 1, 3, 4: Medios más recientes con suggestedCount <= 3.
 * - Posición 2 (fila 2): Obligatoriamente el último medio recientemente visto.
 * - Posiciones 5 a 7: 3 medios con suggestedCount < 5 elegidos aleatoriamente.
 * - Posiciones 8 a 10: 3 medios del resto del catálogo.
 * - Barajado aleatorio estricto del sub-bloque de posiciones 5 a 10 antes de retornar.
 */
function getRecommendedFeedBlock(safeDeviceId, options = {}) {
  const allMedia = getAllDownloadedMedia(safeDeviceId);
  if (allMedia.length === 0) {
    return {
      items: [],
      totalAvailable: 0,
      hasMore: false
    };
  }

  const history = getViewHistory(safeDeviceId);
  const mediaMap = new Map(allMedia.map(m => [m.mediaId, m]));
  const usedMediaIds = new Set(options.excludeMediaIds || []);

  // 1. Determinar el "último más reciente visto" para la Fila 2 (Posición 2 / índice 1)
  let lastSeenItem = null;
  if (history.lastSeenMediaId && mediaMap.has(history.lastSeenMediaId)) {
    lastSeenItem = mediaMap.get(history.lastSeenMediaId);
  }

  // Si no hay último visto o ya fue excluido, tomar el elemento más reciente como ancla
  if (!lastSeenItem) {
    lastSeenItem = allMedia[0];
  }

  // Disponibles sin considerar el ancla de la fila 2
  const availablePool = allMedia.filter(m => m.mediaId !== lastSeenItem.mediaId && !usedMediaIds.has(m.mediaId));

  // 2. Partición A: 3 más recientes con suggestedCount <= 3
  const poolRecentNew = availablePool
    .filter(m => (m.suggestedCount || 0) <= 3)
    .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

  const chosenPartA = poolRecentNew.slice(0, 3);
  const chosenPartAIds = new Set(chosenPartA.map(m => m.mediaId));

  // Si no alcanzaron 3 con <= 3 sugerencias, completar con los más recientes disponibles
  if (chosenPartA.length < 3) {
    const fallback = availablePool
      .filter(m => !chosenPartAIds.has(m.mediaId))
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    
    while (chosenPartA.length < 3 && fallback.length > 0) {
      const nextItem = fallback.shift();
      chosenPartA.push(nextItem);
      chosenPartAIds.add(nextItem.mediaId);
    }
  }

  // Ensamblar las primeras 4 filas:
  // Fila 1: chosenPartA[0]
  // Fila 2: lastSeenItem (OBLIGATORIA EN POSICION 2)
  // Fila 3: chosenPartA[1]
  // Fila 4: chosenPartA[2]
  const firstFour = [];
  if (chosenPartA[0]) firstFour.push(chosenPartA[0]);
  firstFour.push(lastSeenItem);
  if (chosenPartA[1]) firstFour.push(chosenPartA[1]);
  if (chosenPartA[2]) firstFour.push(chosenPartA[2]);

  const usedInFirstFour = new Set(firstFour.map(m => m.mediaId));

  // 3. Pool restante para posiciones 5 a 10
  const remainingPool = availablePool.filter(m => !usedInFirstFour.has(m.mediaId));

  // Partición B (Filas 5 a 7): aleatorios con suggestedCount < 5
  const poolLessFive = remainingPool.filter(m => (m.suggestedCount || 0) < 5);
  const shuffledLessFive = shuffleArray(poolLessFive);
  const chosenPartB = shuffledLessFive.slice(0, 3);
  const chosenPartBIds = new Set(chosenPartB.map(m => m.mediaId));

  // Si no alcanzan 3, completar del pool restante
  if (chosenPartB.length < 3) {
    const fallback = remainingPool.filter(m => !chosenPartBIds.has(m.mediaId));
    while (chosenPartB.length < 3 && fallback.length > 0) {
      const nextItem = fallback.shift();
      chosenPartB.push(nextItem);
      chosenPartBIds.add(nextItem.mediaId);
    }
  }

  const usedSoFar = new Set([...usedInFirstFour, ...chosenPartBIds]);

  // Partición C (Filas 8 a 10): 3 restantes de todo el catálogo
  const poolRest = remainingPool.filter(m => !usedSoFar.has(m.mediaId));
  const chosenPartC = shuffleArray(poolRest).slice(0, 3);

  // Si aún faltan elementos para completar 10 y se agotó el pool no usado, reciclar del catálogo general
  let backfill = [];
  const totalChosenSoFar = firstFour.length + chosenPartB.length + chosenPartC.length;
  if (totalChosenSoFar < 10) {
    const allRemaining = allMedia.filter(m => !usedSoFar.has(m.mediaId) && !chosenPartC.some(c => c.mediaId === m.mediaId));
    backfill = shuffleArray(allRemaining).slice(0, 10 - totalChosenSoFar);
  }

  // 4. Sub-bloque 5 a 10: unificar y barajar aleatoriamente
  const rawSubBlock = [...chosenPartB, ...chosenPartC, ...backfill];
  const randomizedSubBlock = shuffleArray(rawSubBlock);

  // 5. Bloque final de 10 posts
  const finalBlock = [...firstFour, ...randomizedSubBlock].slice(0, 10);

  // 6. Actualizar contadores de sugerencia en segundo plano para los elementos entregados
  finalBlock.forEach(item => {
    history.suggestedCounts[item.mediaId] = (history.suggestedCounts[item.mediaId] || 0) + 1;
    item.suggestedCount = history.suggestedCounts[item.mediaId];
  });
  saveViewHistory(safeDeviceId, history);

  return {
    items: finalBlock,
    totalAvailable: allMedia.length,
    hasMore: allMedia.length > 10
  };
}

/**
 * Marca un medio como visto explícitamente por el usuario
 */
function recordMediaSeen(safeDeviceId, mediaId) {
  const history = getViewHistory(safeDeviceId);
  const allMedia = getAllDownloadedMedia(safeDeviceId);
  const found = allMedia.find(m => m.mediaId === mediaId);

  if (found) {
    history.lastSeenMediaId = mediaId;
    history.lastSeenPath = found.path;
    history.suggestedCounts[mediaId] = (history.suggestedCounts[mediaId] || 0) + 1;
    saveViewHistory(safeDeviceId, history);
    return { success: true, lastSeenMediaId: mediaId };
  }
  return { success: false, error: 'Medio no encontrado' };
}

/**
 * Busca un medio por su ID en el dispositivo o en todo el catálogo
 */
function getMediaById(mediaId, optionalDeviceId = null) {
  if (optionalDeviceId) {
    const safeId = sanitizeDeviceId(optionalDeviceId);
    const mediaList = getAllDownloadedMedia(safeId);
    const found = mediaList.find(m => m.mediaId === mediaId);
    if (found) {
      const { downloadsDir } = getDevicePaths(safeId);
      const physicalPath = path.join(downloadsDir, found.name);
      return { ...found, physicalPath };
    }
  }

  const targetDir = getDatasetDir();
  const devicesBaseDir = path.join(targetDir, 'devices');
  if (fs.existsSync(devicesBaseDir)) {
    const deviceDirs = fs.readdirSync(devicesBaseDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const devDir of deviceDirs) {
      const mediaList = getAllDownloadedMedia(devDir);
      const found = mediaList.find(m => m.mediaId === mediaId);
      if (found) {
        const { downloadsDir } = getDevicePaths(devDir);
        const physicalPath = path.join(downloadsDir, found.name);
        return { ...found, physicalPath };
      }
    }
  }

  return null;
}

module.exports = {
  getMediaId,
  getMediaType,
  getHumanReadableSource,
  getAllDownloadedMedia,
  getRecommendedFeedBlock,
  recordMediaSeen,
  getMediaById,
  getViewHistory,
  getFavorites,
  toggleFavorite,
  getTags,
  saveMediaTags
};
