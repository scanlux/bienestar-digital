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
const fs = require('fs');

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
