/**
 * Script de cliente para el feed interactivo, favoritos, tags y scroll infinito
 */
function getVerClientScript({ deviceId, initialItems = [] }) {
  return `
    let loadedMediaIds = new Set();
    let isFetchingMore = false;
    let hasMoreContent = true;
    let activeTagMediaId = null;
    let currentMainTab = 'feed';
    let intersectionObserver = null;

    // Inicializar IDs precargados
    const initialList = ${JSON.stringify(initialItems)};
    initialList.forEach(item => {
      if (item && item.mediaId) loadedMediaIds.add(item.mediaId);
    });

    document.addEventListener('DOMContentLoaded', () => {
      setupIntersectionObserver();
    });

    function showToast(msg) {
      const toast = document.getElementById('appToast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.remove('show');
      void toast.offsetWidth; // retrigger reflow
      toast.classList.add('show');
      setTimeout(() => { toast.classList.remove('show'); }, 2500);
    }

    function switchMainTab(tab) {
      if (currentMainTab === tab) return;
      currentMainTab = tab;

      document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
      if (tab === 'feed') document.getElementById('tabFeed').classList.add('active');
      if (tab === 'favorites') document.getElementById('tabFavorites').classList.add('active');
      if (tab === 'explore') document.getElementById('tabExplore').classList.add('active');

      const container = document.getElementById('mainContent');
      if (!container) return;

      if (tab === 'feed') {
        container.innerHTML = '<div id="feedList"></div><div id="feedLoadingIndicator" style="text-align:center; padding:24px; color:#9ca3af; font-size:0.85rem;">Cargando feed...</div>';
        loadedMediaIds.clear();
        hasMoreContent = true;
        fetchNextFeedBlock();
      } else if (tab === 'favorites') {
        renderFavoritesTab(container);
      } else if (tab === 'explore') {
        renderExploreTagsTab(container);
      }
    }

    function setupIntersectionObserver() {
      if (intersectionObserver) intersectionObserver.disconnect();

      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !isFetchingMore && hasMoreContent && currentMainTab === 'feed') {
            intersectionObserver.unobserve(entry.target);
            fetchNextFeedBlock();
          }
        });
      }, { rootMargin: '200px' });

      attachObserverToEighthPost();
    }

    function attachObserverToEighthPost() {
      const posts = document.querySelectorAll('#feedList .post-card');
      if (posts.length >= 8) {
        // Observar el post en la posición 8 del bloque actual
        const targetPost = posts[posts.length - 3] || posts[posts.length - 1];
        if (targetPost && intersectionObserver) {
          intersectionObserver.observe(targetPost);
        }
      }
    }

    function fetchNextFeedBlock() {
      if (isFetchingMore || !hasMoreContent) return;
      isFetchingMore = true;

      const loading = document.getElementById('feedLoadingIndicator');
      if (loading) loading.style.display = 'block';

      const excludeParam = Array.from(loadedMediaIds).join(',');
      fetch('/api/ver/feed?exclude=' + encodeURIComponent(excludeParam))
        .then(res => res.json())
        .then(data => {
          isFetchingMore = false;
          if (loading) loading.style.display = 'none';

          if (!data.success || !Array.isArray(data.items) || data.items.length === 0) {
            hasMoreContent = false;
            if (loading) {
              loading.textContent = 'Has llegado al final de los contenidos.';
              loading.style.display = 'block';
            }
            return;
          }

          const feedList = document.getElementById('feedList');
          if (!feedList) return;

          data.items.forEach(item => {
            loadedMediaIds.add(item.mediaId);
            feedList.insertAdjacentHTML('beforeend', renderPostCardHtml(item));
          });

          attachObserverToEighthPost();
        })
        .catch(err => {
          isFetchingMore = false;
          if (loading) {
            loading.textContent = 'Error al cargar más contenidos. Toca para reintentar.';
            loading.onclick = fetchNextFeedBlock;
          }
        });
    }

    function renderPostCardHtml(item) {
      const isFav = Boolean(item.isFavorite);
      const tagsList = Array.isArray(item.tags) ? item.tags : [];
      const hasTags = tagsList.length > 0;
      const notes = item.notes || '';
      const formattedDate = new Date(item.lastModified || Date.now()).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      let mediaHtml = '';
      if (item.type === 'video') {
        mediaHtml = '<video class="post-video" controls playsinline preload="metadata" src="' + item.contentUrl + '" onplay="markMediaSeen(\\'' + item.mediaId + '\\')"></video>';
      } else if (item.type === 'image') {
        mediaHtml = '<img class="post-img" loading="lazy" src="' + item.contentUrl + '" alt="' + item.name + '" onclick="markMediaSeen(\\'' + item.mediaId + '\\')" />';
      } else if (item.type === 'audio') {
        mediaHtml = '<div class="post-audio-container">' +
          '<div class="audio-icon-box">🎵</div>' +
          '<audio class="post-audio" controls src="' + item.contentUrl + '" onplay="markMediaSeen(\\'' + item.mediaId + '\\')"></audio>' +
        '</div>';
      }

      return '<article class="post-card" id="post_' + item.mediaId + '" data-media-id="' + item.mediaId + '">' +
        '<div class="post-header">' +
          '<div class="post-author">' +
            '<div class="author-avatar">' + (item.type === 'video' ? '🎬' : item.type === 'image' ? '🖼️' : '🎵') + '</div>' +
            '<div class="author-meta">' +
              '<span class="author-name">' + item.name + '</span>' +
              '<span class="post-date">' + formattedDate + '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn-action" onclick="openTagModal(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\')" title="Catalogar y Etiquetar">🏷️</button>' +
        '</div>' +

        '<div class="post-media-container">' + mediaHtml + '</div>' +

        '<div class="post-actions">' +
          '<div class="action-group-left">' +
            '<button type="button" class="btn-action btn-star ' + (isFav ? 'favorited' : '') + '" id="star_' + item.mediaId + '" onclick="toggleFav(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\', \\'' + item.type + '\\')">' +
              (isFav ? '★' : '☆') +
            '</button>' +
            '<button type="button" class="btn-action" onclick="openTagModal(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\')" title="Añadir Nota o Etiqueta">💬</button>' +
            '<button type="button" class="btn-action btn-whatsapp" onclick="shareWhatsApp(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\')" title="Compartir por WhatsApp">📱</button>' +
          '</div>' +
          '<a href="' + item.contentUrl + '" download="' + item.name + '" class="btn-action" title="Descargar original" style="font-size:1.1rem; color:#9ca3af; text-decoration:none;">⬇</a>' +
        '</div>' +

        '<div class="post-details">' +
          '<div class="post-filename">' + item.path + '</div>' +
          (notes ? '<div class="post-notes" id="notes_' + item.mediaId + '">' + notes + '</div>' : '<div class="post-notes" id="notes_' + item.mediaId + '" style="display:none;"></div>') +
          '<div class="post-tags-container" id="tags_' + item.mediaId + '">' +
            tagsList.map(t => '<span class="tag-badge">#' + t + '</span>').join('') +
          '</div>' +
        '</div>' +
      '</article>';
    }

    function markMediaSeen(mediaId) {
      fetch('/api/ver/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId })
      }).catch(() => {});
    }

    function toggleFav(mediaId, nameEnc, type) {
      const btn = document.getElementById('star_' + mediaId);
      const currentFav = btn ? btn.classList.contains('favorited') : false;

      fetch('/api/ver/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          name: decodeURIComponent(nameEnc),
          type: type || 'other'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && btn) {
          if (data.isFavorite) {
            btn.classList.add('favorited');
            btn.textContent = '★';
            showToast('Añadido a Favoritos ⭐');
          } else {
            btn.classList.remove('favorited');
            btn.textContent = '☆';
            showToast('Eliminado de Favoritos');
          }
        }
      })
      .catch(() => showToast('Error al actualizar favorito'));
    }

    function shareWhatsApp(mediaId, nameEnc) {
      const name = decodeURIComponent(nameEnc);
      const postUrl = window.location.origin + '/expl/ver/share/' + mediaId;
      const text = encodeURIComponent('🎬 Mira este contenido: ' + name + '\\n' + postUrl);
      const waUrl = 'https://api.whatsapp.com/send?text=' + text;

      // Intentar abrir WhatsApp
      window.open(waUrl, '_blank');

      // Copiar también al portapapeles
      if (navigator.clipboard) {
        navigator.clipboard.writeText(postUrl).then(() => {
          showToast('Enlace de WhatsApp preparado y copiado 📋');
        }).catch(() => {});
      }
    }

    function openTagModal(mediaId, nameEnc) {
      activeTagMediaId = mediaId;
      const modal = document.getElementById('tagModalOverlay');
      const filenameLabel = document.getElementById('tagModalFilename');
      const tagInput = document.getElementById('tagInput');
      const notesInput = document.getElementById('notesInput');

      if (filenameLabel) filenameLabel.textContent = decodeURIComponent(nameEnc);

      // Pre-cargar valores actuales
      const postEl = document.getElementById('post_' + mediaId);
      let existingTags = [];
      let existingNotes = '';
      if (postEl) {
        const tagsBox = postEl.querySelector('.post-tags-container');
        if (tagsBox) {
          existingTags = Array.from(tagsBox.querySelectorAll('.tag-badge')).map(b => b.textContent.replace(/^#/, ''));
        }
        const notesBox = postEl.querySelector('.post-notes');
        if (notesBox && notesBox.style.display !== 'none') {
          existingNotes = notesBox.textContent;
        }
      }

      if (tagInput) tagInput.value = existingTags.join(', ');
      if (notesInput) notesInput.value = existingNotes;

      if (modal) modal.classList.add('active');
    }

    function closeTagModal() {
      const modal = document.getElementById('tagModalOverlay');
      if (modal) modal.classList.remove('active');
      activeTagMediaId = null;
    }

    function submitTagModal() {
      if (!activeTagMediaId) return;
      const tagInput = document.getElementById('tagInput');
      const notesInput = document.getElementById('notesInput');

      const rawTags = tagInput ? tagInput.value.split(',').map(t => t.trim()).filter(Boolean) : [];
      const notes = notesInput ? notesInput.value.trim() : '';

      fetch('/api/ver/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: activeTagMediaId,
          tags: rawTags,
          notes
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const mId = activeTagMediaId;
          const tagsBox = document.getElementById('tags_' + mId);
          const notesBox = document.getElementById('notes_' + mId);

          if (tagsBox) {
            tagsBox.innerHTML = (data.tags || []).map(t => '<span class="tag-badge">#' + t + '</span>').join('');
          }
          if (notesBox) {
            if (data.notes) {
              notesBox.textContent = data.notes;
              notesBox.style.display = 'block';
            } else {
              notesBox.textContent = '';
              notesBox.style.display = 'none';
            }
          }
          closeTagModal();
          showToast('Etiquetas y notas actualizadas ✓');
        }
      })
      .catch(() => showToast('Error al guardar etiquetas'));
    }

    function renderFavoritesTab(container) {
      container.innerHTML = '<div style="padding:16px;"><h2 style="font-size:1.1rem; font-weight:800; margin-bottom:12px;">⭐ Medios Favoritos</h2><div id="favList">Cargando favoritos...</div></div>';

      fetch('/api/ver/favorites')
        .then(res => res.json())
        .then(data => {
          const listDiv = document.getElementById('favList');
          if (!listDiv) return;

          if (!data.success || !Array.isArray(data.favorites) || data.favorites.length === 0) {
            listDiv.innerHTML = '<p style="color:#6b7280; font-size:0.85rem; font-style:italic; padding:20px 0; text-align:center;">Aún no tienes medios guardados en favoritos. Pulsa la estrella en cualquier post para guardarlo aquí.</p>';
            return;
          }

          listDiv.innerHTML = data.favorites.map(f => {
            const contentUrl = '/api/telemetry/file-content?deviceId=' + encodeURIComponent('${deviceId}') + '&path=' + encodeURIComponent(f.path);
            return '<div style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
              '<div style="min-width:0; flex:1;">' +
                '<div style="font-weight:700; font-size:0.88rem; color:#f3f4f6; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + f.name + '</div>' +
                '<div style="font-size:0.75rem; color:#9ca3af; font-family:monospace;">' + f.path + '</div>' +
              '</div>' +
              '<div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">' +
                '<a href="' + contentUrl + '" target="_blank" style="background:#059669; color:#fff; font-size:0.75rem; padding:6px 10px; border-radius:6px; text-decoration:none; font-weight:600;">Abrir</a>' +
              '</div>' +
            '</div>';
          }).join('');
        })
        .catch(() => {
          const listDiv = document.getElementById('favList');
          if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem;">Error al cargar favoritos.</p>';
        });
    }

    function renderExploreTagsTab(container) {
      container.innerHTML = '<div style="padding:16px;"><h2 style="font-size:1.1rem; font-weight:800; margin-bottom:12px;">🏷️ Explorar por Etiquetas</h2><div id="tagsList">Cargando catálogo de etiquetas...</div><div id="tagResults" style="margin-top:18px;"></div></div>';

      fetch('/api/ver/tags')
        .then(res => res.json())
        .then(data => {
          const listDiv = document.getElementById('tagsList');
          if (!listDiv) return;

          const tags = data.tags || {};
          const keys = Object.keys(tags);

          if (keys.length === 0) {
            listDiv.innerHTML = '<p style="color:#6b7280; font-size:0.85rem; font-style:italic; padding:20px 0; text-align:center;">Aún no hay etiquetas asignadas. En el feed puedes pulsar el icono de etiqueta para catalogar fotos o videos.</p>';
            return;
          }

          listDiv.innerHTML = '<div style="display:flex; flex-wrap:wrap; gap:8px;">' +
            keys.map(k => '<button type="button" onclick="filterByTag(\\'' + k + '\\')" style="background:#1e293b; border:1px solid #374151; color:#38bdf8; font-size:0.82rem; font-weight:600; padding:6px 12px; border-radius:999px; cursor:pointer;">#' + k + ' (' + tags[k] + ')</button>').join('') +
          '</div>';
        })
        .catch(() => {
          const listDiv = document.getElementById('tagsList');
          if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem;">Error al cargar etiquetas.</p>';
        });
    }

    function filterByTag(tag) {
      const resultsDiv = document.getElementById('tagResults');
      if (!resultsDiv) return;

      resultsDiv.innerHTML = '<p style="color:#9ca3af; font-size:0.85rem;">Buscando contenidos con #' + tag + '...</p>';

      fetch('/api/ver/tags?tag=' + encodeURIComponent(tag))
        .then(res => res.json())
        .then(data => {
          if (!data.success || !Array.isArray(data.items) || data.items.length === 0) {
            resultsDiv.innerHTML = '<p style="color:#9ca3af; font-size:0.85rem;">No se encontraron contenidos con la etiqueta #' + tag + '</p>';
            return;
          }

          resultsDiv.innerHTML = '<h3 style="font-size:0.95rem; font-weight:700; margin-bottom:10px; color:#38bdf8;">Resultados para #' + tag + ' (' + data.items.length + ')</h3>' +
            data.items.map(item => renderPostCardHtml(item)).join('');
        })
        .catch(() => {
          resultsDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem;">Error al filtrar por etiqueta.</p>';
        });
    }
  `;
}

module.exports = {
  getVerClientScript
};
