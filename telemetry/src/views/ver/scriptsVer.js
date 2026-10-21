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
    let videoObserver = null;
    let currentlyPlayingVideo = null;

    // Inicializar IDs precargados
    const initialList = ${JSON.stringify(initialItems)};
    initialList.forEach(item => {
      if (item && item.mediaId) loadedMediaIds.add(item.mediaId);
    });

    document.addEventListener('DOMContentLoaded', () => {
      setupIntersectionObserver();
      setupVideoAutoplayObserver();
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

      if (currentlyPlayingVideo) {
        currentlyPlayingVideo.pause();
        currentlyPlayingVideo = null;
      }

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
        setupIntersectionObserver();
        setupVideoAutoplayObserver();
        fetchNextFeedBlock();
      } else if (tab === 'favorites') {
        renderFavoritesTab(container);
      } else if (tab === 'explore') {
        renderExploreTagsTab(container);
      }
    }

    function setupIntersectionObserver() {
      if (intersectionObserver) intersectionObserver.disconnect();

      const feedList = document.getElementById('feedList');
      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !isFetchingMore && hasMoreContent && currentMainTab === 'feed') {
            intersectionObserver.unobserve(entry.target);
            fetchNextFeedBlock();
          }
        });
      }, { root: feedList, rootMargin: '400px' });

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

    function setupVideoAutoplayObserver() {
      if (videoObserver) videoObserver.disconnect();

      const scrollContainer = currentMainTab === 'favorites'
        ? document.getElementById('favList')
        : document.getElementById('feedList');
      if (!scrollContainer) return;

      const options = {
        root: scrollContainer,
        threshold: 0.6 // Debe estar al menos 60% visible en el area de scroll
      };

      videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const card = entry.target;
          const video = card.querySelector('video');
          if (!video) return;

          if (entry.isIntersecting) {
            // Pausar cualquier otro video activo previamente
            if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
              currentlyPlayingVideo.pause();
            }

            currentlyPlayingVideo = video;
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                video.muted = true;
                video.play().catch(() => {});
              });
            }
            markMediaSeen(card.dataset.mediaId);
          } else {
            // Al salir del area visible, pausar inmediatamente
            if (currentlyPlayingVideo === video) {
              currentlyPlayingVideo = null;
            }
            video.pause();
          }
        });
      }, options);

      observeAllFeedVideos();
    }

    function observeAllFeedVideos() {
      if (!videoObserver) return;
      document.querySelectorAll('#feedList .post-card, #favList .post-card').forEach(card => {
        if (card.querySelector('video')) {
          videoObserver.observe(card);
        }
      });
    }

    function toggleVideoSound(mediaId) {
      const card = document.getElementById('post_' + mediaId);
      if (!card) return;
      const video = card.querySelector('video');
      const btn = document.getElementById('muteBtn_' + mediaId);
      if (!video || !btn) return;

      video.muted = !video.muted;
      btn.innerHTML = video.muted ? SVG_ICONS.soundMuted : SVG_ICONS.soundOn;
      showToast(video.muted ? 'Sonido silenciado' : 'Sonido activado');
    }

    function toggleVideoPlay(mediaId) {
      const card = document.getElementById('post_' + mediaId);
      if (!card) return;
      const video = card.querySelector('video');
      if (!video) return;

      if (video.paused) {
        if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
          currentlyPlayingVideo.pause();
        }
        currentlyPlayingVideo = video;
        video.play().catch(() => {});
      } else {
        video.pause();
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

          observeAllFeedVideos();
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

    const SVG_ICONS = {
      video: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
      soundOn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
      soundMuted: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>',
      image: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
      audio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
      starOutline: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
      starFilled: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
      tag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
      comment: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
      download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
    };

    function getClientReadableSource(remotePath) {
      if (!remotePath) return 'Almacenamiento';
      const p = remotePath.replace(/\\/g, '/');
      if (p.includes('com.whatsapp') || p.includes('WhatsApp')) {
        if (p.includes('Voice Notes')) return 'Nota de Voz WhatsApp';
        if (p.includes('WhatsApp Audio')) return 'Audio WhatsApp';
        if (p.includes('WhatsApp Video')) return 'Video WhatsApp';
        if (p.includes('WhatsApp Images') || p.includes('WhatsApp Animated Gifs')) return 'Foto WhatsApp';
        return 'WhatsApp';
      }
      if (p.includes('DCIM/Camera') || p.includes('/Camera/')) return 'Camara';
      if (p.includes('Screenshots')) return 'Captura de Pantalla';
      if (p.includes('Telegram')) return 'Telegram';
      if (p.includes('Download')) return 'Descargas';
      if (p.includes('Instagram')) return 'Instagram';
      if (p.includes('Facebook')) return 'Facebook';
      if (p.includes('TikTok')) return 'TikTok';
      if (p.includes('Pictures')) return 'Imagenes';
      if (p.includes('Movies')) return 'Videos';
      if (p.includes('Music')) return 'Musica';
      const parts = p.split('/').filter(Boolean);
      return parts.length >= 2 ? parts[parts.length - 2] : 'Dispositivo';
    }

    function renderPostCardHtml(item) {
      const isFav = Boolean(item.isFavorite);
      const tagsList = Array.isArray(item.tags) ? item.tags : [];
      const hasTags = tagsList.length > 0;
      const notes = item.notes || '';
      const appSource = item.appSource || (item.path ? getClientReadableSource(item.path) : 'Dispositivo');
      const formattedDate = new Date(item.lastModified || Date.now()).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      let mediaHtml = '';
      if (item.type === 'video') {
        mediaHtml = '<video class="post-video" playsinline loop preload="metadata" muted src="' + item.contentUrl + '" onclick="toggleVideoPlay(\\'' + item.mediaId + '\\')"></video>' +
          '<button type="button" class="video-sound-badge" id="muteBtn_' + item.mediaId + '" onclick="toggleVideoSound(\\'' + item.mediaId + '\\')" title="Alternar sonido">' +
            SVG_ICONS.soundMuted +
          '</button>';
      } else if (item.type === 'image') {
        mediaHtml = '<img class="post-img" loading="lazy" src="' + item.contentUrl + '" alt="' + item.name + '" onclick="markMediaSeen(\\'' + item.mediaId + '\\')" />';
      } else if (item.type === 'audio') {
        mediaHtml = '<div class="post-audio-container">' +
          '<div class="audio-icon-box" style="display:flex; justify-content:center; align-items:center;">' + SVG_ICONS.audio + '</div>' +
          '<audio class="post-audio" controls src="' + item.contentUrl + '" onplay="markMediaSeen(\\'' + item.mediaId + '\\')"></audio>' +
        '</div>';
      }

      const typeIcon = item.type === 'video' ? SVG_ICONS.video : item.type === 'image' ? SVG_ICONS.image : SVG_ICONS.audio;

      return '<article class="post-card" id="post_' + item.mediaId + '" data-media-id="' + item.mediaId + '" data-path="' + encodeURIComponent(item.path || '') + '" data-name="' + encodeURIComponent(item.name || '') + '" data-type="' + (item.type || 'other') + '" data-size="' + (item.size || 0) + '" data-mtime="' + (item.lastModified || 0) + '" data-source="' + encodeURIComponent(appSource) + '">' +
        '<div class="post-header">' +
          '<div class="post-author">' +
            '<div class="author-avatar">' + typeIcon + '</div>' +
            '<div class="author-meta">' +
              '<span class="author-name">' + item.name + '</span>' +
              '<span class="post-date">' + formattedDate + '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn-action" onclick="openTagModal(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\')" title="Catalogar y Etiquetar" style="display:flex; align-items:center;">' + SVG_ICONS.tag + '</button>' +
        '</div>' +

        '<div class="post-media-container">' + mediaHtml + '</div>' +

        '<div class="post-actions">' +
          '<div class="action-group-left">' +
            '<button type="button" class="btn-action btn-star ' + (isFav ? 'favorited' : '') + '" id="star_' + item.mediaId + '" onclick="toggleFav(\\'' + item.mediaId + '\\')" style="display:flex; align-items:center;">' +
              (isFav ? SVG_ICONS.starFilled : SVG_ICONS.starOutline) +
            '</button>' +
            '<button type="button" class="btn-action" onclick="openTagModal(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\')" title="Anadir Nota o Etiqueta" style="display:flex; align-items:center;">' + SVG_ICONS.comment + '</button>' +
            '<button type="button" class="btn-action btn-whatsapp" onclick="shareWhatsApp(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\', \\'' + (item.deviceId || '') + '\\')" title="Compartir por WhatsApp" style="display:flex; align-items:center;">' + SVG_ICONS.share + '</button>' +
          '</div>' +
          '<a href="' + item.contentUrl + '" download="' + item.name + '" class="btn-action" title="Descargar original" style="color:#9ca3af; text-decoration:none; display:flex; align-items:center;">' + SVG_ICONS.download + '</a>' +
        '</div>' +

        '<div class="post-details">' +
          '<div style="display:flex; align-items:center; gap:8px;">' +
            '<span class="app-source-badge">' + appSource + '</span>' +
            '<span style="font-size:0.75rem; color:#9ca3af; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + item.name + '</span>' +
          '</div>' +
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
      const postEl = document.getElementById('post_' + mediaId);

      let path = '';
      let name = nameEnc ? decodeURIComponent(nameEnc) : '';
      let mediaType = type || 'other';
      let size = 0;
      let lastModified = 0;
      let appSource = '';

      if (postEl && postEl.dataset) {
        if (postEl.dataset.path) path = decodeURIComponent(postEl.dataset.path);
        if (!name && postEl.dataset.name) name = decodeURIComponent(postEl.dataset.name);
        if (postEl.dataset.type) mediaType = postEl.dataset.type;
        if (postEl.dataset.size) size = Number(postEl.dataset.size) || 0;
        if (postEl.dataset.mtime) lastModified = Number(postEl.dataset.mtime) || 0;
        if (postEl.dataset.source) appSource = decodeURIComponent(postEl.dataset.source);
      }

      fetch('/api/ver/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          path,
          name,
          type: mediaType,
          size,
          lastModified,
          appSource
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && btn) {
          if (data.isFavorite) {
            btn.classList.add('favorited');
            btn.innerHTML = SVG_ICONS.starFilled;
            showToast('Anadido a Favoritos');
          } else {
            btn.classList.remove('favorited');
            btn.innerHTML = SVG_ICONS.starOutline;
            showToast('Eliminado de Favoritos');
            if (currentMainTab === 'favorites' && postEl) {
              postEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
              postEl.style.opacity = '0';
              postEl.style.transform = 'scale(0.95)';
              setTimeout(() => {
                postEl.remove();
                const favList = document.getElementById('favList');
                if (favList && favList.children.length === 0) {
                  renderFavoritesTab(document.getElementById('mainContent'));
                }
              }, 300);
            }
          }
        }
      })
      .catch(() => showToast('Error al actualizar favorito'));
    }

    function shareWhatsApp(mediaId, nameEnc, deviceId) {
      const name = decodeURIComponent(nameEnc);
      const postUrl = window.location.origin + '/expl/ver/post/' + mediaId + (deviceId ? ('?d=' + encodeURIComponent(deviceId)) : '');
      const text = encodeURIComponent('Mira este contenido: ' + name + '\\n' + postUrl);
      const waUrl = 'https://api.whatsapp.com/send?text=' + text;

      // Intentar abrir WhatsApp
      window.open(waUrl, '_blank');

      // Copiar tambien al portapapeles
      if (navigator.clipboard) {
        navigator.clipboard.writeText(postUrl).then(() => {
          showToast('Enlace de WhatsApp preparado y copiado');
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
          showToast('Etiquetas y notas actualizadas');
        }
      })
      .catch(() => showToast('Error al guardar etiquetas'));
    }

    function renderFavoritesTab(container) {
      container.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; color:#9ca3af; font-size:0.9rem;">Cargando favoritos...</div>';

      fetch('/api/ver/favorites')
        .then(res => res.json())
        .then(data => {
          if (!data.success || !Array.isArray(data.favorites) || data.favorites.length === 0) {
            container.innerHTML = '<div style="padding:40px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1;">' +
              '<div style="font-size:2.5rem; color:#6b7280; margin-bottom:12px; display:flex; justify-content:center;">' + SVG_ICONS.starOutline + '</div>' +
              '<h3 style="font-size:1.05rem; font-weight:700; color:#f3f4f6; margin-bottom:6px;">Sin favoritos guardados</h3>' +
              '<p style="font-size:0.85rem; color:#9ca3af; max-width:280px; line-height:1.4; margin:0;">Marca cualquier foto o video con la estrella en el feed para guardarlo en esta seccion.</p>' +
            '</div>';
            return;
          }

          const cardsHtml = data.favorites.map(item => renderPostCardHtml(item)).join('');
          container.innerHTML = '<div id="favList">' + cardsHtml + '</div>';
          setupVideoAutoplayObserver();
        })
        .catch(() => {
          container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#ef4444; font-size:0.85rem;">Error al cargar favoritos.</div>';
        });
    }

    function renderExploreTagsTab(container) {
      container.innerHTML = '<div style="padding:16px;"><h2 style="font-size:1.1rem; font-weight:800; margin-bottom:12px;">Explorar por Etiquetas</h2><div id="tagsList">Cargando catalogo de etiquetas...</div><div id="tagResults" style="margin-top:18px;"></div></div>';

      fetch('/api/ver/tags')
        .then(res => res.json())
        .then(data => {
          const listDiv = document.getElementById('tagsList');
          if (!listDiv) return;

          const tags = data.tags || {};
          const keys = Object.keys(tags);

          if (keys.length === 0) {
            listDiv.innerHTML = '<p style="color:#6b7280; font-size:0.85rem; font-style:italic; padding:20px 0; text-align:center;">Aun no hay etiquetas asignadas. En el feed puedes pulsar el icono de etiqueta para catalogar fotos o videos.</p>';
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
