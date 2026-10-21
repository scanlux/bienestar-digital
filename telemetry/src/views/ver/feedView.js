/**
 * Vista de Feed Principal para Ver Media (/expl/ver)
 */
const { ICONS } = require('./icons');

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
      mediaHtml = `<video class="post-video" controls playsinline preload="metadata" src="${item.contentUrl}" onplay="markMediaSeen('${item.mediaId}')"></video>`;
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

    return `
      <article class="post-card" id="post_${item.mediaId}" data-media-id="${item.mediaId}">
        <div class="post-header">
          <div class="post-author">
            <div class="author-avatar">${typeIcon}</div>
            <div class="author-meta">
              <span class="author-name">${item.name}</span>
              <span class="post-date">${formattedDate}</span>
            </div>
          </div>
          <button type="button" class="btn-action" onclick="openTagModal('${item.mediaId}', '${encodeURIComponent(item.name)}')" title="Catalogar y Etiquetar" style="display:flex; align-items:center;">${ICONS.tag}</button>
        </div>

        <div class="post-media-container">
          ${mediaHtml}
        </div>

        <div class="post-actions">
          <div class="action-group-left">
            <button type="button" class="btn-action btn-star ${isFav ? 'favorited' : ''}" id="star_${item.mediaId}" onclick="toggleFav('${item.mediaId}', '${encodeURIComponent(item.name)}', '${item.type}')" style="display:flex; align-items:center;">
              ${isFav ? ICONS.starFilled : ICONS.starOutline}
            </button>
            <button type="button" class="btn-action" onclick="openTagModal('${item.mediaId}', '${encodeURIComponent(item.name)}')" title="Anadir Nota o Etiqueta" style="display:flex; align-items:center;">${ICONS.comment}</button>
            <button type="button" class="btn-action btn-whatsapp" onclick="shareWhatsApp('${item.mediaId}', '${encodeURIComponent(item.name)}', '${item.deviceId || ''}')" title="Compartir por WhatsApp" style="display:flex; align-items:center;">${ICONS.share}</button>
          </div>
          <a href="${item.contentUrl}" download="${item.name}" class="btn-action" title="Descargar original" style="color:#9ca3af; text-decoration:none; display:flex; align-items:center;">${ICONS.download}</a>
        </div>

        <div class="post-details">
          <div class="post-filename">${item.path}</div>
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
    <div id="feedLoadingIndicator" style="text-align:center; padding:24px; color:#9ca3af; font-size:0.85rem;">
      Desliza hacia abajo para mas contenidos...
    </div>
  `;
}

module.exports = {
  renderVerFeedView
};
