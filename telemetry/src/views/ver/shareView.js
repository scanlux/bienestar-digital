/**
 * Vista de contenido compartido con metaetiquetas OpenGraph para WhatsApp y redes
 * (/expl/ver/post/:mediaId)
 */
const { getVerStyles } = require('./stylesVer');
const { ICONS } = require('./icons');

function renderVerShareView({ item, hostUrl = 'https://trendy-telemetry.sytes.net' }) {
  const styles = getVerStyles();
  const rawMediaUrl = `${hostUrl}/expl/ver/raw/${item.mediaId}`;
  const canonicalUrl = `${hostUrl}/expl/ver/post/${item.mediaId}`;
  const formattedDate = new Date(item.lastModified || Date.now()).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const isVideo = item.type === 'video';
  const isImage = item.type === 'image';
  const isAudio = item.type === 'audio';

  // Metaetiquetas OpenGraph optimizadas para WhatsApp
  let ogMetaTags = `
  <meta property="og:site_name" content="Ver Media">
  <meta property="og:title" content="${item.name}">
  <meta property="og:description" content="Visualiza este archivo en Ver Media">
  <meta property="og:url" content="${canonicalUrl}">
  `;

  if (isVideo) {
    ogMetaTags += `
  <meta property="og:type" content="video.other">
  <meta property="og:video" content="${rawMediaUrl}">
  <meta property="og:video:secure_url" content="${rawMediaUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="720">
  <meta property="og:video:height" content="1280">
  <meta property="og:image" content="${rawMediaUrl}">
  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="${item.name}">
  <meta name="twitter:player" content="${rawMediaUrl}">
  <meta name="twitter:player:width" content="720">
  <meta name="twitter:player:height" content="1280">
    `;
  } else if (isImage) {
    ogMetaTags += `
  <meta property="og:type" content="image">
  <meta property="og:image" content="${rawMediaUrl}">
  <meta property="og:image:secure_url" content="${rawMediaUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${item.name}">
  <meta name="twitter:image" content="${rawMediaUrl}">
    `;
  } else if (isAudio) {
    ogMetaTags += `
  <meta property="og:type" content="music.song">
  <meta property="og:audio" content="${rawMediaUrl}">
  <meta property="og:audio:secure_url" content="${rawMediaUrl}">
  <meta property="og:audio:type" content="audio/ogg">
    `;
  }

  // Reproductor para el cuerpo de la página
  let playerHtml = '';
  if (isVideo) {
    playerHtml = `<video class="post-video" controls playsinline autoplay muted preload="auto" src="${rawMediaUrl}"></video>`;
  } else if (isImage) {
    playerHtml = `<img class="post-img" src="${rawMediaUrl}" alt="${item.name}" />`;
  } else if (isAudio) {
    playerHtml = `
      <div class="post-audio-container">
        <div class="audio-icon-box" style="display:flex; justify-content:center; align-items:center;">
          ${ICONS.audio}
        </div>
        <audio class="post-audio" controls autoplay src="${rawMediaUrl}"></audio>
      </div>
    `;
  }

  const typeIcon = isVideo ? ICONS.video : isImage ? ICONS.image : ICONS.audio;
  const tagsList = Array.isArray(item.tags) ? item.tags : [];
  const notes = item.notes || '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${item.name} — Ver Media</title>
  <link rel="icon" href="https://trendy.sytes.net/favicon.ico" type="image/x-icon">
  ${ogMetaTags}
  <style>
${styles}
  .share-header-action {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .btn-wa-direct {
    background: #22c55e;
    color: #ffffff;
    font-weight: 700;
    font-size: 0.9rem;
    padding: 10px 16px;
    border-radius: 999px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35);
  }
  </style>
</head>
<body>
  <div class="app-viewport">
    <header class="top-bar">
      <a href="/expl/ver" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:6px;">
        <span class="brand-title">Ver Media</span>
      </a>
      <div class="share-header-action">
        <a href="/expl/ver" style="background:#1f2937; color:#f3f4f6; text-decoration:none; font-size:0.8rem; font-weight:600; padding:6px 12px; border-radius:8px;">
          Feed Principal
        </a>
      </div>
    </header>

    <main id="mainContent" style="flex:1;">
      <article class="post-card" style="border-bottom:none;">
        <div class="post-header">
          <div class="post-author">
            <div class="author-avatar">${typeIcon}</div>
            <div class="author-meta">
              <span class="author-name">${item.name}</span>
              <span class="post-date">${formattedDate}</span>
            </div>
          </div>
          <span class="device-chip">${item.deviceId || 'Dispositivo'}</span>
        </div>

        <div class="post-media-container">
          ${playerHtml}
        </div>

        <div class="post-actions" style="padding: 14px;">
          <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('Mira este contenido: ' + item.name + '\n' + canonicalUrl)}" target="_blank" class="btn-wa-direct">
            ${ICONS.share} Compartir en WhatsApp
          </a>
          <a href="${rawMediaUrl}" download="${item.name}" class="btn-action" title="Descargar original" style="color:#9ca3af; text-decoration:none; display:flex; align-items:center;">
            ${ICONS.download}
          </a>
        </div>

        <div class="post-details" style="padding: 0 14px 20px;">
          <div class="post-filename">${item.path}</div>
          ${notes ? `<div class="post-notes">${notes}</div>` : ''}
          ${tagsList.length > 0 ? `
            <div class="post-tags-container">
              ${tagsList.map(t => `<span class="tag-badge">#${t}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

module.exports = {
  renderVerShareView
};
