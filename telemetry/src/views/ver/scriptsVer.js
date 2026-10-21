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
    let favoritesCache = new Map();
    let activePopupMedia = null;

    // Inicializar IDs precargados
    const initialList = ${JSON.stringify(initialItems)};
    initialList.forEach(item => {
      if (item && item.mediaId) loadedMediaIds.add(item.mediaId);
    });

    let scrollCheckTimer = null;

    document.addEventListener('DOMContentLoaded', () => {
      setupIntersectionObserver();
      setupVideoAutoplayObserver();
      checkVisibleVideos();
      setTimeout(checkVisibleVideos, 200);
      setTimeout(checkVisibleVideos, 600);

      // Desbloquear autoplay de video tras el primer toque en pantalla si el navegador lo restringe
      const unlockAutoplay = () => {
        checkVisibleVideos();
      };
      document.addEventListener('touchstart', unlockAutoplay, { passive: true, once: true });
      document.addEventListener('click', unlockAutoplay, { once: true });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeMediaPopup();
          closeTagModal();
        }
      });
    });

    function formatBytes(bytes) {
      if (!bytes || bytes <= 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

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
        container.innerHTML = '<div id="feedList"></div>';
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

    function showVideoSpinner(mediaId) {
      const loader = document.getElementById('vloader_' + mediaId);
      if (loader) {
        loader.style.opacity = '1';
        loader.style.display = 'flex';
      }
    }

    function hideVideoSpinner(mediaId) {
      const loader = document.getElementById('vloader_' + mediaId);
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
          if (loader.style.opacity === '0') loader.style.display = 'none';
        }, 250);
      }
    }

    function tryPlayVideo(video) {
      if (!video) return;
      video.muted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      const card = video.closest ? video.closest('.post-card') : null;
      const mediaId = card && card.dataset ? card.dataset.mediaId : null;
      if (mediaId && video.readyState < 3) {
        showVideoSpinner(mediaId);
      }
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (mediaId) hideVideoSpinner(mediaId);
          })
          .catch(() => {
            video.muted = true;
            const onReady = () => {
              video.removeEventListener('loadeddata', onReady);
              video.removeEventListener('canplay', onReady);
              if (currentlyPlayingVideo === video) {
                video.muted = true;
                video.play()
                  .then(() => { if (mediaId) hideVideoSpinner(mediaId); })
                  .catch(() => {});
              }
            };
            video.addEventListener('loadeddata', onReady);
            video.addEventListener('canplay', onReady);
          });
      }
    }

    function checkVisibleVideos() {
      const cards = document.querySelectorAll('#feedList .post-card, #favList .post-card, #tagResults .post-card');
      if (!cards.length) return;

      const viewportCenterY = window.innerHeight / 2;
      let activeCard = null;
      let minDistance = Infinity;

      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.height > 0 && rect.bottom > 120 && rect.top < window.innerHeight - 120) {
          const cardCenterY = rect.top + rect.height / 2;
          const dist = Math.abs(viewportCenterY - cardCenterY);
          if (dist < minDistance) {
            minDistance = dist;
            activeCard = card;
          }
        }
      });

      cards.forEach(card => {
        const video = card.querySelector('video');
        if (!video) return;

        if (card === activeCard) {
          if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
            currentlyPlayingVideo.pause();
          }
          currentlyPlayingVideo = video;
          if (video.paused) {
            tryPlayVideo(video);
          }
          if (card.dataset && card.dataset.mediaId) {
            markMediaSeen(card.dataset.mediaId);
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
          if (currentlyPlayingVideo === video) {
            currentlyPlayingVideo = null;
          }
        }
      });
    }

    function setupVideoAutoplayObserver() {
      if (videoObserver) videoObserver.disconnect();

      const scrollContainer = currentMainTab === 'favorites'
        ? document.getElementById('favList')
        : document.getElementById('feedList');

      if (scrollContainer && !scrollContainer.dataset.scrollBound) {
        scrollContainer.dataset.scrollBound = '1';
        scrollContainer.addEventListener('scroll', () => {
          if (scrollCheckTimer) clearTimeout(scrollCheckTimer);
          scrollCheckTimer = setTimeout(checkVisibleVideos, 90);
        }, { passive: true });
      }

      videoObserver = new IntersectionObserver(() => {
        checkVisibleVideos();
      }, {
        root: null,
        threshold: [0.25, 0.5, 0.75]
      });

      observeAllFeedVideos();
      setTimeout(checkVisibleVideos, 100);
    }

    function observeAllFeedVideos() {
      if (!videoObserver) return;
      document.querySelectorAll('#feedList .post-card, #favList .post-card').forEach(card => {
        videoObserver.observe(card);
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
      download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
      whatsapp: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>'
    };

    function getClientReadableSource(remotePath) {
      if (!remotePath) return 'Almacenamiento';
      const p = String(remotePath).split('\\\\').join('/');
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
      const notes = item.notes || '';
      const appSource = item.appSource || (item.path ? getClientReadableSource(item.path) : 'Dispositivo');
      const formattedDate = new Date(item.lastModified || Date.now()).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      let mediaHtml = '';
      if (item.type === 'video') {
        mediaHtml = '<div class="video-loading-box" id="vloader_' + item.mediaId + '"><div class="video-spinner"></div></div>' +
          '<video class="post-video" playsinline webkit-playsinline loop preload="auto" muted src="' + item.contentUrl + '" onclick="toggleVideoPlay(\\'' + item.mediaId + '\\')" onwaiting="showVideoSpinner(\\'' + item.mediaId + '\\')" onloadstart="showVideoSpinner(\\'' + item.mediaId + '\\')" oncanplay="hideVideoSpinner(\\'' + item.mediaId + '\\')" onplaying="hideVideoSpinner(\\'' + item.mediaId + '\\')"></video>';
      } else if (item.type === 'image') {
        mediaHtml = '<img class="post-img" loading="lazy" src="' + item.contentUrl + '" alt="' + item.name + '" onclick="markMediaSeen(\\'' + item.mediaId + '\\')" />';
      } else if (item.type === 'audio') {
        mediaHtml = '<div class="post-audio-container">' +
          '<div class="audio-icon-box" style="display:flex; justify-content:center; align-items:center;">' + SVG_ICONS.audio + '</div>' +
          '<audio class="post-audio" controls src="' + item.contentUrl + '" onplay="markMediaSeen(\\'' + item.mediaId + '\\')"></audio>' +
        '</div>';
      }

      const typeIcon = item.type === 'video' ? SVG_ICONS.video : item.type === 'image' ? SVG_ICONS.image : SVG_ICONS.audio;

      const sideActionsHtml = '<div class="post-side-actions">' +
        '<button type="button" class="side-action-btn btn-star ' + (isFav ? 'favorited' : '') + '" id="star_' + item.mediaId + '" onclick="event.stopPropagation(); toggleFav(\\'' + item.mediaId + '\\')" title="Agregar a Favoritos">' +
          (isFav ? SVG_ICONS.starFilled : SVG_ICONS.starOutline) +
        '</button>' +
        '<button type="button" class="side-action-btn btn-whatsapp" onclick="event.stopPropagation(); shareWhatsApp(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\', \\'' + (item.deviceId || '') + '\\')" title="Compartir con WhatsApp">' +
          SVG_ICONS.whatsapp +
        '</button>' +
        '<button type="button" class="side-action-btn" onclick="event.stopPropagation(); openTagModal(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\')" title="Agregar Tags o Nota">' +
          SVG_ICONS.tag +
        '</button>' +
        '<a href="' + item.contentUrl + '" download="' + item.name + '" class="side-action-btn" onclick="event.stopPropagation();" title="Descargar">' +
          SVG_ICONS.download +
        '</a>' +
        (item.type === 'video' ? (
          '<button type="button" class="side-action-btn" id="muteBtn_' + item.mediaId + '" onclick="event.stopPropagation(); toggleVideoSound(\\'' + item.mediaId + '\\')" title="Silencio / Activar sonido">' +
            SVG_ICONS.soundMuted +
          '</button>'
        ) : '') +
      '</div>';

      return '<article class="post-card" id="post_' + item.mediaId + '" data-media-id="' + item.mediaId + '" data-path="' + encodeURIComponent(item.path || '') + '" data-name="' + encodeURIComponent(item.name || '') + '" data-type="' + (item.type || 'other') + '" data-size="' + (item.size || 0) + '" data-mtime="' + (item.lastModified || 0) + '" data-source="' + encodeURIComponent(appSource) + '">' +
        '<div class="post-header">' +
          '<div class="post-author">' +
            '<div class="author-avatar">' + typeIcon + '</div>' +
            '<div class="author-meta">' +
              '<span class="author-name">' + item.name + '</span>' +
              '<span class="post-date">' + formattedDate + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="post-media-container">' + mediaHtml + '<span class="app-source-badge">' + appSource + '</span>' + sideActionsHtml + '</div>' +

        '<div class="post-details">' +
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
      const feedBtn = document.getElementById('star_' + mediaId);
      const favBtn = document.getElementById('favStar_' + mediaId);
      const popupBtn = document.getElementById('popupFav_' + mediaId);
      const postEl = document.getElementById('post_' + mediaId);
      const favRowEl = document.getElementById('favRow_' + mediaId);

      let cached = favoritesCache.get(mediaId) || {};
      let path = cached.path || '';
      let name = nameEnc ? decodeURIComponent(nameEnc) : (cached.name || '');
      let mediaType = type || cached.type || 'other';
      let size = cached.size || 0;
      let lastModified = cached.lastModified || 0;
      let appSource = cached.appSource || '';

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
        if (data.success) {
          const isFav = Boolean(data.isFavorite);
          if (isFav) {
            if (feedBtn) {
              feedBtn.classList.add('favorited');
              feedBtn.innerHTML = SVG_ICONS.starFilled;
            }
            if (favBtn) {
              favBtn.classList.add('favorited');
              favBtn.innerHTML = SVG_ICONS.starFilled;
            }
            if (popupBtn) {
              popupBtn.classList.add('favorited');
              popupBtn.innerHTML = SVG_ICONS.starFilled + '<span>Favorito</span>';
            }
            showToast('Anadido a Favoritos');
          } else {
            if (feedBtn) {
              feedBtn.classList.remove('favorited');
              feedBtn.innerHTML = SVG_ICONS.starOutline;
            }
            if (favBtn) {
              favBtn.classList.remove('favorited');
              favBtn.innerHTML = SVG_ICONS.starOutline;
            }
            if (popupBtn) {
              popupBtn.classList.remove('favorited');
              popupBtn.innerHTML = SVG_ICONS.starOutline + '<span>Favorito</span>';
            }
            showToast('Eliminado de Favoritos');
            favoritesCache.delete(mediaId);

            if (currentMainTab === 'favorites') {
              const targetRow = favRowEl || postEl;
              if (targetRow) {
                targetRow.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                targetRow.style.opacity = '0';
                targetRow.style.transform = 'scale(0.92)';
                setTimeout(() => {
                  targetRow.remove();
                  const favList = document.getElementById('favList');
                  if (favList && favList.querySelectorAll('.fav-row-card').length === 0) {
                    renderFavoritesTab(document.getElementById('mainContent'));
                  }
                }, 250);
              }
            }
          }
        }
      })
      .catch(() => showToast('Error al actualizar favorito'));
    }

    function shareWhatsApp(mediaId, nameEnc, deviceId) {
      const name = decodeURIComponent(nameEnc || 'Contenido');
      const postUrl = window.location.origin + '/expl/ver/post/' + mediaId + (deviceId ? ('?d=' + encodeURIComponent(deviceId)) : '');
      const shareText = 'Mira este contenido: ' + name + '\\n' + postUrl;

      // Copiar enlace al portapapeles preventivamente
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(postUrl).catch(() => {});
      }

      // Web Share API nativa (hoja de compartir nativa de Android/iOS)
      if (navigator.share) {
        navigator.share({
          title: name,
          text: 'Mira este contenido: ' + name,
          url: postUrl
        }).then(() => {
          showToast('Enlace compartido con exito');
        }).catch((err) => {
          if (err && err.name === 'AbortError') return;
          openWhatsAppDirect(shareText);
        });
      } else {
        openWhatsAppDirect(shareText);
      }
    }

    function openWhatsAppDirect(shareText) {
      const encText = encodeURIComponent(shareText);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile) {
        // En dispositivo movil intentar abrir directamente la app nativa de WhatsApp
        window.location.href = 'whatsapp://send?text=' + encText;
        showToast('Abriendo WhatsApp...');
        setTimeout(() => {
          window.open('https://api.whatsapp.com/send?text=' + encText, '_blank');
        }, 1200);
      } else {
        // En escritorio usar WhatsApp Web con fallback
        window.open('https://web.whatsapp.com/send?text=' + encText, '_blank') || 
        window.open('https://api.whatsapp.com/send?text=' + encText, '_blank');
        showToast('Abriendo WhatsApp...');
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

          favoritesCache.clear();
          const rowsHtml = data.favorites.map(item => {
            favoritesCache.set(item.mediaId, item);
            return renderFavRowCardHtml(item);
          }).join('');

          container.innerHTML = '<div id="favList">' + rowsHtml + '</div>';
        })
        .catch(() => {
          container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#ef4444; font-size:0.85rem;">Error al cargar favoritos.</div>';
        });
    }

    function renderFavRowCardHtml(item) {
      const tagsList = Array.isArray(item.tags) ? item.tags : [];
      const appSource = item.appSource || (item.path ? getClientReadableSource(item.path) : 'Dispositivo');
      const formattedDate = new Date(item.lastModified || Date.now()).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short'
      });
      const formattedSize = formatBytes(item.size || 0);

      let thumbHtml = '';
      if (item.type === 'video') {
        thumbHtml = '<video class="fav-thumb-video" src="' + item.contentUrl + '#t=0.5" preload="metadata" muted playsinline></video>' +
          '<div class="fav-play-badge">' + SVG_ICONS.video + '</div>';
      } else if (item.type === 'image') {
        thumbHtml = '<img class="fav-thumb-img" loading="lazy" src="' + item.contentUrl + '" alt="' + item.name + '" />';
      } else {
        thumbHtml = '<div class="fav-audio-icon">' + SVG_ICONS.audio + '</div>';
      }

      return '<div class="fav-row-card" id="favRow_' + item.mediaId + '" onclick="openMediaPopup(\\'' + item.mediaId + '\\')">' +
        '<div class="fav-thumb-box">' + thumbHtml + '</div>' +
        '<div class="fav-info">' +
          '<span class="fav-title" title="' + item.name + '">' + item.name + '</span>' +
          '<div class="fav-meta-row">' +
            '<span class="app-source-badge" style="position:static; padding:2px 7px; font-size:0.68rem;">' + appSource + '</span>' +
            '<span class="fav-date">' + formattedDate + '</span>' +
            '<span class="fav-size">' + formattedSize + '</span>' +
          '</div>' +
          (tagsList.length > 0 ? (
            '<div class="fav-tags-row">' +
              tagsList.map(t => '<span class="tag-badge" style="font-size:0.66rem; padding:1px 6px;">#' + t + '</span>').join('') +
            '</div>'
          ) : '') +
        '</div>' +
        '<button type="button" class="fav-star-btn favorited" id="favStar_' + item.mediaId + '" onclick="event.stopPropagation(); toggleFav(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\', \\'' + item.type + '\\')" title="Quitar de favoritos">' +
          SVG_ICONS.starFilled +
        '</button>' +
      '</div>';
    }

    function openMediaPopup(mediaId) {
      const item = favoritesCache.get(mediaId);
      if (!item) return;
      activePopupMedia = item;

      if (currentlyPlayingVideo) {
        currentlyPlayingVideo.pause();
      }

      const modal = document.getElementById('mediaPopupModal');
      const titleEl = document.getElementById('popupMediaTitle');
      const sourceEl = document.getElementById('popupMediaSource');
      const bodyEl = document.getElementById('popupMediaBody');
      const actionsEl = document.getElementById('popupMediaActions');
      const notesEl = document.getElementById('popupMediaNotes');
      const tagsEl = document.getElementById('popupMediaTags');

      if (!modal || !bodyEl) return;

      if (titleEl) titleEl.textContent = item.name;
      if (sourceEl) sourceEl.textContent = item.appSource || (item.path ? getClientReadableSource(item.path) : 'Dispositivo');

      if (item.type === 'video') {
        bodyEl.innerHTML = '<video controls autoplay playsinline loop src="' + item.contentUrl + '"></video>';
      } else if (item.type === 'image') {
        bodyEl.innerHTML = '<img src="' + item.contentUrl + '" alt="' + item.name + '" />';
      } else if (item.type === 'audio') {
        bodyEl.innerHTML = '<div class="post-audio-container" style="width:100%; padding:24px 16px;">' +
          '<div class="audio-icon-box" style="margin-bottom:12px;">' + SVG_ICONS.audio + '</div>' +
          '<audio controls autoplay src="' + item.contentUrl + '" style="width:100%; max-width:340px;"></audio>' +
        '</div>';
      }

      const isFav = Boolean(item.isFavorite !== false);
      if (actionsEl) {
        actionsEl.innerHTML = '<button type="button" class="popup-action-btn btn-wa" onclick="shareWhatsApp(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\', \\'' + (item.deviceId || '') + '\\')">' +
            SVG_ICONS.whatsapp + '<span>WhatsApp</span>' +
          '</button>' +
          '<a href="' + item.contentUrl + '" download="' + item.name + '" class="popup-action-btn">' +
            SVG_ICONS.download + '<span>Descargar</span>' +
          '</a>' +
          '<button type="button" class="popup-action-btn" onclick="openTagModal(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\')">' +
            SVG_ICONS.tag + '<span>Etiquetar</span>' +
          '</button>' +
          '<button type="button" class="popup-action-btn btn-fav ' + (isFav ? 'favorited' : '') + '" id="popupFav_' + item.mediaId + '" onclick="toggleFav(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\', \\'' + item.type + '\\')">' +
            (isFav ? SVG_ICONS.starFilled : SVG_ICONS.starOutline) + '<span>Favorito</span>' +
          '</button>';
      }

      if (notesEl) {
        if (item.notes) {
          notesEl.textContent = item.notes;
          notesEl.style.display = 'block';
        } else {
          notesEl.textContent = '';
          notesEl.style.display = 'none';
        }
      }

      if (tagsEl) {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        if (tags.length > 0) {
          tagsEl.innerHTML = tags.map(t => '<span class="tag-badge">#' + t + '</span>').join('');
          tagsEl.style.display = 'flex';
        } else {
          tagsEl.innerHTML = '';
          tagsEl.style.display = 'none';
        }
      }

      modal.classList.add('active');
    }

    function closeMediaPopup() {
      const modal = document.getElementById('mediaPopupModal');
      const bodyEl = document.getElementById('popupMediaBody');
      if (bodyEl) {
        const v = bodyEl.querySelector('video');
        if (v) v.pause();
        const a = bodyEl.querySelector('audio');
        if (a) a.pause();
        bodyEl.innerHTML = '';
      }
      if (modal) modal.classList.remove('active');
      activePopupMedia = null;
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
