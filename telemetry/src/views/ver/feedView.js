/**
 * Vista de Feed Principal para Ver Media (/expl/ver)
 */
const { ICONS } = require('./icons');
const { getHumanReadableSource } = require('../../services/mediaRecommendationService');

function renderVerFeedView({ items = [] }) {
  if (items.length === 0) {
    return `
      <div style="padding: 40px 20px; text-align: center; color: #9ca3af;">
        <div style="margin-bottom: 12px; display:flex; justify-content:center;">${ICONS.emptyFolder}</div>
        <h2 style="font-size: 1.15rem; font-weight: 700; color: #f3f4f6; margin-bottom: 8px;">Aun no hay archivos multimedia sincronizados</h2>
        <p style="font-size: 0.85rem; line-height: 1.5; color: #6b7280;">
          El servidor descarga automaticamente los medios del dispositivo en segundo plano. Cuando finalicen las descargas de fotos, videos o audios, apareceran en este feed.
        </p>
      </div>
    `;
  }

  // Los posts iniciales se renderizan dentro de #feedList
  const postsHtml = items.map((item, idx) => {
    const isFav = Boolean(item.isFavorite);
    const tagsList = Array.isArray(item.tags) ? item.tags : [];
    const notes = item.notes || '';
    const formattedDate = new Date(item.lastModified || Date.now()).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    let mediaHtml = '';
    if (item.type === 'video') {
      mediaHtml = `
        <video class="post-video" ${idx === 0 ? 'autoplay' : ''} playsinline webkit-playsinline loop preload="auto" muted src="${item.contentUrl}" onclick="toggleVideoPlay('${item.mediaId}')"></video>
      `;
    } else if (item.type === 'image') {
      mediaHtml = `<img class="post-img" loading="lazy" src="${item.contentUrl}" alt="${item.name}" onclick="markMediaSeen('${item.mediaId}')" />`;
    } else if (item.type === 'audio') {
      mediaHtml = `
        <div class="post-audio-container">
          <div class="audio-icon-box" style="display:flex; justify-content:center; align-items:center;">
            ${ICONS.audio}
          </div>
          <audio class="post-audio" controls src="${item.contentUrl}" onplay="markMediaSeen('${item.mediaId}')"></audio>
        </div>
      `;
    }

    const typeIcon = item.type === 'video' ? ICONS.video : item.type === 'image' ? ICONS.image : ICONS.audio;
    const appSource = item.appSource || getHumanReadableSource(item.path);

    return `
      <article class="post-card" id="post_${item.mediaId}" data-media-id="${item.mediaId}" data-path="${encodeURIComponent(item.path || '')}" data-name="${encodeURIComponent(item.name || '')}" data-type="${item.type || 'other'}" data-size="${item.size || 0}" data-mtime="${item.lastModified || 0}" data-source="${encodeURIComponent(appSource)}">
        <div class="post-header">
          <div class="post-author">
            <div class="author-avatar">${typeIcon}</div>
            <div class="author-meta">
              <span class="author-name">${item.name}</span>
              <span class="post-date">${formattedDate}</span>
            </div>
          </div>
          <span class="app-source-badge">${appSource}</span>
        </div>

        <div class="post-media-container">
          ${mediaHtml}
          <div class="post-side-actions">
            <button type="button" class="side-action-btn btn-star ${isFav ? 'favorited' : ''}" id="star_${item.mediaId}" onclick="event.stopPropagation(); toggleFav('${item.mediaId}')" title="Agregar a Favoritos">
              ${isFav ? ICONS.starFilled : ICONS.starOutline}
            </button>
            <button type="button" class="side-action-btn btn-whatsapp" onclick="event.stopPropagation(); shareWhatsApp('${item.mediaId}', '${encodeURIComponent(item.name)}', '${item.deviceId || ''}')" title="Compartir con WhatsApp">
              ${ICONS.whatsapp}
            </button>
            <button type="button" class="side-action-btn" onclick="event.stopPropagation(); openTagModal('${item.mediaId}', '${encodeURIComponent(item.name)}')" title="Agregar Tags o Nota">
              ${ICONS.tag}
            </button>
            <a href="${item.contentUrl}" download="${item.name}" class="side-action-btn" onclick="event.stopPropagation();" title="Descargar">
              ${ICONS.download}
            </a>
            ${item.type === 'video' ? `
              <button type="button" class="side-action-btn" id="muteBtn_${item.mediaId}" onclick="event.stopPropagation(); toggleVideoSound('${item.mediaId}')" title="Silencio / Activar sonido">
                ${ICONS.soundMuted}
              </button>
            ` : ''}
          </div>
        </div>

        <div class="post-details">
          ${notes ? `<div class="post-notes" id="notes_${item.mediaId}">${notes}</div>` : `<div class="post-notes" id="notes_${item.mediaId}" style="display:none;"></div>`}
          <div class="post-tags-container" id="tags_${item.mediaId}">
            ${tagsList.map(t => `<span class="tag-badge">#${t}</span>`).join('')}
          </div>
        </div>
      </article>
    `;
  }).join('');

  return `
    <div id="feedList">
      ${postsHtml}
    </div>
  `;
}

module.exports = {
  renderVerFeedView
};
