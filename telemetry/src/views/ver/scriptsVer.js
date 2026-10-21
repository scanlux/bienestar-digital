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
    let topSearchDebounce = null;
    let isSearchActive = false;

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
      const isSameTab = (currentMainTab === tab);
      currentMainTab = tab;

      if (currentlyPlayingVideo) {
        currentlyPlayingVideo.pause();
        currentlyPlayingVideo = null;
      }

      if (typeof closeMediaPopup === 'function') closeMediaPopup();
      if (typeof closeTagModal === 'function') closeTagModal();
      if (typeof closeContactPopup === 'function') closeContactPopup();

      document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
      if (tab === 'feed') document.getElementById('tabFeed').classList.add('active');
      if (tab === 'favorites') document.getElementById('tabFavorites').classList.add('active');
      if (tab === 'contacts') document.getElementById('tabContacts').classList.add('active');
      if (tab === 'nlp') document.getElementById('tabNlp').classList.add('active');
      if (tab === 'explore') document.getElementById('tabExplore').classList.add('active');

      const searchContainer = document.getElementById('topSearchContainer');
      const contactsSearchContainer = document.getElementById('topSearchContactsContainer');
      const nlpSearchContainer = document.getElementById('topSearchNlpContainer');
      const barTitle = document.getElementById('topBarTitle');

      if (tab === 'feed' || tab === 'favorites') {
        if (searchContainer) searchContainer.style.display = 'flex';
        if (contactsSearchContainer) contactsSearchContainer.style.display = 'none';
        if (nlpSearchContainer) nlpSearchContainer.style.display = 'none';
        if (barTitle) barTitle.style.display = 'none';
      } else if (tab === 'contacts') {
        if (searchContainer) searchContainer.style.display = 'none';
        if (contactsSearchContainer) contactsSearchContainer.style.display = 'flex';
        if (nlpSearchContainer) nlpSearchContainer.style.display = 'none';
        if (barTitle) barTitle.style.display = 'none';
      } else if (tab === 'nlp') {
        if (searchContainer) searchContainer.style.display = 'none';
        if (contactsSearchContainer) contactsSearchContainer.style.display = 'none';
        if (nlpSearchContainer) nlpSearchContainer.style.display = 'flex';
        if (barTitle) barTitle.style.display = 'none';
      } else {
        if (searchContainer) searchContainer.style.display = 'none';
        if (contactsSearchContainer) contactsSearchContainer.style.display = 'none';
        if (nlpSearchContainer) nlpSearchContainer.style.display = 'none';
        if (barTitle) {
          barTitle.style.display = 'block';
          if (tab === 'explore') barTitle.textContent = 'Explorar Etiquetas';
        }
      }

      const container = document.getElementById('mainContent');
      if (!container) return;

      if (tab === 'feed') {
        if (isSameTab) {
          clearTopSearch();
        }
        if (isSearchActive) {
          executeTopSearch();
        } else {
          container.innerHTML = '<div id="feedList"></div>';
          loadedMediaIds.clear();
          hasMoreContent = true;
          setupIntersectionObserver();
          setupVideoAutoplayObserver();
          fetchNextFeedBlock();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (tab === 'favorites') {
        renderFavoritesTab(container);
      } else if (tab === 'contacts') {
        if (isSameTab) {
          clearContactsTopSearch();
          cachedContactsData = null;
        }
        renderContactsTab(container);
      } else if (tab === 'nlp') {
        // Al pulsar NLP (especialmente si ya estabamos dentro de un paquete o busqueda)
        // se resetea la vista anidada para volver a la lista general de aplicaciones
        currentNlpApp = null;
        currentNlpHighlightTerm = '';
        activeNlpSearchQuery = '';
        const nlpInput = document.getElementById('nlpTopSearchInput');
        if (nlpInput) nlpInput.value = '';
        const btnClearNlp = document.getElementById('btnClearNlpSearch');
        if (btnClearNlp) btnClearNlp.style.display = 'none';
        updateNlpTopSearchPlaceholder();
        renderNlpTab(container);
      } else if (tab === 'explore') {
        renderExploreTagsTab(container);
      }
    }

    let cachedContactsData = null;

    function executeContactsSearch() {
      const input = document.getElementById('contactsTopSearchInput');
      const q = input ? input.value : '';
      const clearBtn = document.getElementById('btnClearContactsSearch');
      if (clearBtn) clearBtn.style.display = q.trim() ? 'block' : 'none';
      handleContactSearch(q);
    }

    function onContactsTopSearchInput(val) {
      const clearBtn = document.getElementById('btnClearContactsSearch');
      if (clearBtn) clearBtn.style.display = (val || '').trim() ? 'block' : 'none';
      handleContactSearch(val);
    }

    function clearContactsTopSearch() {
      const input = document.getElementById('contactsTopSearchInput');
      if (input) input.value = '';
      const clearBtn = document.getElementById('btnClearContactsSearch');
      if (clearBtn) clearBtn.style.display = 'none';
      handleContactSearch('');
    }

    function getAvatarGradient(name) {
      const gradients = [
        'linear-gradient(135deg, #ec4899, #8b5cf6)',
        'linear-gradient(135deg, #3b82f6, #2dd4bf)',
        'linear-gradient(135deg, #f59e0b, #ef4444)',
        'linear-gradient(135deg, #8b5cf6, #3b82f6)',
        'linear-gradient(135deg, #10b981, #06b6d4)',
        'linear-gradient(135deg, #6366f1, #a855f7)'
      ];
      let sum = 0;
      for (let i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i);
      return gradients[sum % gradients.length];
    }

    function getContactInitials(name) {
      if (!name) return '?';
      const clean = name.replace(/[^\\w\\s]/gi, '').trim();
      const parts = clean.split(/\\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      if (parts.length === 1 && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
      return (name.substring(0, 2) || '?').toUpperCase();
    }

    function renderContactsTab(container) {
      if (cachedContactsData) {
        paintContactsTab(container, cachedContactsData);
        return;
      }

      container.innerHTML = '<div style="padding:40px 20px; text-align:center;">' +
        '<div class="video-spinner" style="display:block; margin:0 auto 16px auto;"></div>' +
        '<p style="color:#9ca3af; font-size:0.88rem;">Cargando libreta de contactos y registros de llamadas...</p>' +
      '</div>';

      fetch('/api/ver/contacts')
        .then(res => res.json())
        .then(data => {
          if (!data || !data.success) {
            container.innerHTML = '<div style="padding:30px; text-align:center; color:#ef4444;">' +
              '<p style="font-size:0.9rem;">No se pudieron cargar los contactos.</p>' +
              '<button type="button" onclick="cachedContactsData=null; renderContactsTab(document.getElementById(\\'mainContent\\'))" class="btn" style="margin-top:12px; font-size:0.8rem; padding:6px 14px;">Reintentar</button>' +
            '</div>';
            return;
          }
          cachedContactsData = data;
          paintContactsTab(container, data);
        })
        .catch(err => {
          console.error('[CONTACTS] Error fetch:', err);
          container.innerHTML = '<div style="padding:30px; text-align:center; color:#ef4444;">' +
            '<p style="font-size:0.9rem;">Error al conectar con el servidor.</p>' +
          '</div>';
        });
    }

    function paintContactsTab(container, data) {
      const meta = data.metadata || {};
      const contacts = data.contacts || [];

      let html = '<div class="contacts-container">';
      html += '<div class="contacts-kpi-grid">' +
        '<div class="contacts-kpi-card"><span class="contacts-kpi-num" style="color:#c084fc;">' + (meta.totalContacts || 0) + '</span><span class="contacts-kpi-label">Contactos</span></div>' +
        '<div class="contacts-kpi-card"><span class="contacts-kpi-num" style="color:#38bdf8;">' + (meta.totalCalls || 0) + '</span><span class="contacts-kpi-label">Llamadas</span></div>' +
        '<div class="contacts-kpi-card"><span class="contacts-kpi-num" style="color:#34d399;">' + (meta.incomingCalls || 0) + '</span><span class="contacts-kpi-label">Entrantes</span></div>' +
        '<div class="contacts-kpi-card"><span class="contacts-kpi-num" style="color:#f87171;">' + (meta.missedCalls || 0) + '</span><span class="contacts-kpi-label">Perdidas</span></div>' +
      '</div>';

      html += '<div id="contactsListItems" style="display:flex; flex-direction:column; gap:8px;">';
      html += renderContactRowsList(contacts);
      html += '</div></div>';

      container.innerHTML = html;
    }

    function renderContactRowsList(contactsList) {
      if (!contactsList || contactsList.length === 0) {
        return '<p style="color:#6b7280; font-size:0.85rem; font-style:italic; padding:24px 0; text-align:center;">No se encontraron contactos coincidentes.</p>';
      }

      return contactsList.map(c => {
        const initials = getContactInitials(c.fullName);
        const grad = getAvatarGradient(c.fullName);
        const primaryPhone = (c.phoneNumbers && c.phoneNumbers[0]) ? c.phoneNumbers[0].number : 'Sin telefono';
        const safeId = String(c.id).replace(/[^a-zA-Z0-9_-]/g, '_');

        let callStatsHtml = '';
        if (c.totalCalls > 0) {
          callStatsHtml = '<div class="contact-calls-summary">' +
            '<span class="call-badge-total">' + c.totalCalls + ' llamadas</span>' +
            '<div class="call-chips-row">' +
              (c.incomingCalls > 0 ? '<span class="call-chip-in">+' + c.incomingCalls + '</span>' : '') +
              (c.outgoingCalls > 0 ? '<span class="call-chip-out">-' + c.outgoingCalls + '</span>' : '') +
              (c.missedCalls > 0 ? '<span class="call-chip-mis">&times;' + c.missedCalls + '</span>' : '') +
            '</div>' +
          '</div>';
        }

        const orgText = c.organization && c.organization.company ? (' &bull; ' + c.organization.company) : '';

        return '<div class="contact-row-card" onclick="openContactDetailModal(\\'' + safeId + '\\')">' +
          '<div class="contact-avatar" style="background:' + grad + ';">' + initials + '</div>' +
          '<div class="contact-info">' +
            '<span class="contact-name">' + c.fullName + '</span>' +
            '<span class="contact-sub">' + primaryPhone + orgText + '</span>' +
          '</div>' +
          callStatsHtml +
        '</div>';
      }).join('');
    }

    function handleContactSearch(query) {
      if (!cachedContactsData) return;
      const q = (query || '').trim().toLowerCase();
      const listDiv = document.getElementById('contactsListItems');
      if (!listDiv) return;

      if (!q) {
        listDiv.innerHTML = renderContactRowsList(cachedContactsData.contacts);
        return;
      }

      const filtered = (cachedContactsData.contacts || []).filter(c => {
        const nameMatch = (c.fullName || '').toLowerCase().includes(q);
        const phoneMatch = (c.phoneNumbers || []).some(p => String(p.number || '').includes(q));
        const orgMatch = c.organization && (c.organization.company || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || orgMatch;
      });

      listDiv.innerHTML = renderContactRowsList(filtered);
    }

    function openContactDetailModal(contactId) {
      if (!cachedContactsData) return;
      const c = (cachedContactsData.contacts || []).find(item => String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_') === String(contactId));
      if (!c) return;

      const modal = document.getElementById('contactPopupModal');
      const titleEl = document.getElementById('contactPopupTitle');
      const subEl = document.getElementById('contactPopupSub');
      const bodyEl = document.getElementById('contactPopupBody');
      if (!modal || !bodyEl) return;

      if (titleEl) titleEl.textContent = c.fullName || 'Contacto';
      if (subEl) subEl.textContent = c.organization?.company || c.nickname || 'Detalle del contacto';

      const initials = getContactInitials(c.fullName);
      const grad = getAvatarGradient(c.fullName);

      let bodyHtml = '<div style="display:flex; align-items:center; gap:14px; background:#111827; border:1px solid #1f2937; border-radius:12px; padding:12px 14px;">' +
        '<div class="contact-avatar" style="width:52px; height:52px; font-size:1.15rem; background:' + grad + ';">' + initials + '</div>' +
        '<div style="flex:1; min-width:0;">' +
          '<h3 style="font-size:1rem; font-weight:800; color:#fff; margin-bottom:2px;">' + c.fullName + '</h3>' +
          (c.organization?.company ? '<p style="font-size:0.78rem; color:#9ca3af;">' + c.organization.company + (c.organization.jobPosition ? ' &bull; ' + c.organization.jobPosition : '') + '</p>' : '') +
          (c.nickname ? '<p style="font-size:0.75rem; color:#6b7280; font-style:italic;">' + c.nickname + '</p>' : '') +
        '</div>' +
      '</div>';

      if (c.phoneNumbers && c.phoneNumbers.length > 0) {
        bodyHtml += '<div><span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#9ca3af; display:block; margin-bottom:6px;">Telefonos</span>';
        bodyHtml += '<div style="display:flex; flex-direction:column; gap:6px;">' +
          c.phoneNumbers.map(p => {
            const raw = p.number || '';
            const digits = raw.replace(/[^0-9]/g, '');
            const waNumber = digits.length === 10 ? ('57' + digits) : digits;
            return '<div style="display:flex; justify-content:space-between; align-items:center; background:#111827; border:1px solid #1f2937; border-radius:8px; padding:8px 12px;">' +
              '<div><span style="font-size:0.88rem; font-weight:700; color:#ffffff;">' + raw + '</span><span style="font-size:0.7rem; color:#6b7280; margin-left:6px;">' + (p.label || '') + '</span></div>' +
              '<div style="display:flex; gap:8px;">' +
                '<a href="tel:' + raw + '" style="background:#1e293b; color:#38bdf8; border:1px solid #374151; border-radius:6px; font-size:0.75rem; font-weight:700; padding:4px 10px; text-decoration:none;">Llamar</a>' +
                (digits.length >= 7 ? '<a href="https://wa.me/' + waNumber + '" target="_blank" rel="noopener" style="background:#064e3b; color:#34d399; border:1px solid #059669; border-radius:6px; font-size:0.75rem; font-weight:700; padding:4px 10px; text-decoration:none; display:flex; align-items:center; gap:4px;">' + SVG_ICONS.whatsapp + '</a>' : '') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div></div>';
      }

      if (c.emails && c.emails.length > 0) {
        bodyHtml += '<div><span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#9ca3af; display:block; margin-bottom:6px;">Correos Electronicos</span>';
        bodyHtml += '<div style="display:flex; flex-direction:column; gap:6px;">' +
          c.emails.map(e => '<a href="mailto:' + e.email + '" style="background:#111827; border:1px solid #1f2937; border-radius:8px; padding:8px 12px; color:#38bdf8; font-size:0.82rem; text-decoration:none;">' + e.email + '</a>').join('') +
        '</div></div>';
      }

      if (c.notes) {
        bodyHtml += '<div><span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#9ca3af; display:block; margin-bottom:4px;">Notas</span>' +
          '<div style="background:#111827; border:1px solid #1f2937; border-radius:8px; padding:10px 12px; font-size:0.8rem; color:#d1d5db;">' + c.notes + '</div>' +
        '</div>';
      }

      bodyHtml += '<div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
        '<span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#9ca3af;">Historial de Llamadas</span>' +
        '<span style="font-size:0.75rem; font-weight:700; color:#38bdf8;">' + (c.callLogs ? c.callLogs.length : 0) + ' registros</span>' +
      '</div>';

      if (c.callLogs && c.callLogs.length > 0) {
        bodyHtml += '<div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto;">' +
          c.callLogs.map(l => {
            const isInc = l.type === 'incoming';
            const isOut = l.type === 'outgoing';
            const typeLabel = isInc ? 'Entrante' : (isOut ? 'Saliente' : 'Perdida');
            const typeColor = isInc ? '#34d399' : (isOut ? '#38bdf8' : '#f87171');
            return '<div class="call-log-item">' +
              '<div>' +
                '<span style="color:' + typeColor + '; font-size:0.75rem; font-weight:800; display:block;">' + typeLabel + '</span>' +
                '<span style="font-size:0.72rem; color:#9ca3af;">' + (l.dateFormatted || '') + '</span>' +
              '</div>' +
              '<span style="font-size:0.78rem; font-weight:700; color:#e5e7eb;">' + (l.durationFormatted || '0s') + '</span>' +
            '</div>';
          }).join('') +
        '</div>';
      } else {
        bodyHtml += '<p style="color:#6b7280; font-size:0.8rem; font-style:italic; padding:10px 0;">No hay llamadas registradas con este contacto.</p>';
      }
      bodyHtml += '</div>';

      bodyEl.innerHTML = bodyHtml;
      modal.classList.add('active');
      modal.style.display = 'flex';
    }

    function closeContactPopup() {
      const modal = document.getElementById('contactPopupModal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
    }

    let cachedNlpAppsData = null;
    let currentNlpApp = null;
    let cachedNlpRecordsMap = {};
    let activeNlpSearchQuery = '';
    let currentNlpHighlightTerm = '';

    function escapeHtmlSimple(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function escapeRegExp(str) {
      if (!str) return '';
      var specials = ['-', '[', ']', '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\\\', '^', '$', '|'];
      var res = '';
      for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if (specials.indexOf(ch) !== -1) {
          res += '\\\\' + ch;
        } else {
          res += ch;
        }
      }
      return res;
    }

    function highlightNlpText(escapedText, term) {
      if (!term || !escapedText) return escapedText;
      const cleanTerm = escapeHtmlSimple(term.trim());
      if (!cleanTerm) return escapedText;
      try {
        const regex = new RegExp('(' + escapeRegExp(cleanTerm) + ')', 'gi');
        return escapedText.replace(regex, '<mark class="nlp-highlight">$1</mark>');
      } catch (e) {
        return escapedText;
      }
    }

    function renderNlpTab(container) {
      if (currentNlpApp) {
        renderNlpRecordsView(container, currentNlpApp, currentNlpHighlightTerm);
        return;
      }

      if (activeNlpSearchQuery) {
        searchNlpGlobal(activeNlpSearchQuery);
        return;
      }

      if (cachedNlpAppsData) {
        paintNlpAppsTab(container, cachedNlpAppsData, '');
        return;
      }

      container.innerHTML = '<div style="padding:40px 20px; text-align:center;">' +
        '<div class="video-spinner" style="display:block; margin:0 auto 16px auto;"></div>' +
        '<p style="color:#9ca3af; font-size:0.88rem;">Cargando catalogo de aplicaciones NLP...</p>' +
      '</div>';

      fetch('/api/ver/nlp/apps')
        .then(res => res.json())
        .then(data => {
          if (!data || !data.success) {
            container.innerHTML = '<div style="padding:30px; text-align:center; color:#ef4444;">' +
              '<p style="font-size:0.9rem;">No se pudieron cargar las aplicaciones.</p>' +
              '<button type="button" onclick="cachedNlpAppsData=null; renderNlpTab(document.getElementById(\\'mainContent\\'))" class="btn" style="margin-top:12px; font-size:0.8rem; padding:6px 14px;">Reintentar</button>' +
            '</div>';
            return;
          }
          cachedNlpAppsData = data;
          paintNlpAppsTab(container, data, '');
        })
        .catch(err => {
          console.error('[NLP] Error fetch apps:', err);
          container.innerHTML = '<div style="padding:30px; text-align:center; color:#ef4444;">' +
            '<p style="font-size:0.9rem;">Error al conectar con el servidor.</p>' +
          '</div>';
        });
    }

    function updateNlpTopSearchPlaceholder() {
      const input = document.getElementById('nlpTopSearchInput');
      if (!input) return;
      if (currentNlpApp) {
        input.placeholder = 'Buscar texto en ' + currentNlpApp.displayName + '...';
      } else {
        input.placeholder = 'Buscar texto o aplicacion...';
      }
    }

    function executeNlpSearch() {
      const input = document.getElementById('nlpTopSearchInput');
      const q = input ? input.value.trim() : '';
      const clearBtn = document.getElementById('btnClearNlpSearch');
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

      if (currentNlpApp) {
        currentNlpHighlightTerm = q;
        handleNlpRecordSearch(q);
      } else {
        if (!q) {
          clearNlpTopSearch();
        } else {
          searchNlpGlobal(q);
        }
      }
    }

    function onNlpTopSearchInput(val) {
      const clearBtn = document.getElementById('btnClearNlpSearch');
      const q = (val || '').trim();
      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

      if (currentNlpApp) {
        currentNlpHighlightTerm = q;
        handleNlpRecordSearch(q);
      } else {
        if (!q && activeNlpSearchQuery) {
          clearNlpTopSearch();
        }
      }
    }

    function clearNlpTopSearch() {
      const input = document.getElementById('nlpTopSearchInput');
      if (input) input.value = '';
      const clearBtn = document.getElementById('btnClearNlpSearch');
      if (clearBtn) clearBtn.style.display = 'none';

      if (currentNlpApp) {
        currentNlpHighlightTerm = '';
        handleNlpRecordSearch('');
      } else {
        activeNlpSearchQuery = '';
        const container = document.getElementById('mainContent');
        if (cachedNlpAppsData && container) {
          paintNlpAppsTab(container, cachedNlpAppsData, '');
        } else if (container) {
          renderNlpTab(container);
        }
      }
    }

    function searchNlpGlobal(query) {
      activeNlpSearchQuery = query;
      const listDiv = document.getElementById('nlpAppsList');
      const badgeEl = document.getElementById('nlpCountBadge');
      if (badgeEl) badgeEl.textContent = 'Buscando coincidencias...';
      if (listDiv) {
        listDiv.innerHTML = '<div style="padding:36px 20px; text-align:center;">' +
          '<div class="video-spinner" style="display:block; margin:0 auto 12px auto;"></div>' +
          '<p style="color:#9ca3af; font-size:0.85rem;">Buscando coincidencias de "' + escapeHtmlSimple(query) + '" en todo el dataset...</p>' +
        '</div>';
      }

      fetch('/api/ver/nlp/apps?q=' + encodeURIComponent(query))
        .then(res => res.json())
        .then(data => {
          if (!data || !data.success) {
            if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem; padding:24px 0; text-align:center;">Error al buscar en el dataset.</p>';
            return;
          }
          const container = document.getElementById('mainContent');
          if (container) {
            paintNlpAppsTab(container, data, query);
          }
        })
        .catch(err => {
          console.error('[NLP] Error en busqueda global:', err);
          if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem; padding:24px 0; text-align:center;">Error de conexion con el servidor.</p>';
        });
    }

    function paintNlpAppsTab(container, data, query = '') {
      const apps = data.apps || [];
      const isSearch = Boolean(query && query.trim());
      let badgeText = '';

      if (isSearch) {
        badgeText = 'Aplicaciones con coincidencias: ' + apps.length + ' para "' + escapeHtmlSimple(query.trim()) + '"';
      } else {
        badgeText = 'Aplicaciones: ' + (data.totalApps || apps.length);
      }

      let html = '<div class="nlp-container">';
      html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
        '<span class="' + (isSearch ? 'nlp-badge-coincidencias' : 'nlp-count-badge') + '" id="nlpCountBadge">' + badgeText + '</span>' +
      '</div>';

      html += '<div id="nlpAppsList" style="display:flex; flex-direction:column; gap:12px;">';
      html += renderNlpAppCardsList(apps, query);
      html += '</div></div>';

      container.innerHTML = html;
      updateNlpTopSearchPlaceholder();
    }

    function renderNlpAppCardsList(appsList, query = '') {
      if (!appsList || appsList.length === 0) {
        if (query) {
          return '<p style="color:#6b7280; font-size:0.85rem; font-style:italic; padding:32px 0; text-align:center;">No se encontraron aplicaciones con textos que contengan "' + escapeHtmlSimple(query) + '".</p>';
        }
        return '<p style="color:#6b7280; font-size:0.85rem; font-style:italic; padding:24px 0; text-align:center;">No se encontraron aplicaciones coincidentes.</p>';
      }

      const cleanQuery = (query || '').trim();

      return appsList.map(a => {
        const iconHtml = a.appIconSvg || SVG_ICONS.nlpDataset;
        const safePkg = encodeURIComponent(a.packageName || 'unknown');
        const safeName = encodeURIComponent(a.displayName || 'Aplicacion');
        const safeQuery = encodeURIComponent(cleanQuery);

        let badgeHtml = '';
        if (cleanQuery && (a.matchCount !== undefined && a.matchCount > 0)) {
          const matchLabel = a.matchCount === 1 ? '1 coincidencia' : (a.matchCount + ' coincidencias');
          badgeHtml = '<span class="nlp-badge-coincidencias">' + matchLabel + '</span>';
        } else {
          badgeHtml = '<span class="nlp-badge-escritos">' + (a.count || 0) + ' escritos</span>';
        }

        return '<div class="nlp-app-card" onclick="openNlpAppRecords(\\'' + safePkg + '\\', \\'' + safeName + '\\', \\'' + safeQuery + '\\')">' +
          '<div class="nlp-card-header">' +
            '<div class="nlp-app-title-box">' +
              '<span class="nlp-app-icon">' + iconHtml + '</span>' +
              '<span class="nlp-app-name">' + a.displayName + '</span>' +
            '</div>' +
            badgeHtml +
          '</div>' +
          '<div class="nlp-card-meta">' +
            '<span class="nlp-pkg-text">Paquete: ' + a.packageName + '</span>' +
            '<span class="nlp-activity-text">Ultima actividad: <strong>' + (a.lastActivityFormatted || 'Reciente') + '</strong></span>' +
          '</div>' +
          '<div class="nlp-card-footer">' +
            '<button type="button" class="nlp-btn-ver-registros">' +
              'Ver Registros &rarr;' +
            '</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function openNlpAppRecords(safePkg, safeName, safeSearchQuery = '') {
      const pkg = decodeURIComponent(safePkg);
      const name = decodeURIComponent(safeName);
      const query = safeSearchQuery ? decodeURIComponent(safeSearchQuery) : '';

      const app = (cachedNlpAppsData && cachedNlpAppsData.apps)
        ? (cachedNlpAppsData.apps.find(a => a.packageName === pkg) || { packageName: pkg, displayName: name, count: 0 })
        : { packageName: pkg, displayName: name, count: 0 };

      currentNlpApp = app;
      currentNlpHighlightTerm = query;

      const topInput = document.getElementById('nlpTopSearchInput');
      if (topInput) {
        topInput.value = query;
      }
      const clearBtn = document.getElementById('btnClearNlpSearch');
      if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

      const container = document.getElementById('mainContent');
      if (container) renderNlpRecordsView(container, app, query);
    }

    function backToNlpApps() {
      currentNlpApp = null;
      currentNlpHighlightTerm = '';

      const topInput = document.getElementById('nlpTopSearchInput');
      if (topInput) topInput.value = activeNlpSearchQuery || '';
      const clearBtn = document.getElementById('btnClearNlpSearch');
      if (clearBtn) clearBtn.style.display = activeNlpSearchQuery ? 'block' : 'none';

      updateNlpTopSearchPlaceholder();

      const container = document.getElementById('mainContent');
      if (container) {
        if (activeNlpSearchQuery) {
          searchNlpGlobal(activeNlpSearchQuery);
        } else if (cachedNlpAppsData) {
          paintNlpAppsTab(container, cachedNlpAppsData, '');
        } else {
          renderNlpTab(container);
        }
      }
    }

    function renderNlpRecordsView(container, app, highlightQuery = '') {
      const pkg = app.packageName;
      const iconHtml = app.appIconSvg || SVG_ICONS.nlpDataset;

      let html = '<div class="nlp-container">';
      html += '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<button type="button" onclick="backToNlpApps()" style="background:#1e293b; border:1px solid #374151; color:#38bdf8; font-size:0.8rem; font-weight:700; border-radius:8px; padding:6px 12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">&larr; Volver a Aplicaciones</button>' +
        '<span class="nlp-badge-escritos" id="recordCountBadge">' + (app.count || 0) + ' escritos</span>' +
      '</div>';

      html += '<div style="display:flex; align-items:center; gap:12px; background:#0e1626; border:1px solid #1e293b; border-radius:12px; padding:12px 14px;">' +
        '<span class="nlp-app-icon" style="width:36px; height:36px;">' + iconHtml + '</span>' +
        '<div style="min-width:0; flex:1;">' +
          '<h3 style="font-size:1.05rem; font-weight:800; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + app.displayName + '</h3>' +
          '<span style="font-family:monospace; font-size:0.75rem; color:#64748b; word-break:break-all;">' + app.packageName + '</span>' +
        '</div>' +
      '</div>';

      html += '<div id="nlpRecordsItems" style="display:flex; flex-direction:column; gap:10px;">' +
        '<div style="padding:30px 20px; text-align:center;">' +
          '<div class="video-spinner" style="display:block; margin:0 auto 12px auto;"></div>' +
          '<p style="color:#9ca3af; font-size:0.85rem;">Cargando registros de texto...</p>' +
        '</div>' +
      '</div></div>';

      container.innerHTML = html;
      updateNlpTopSearchPlaceholder();

      if (cachedNlpRecordsMap[pkg]) {
        paintNlpRecordItems(cachedNlpRecordsMap[pkg], highlightQuery);
        return;
      }

      fetch('/api/ver/nlp/records?appPackage=' + encodeURIComponent(pkg) + '&limit=150')
        .then(res => res.json())
        .then(data => {
          if (!data || !data.success) {
            const listDiv = document.getElementById('nlpRecordsItems');
            if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem; padding:20px; text-align:center;">No se pudieron cargar los registros.</p>';
            return;
          }
          cachedNlpRecordsMap[pkg] = data.records || [];
          paintNlpRecordItems(cachedNlpRecordsMap[pkg], highlightQuery);
          const badgeEl = document.getElementById('recordCountBadge');
          if (badgeEl) badgeEl.textContent = (data.total || (data.records || []).length) + ' escritos';
        })
        .catch(err => {
          console.error('[NLP] Error fetch records:', err);
          const listDiv = document.getElementById('nlpRecordsItems');
          if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem; padding:20px; text-align:center;">Error al conectar con el servidor.</p>';
        });
    }

    function paintNlpRecordItems(recordsList, highlightQuery = '') {
      const listDiv = document.getElementById('nlpRecordsItems');
      if (!listDiv) return;

      if (!recordsList || recordsList.length === 0) {
        listDiv.innerHTML = '<p style="color:#6b7280; font-size:0.85rem; font-style:italic; padding:24px 0; text-align:center;">No se encontraron registros de texto.</p>';
        return;
      }

      const qClean = (highlightQuery || '').trim().toLowerCase();
      let hasMarkedFirst = false;

      listDiv.innerHTML = recordsList.map(r => {
        let escaped = escapeHtmlSimple(r.text);
        const dateStr = r.formattedDate || '—';
        const fieldStr = r.fieldInfo ? (' &bull; ' + escapeHtmlSimple(r.fieldInfo)) : '';
        const isMatch = Boolean(qClean && (r.text || '').toLowerCase().includes(qClean));

        let cardClass = 'nlp-record-item';
        let cardIdAttr = '';

        if (isMatch) {
          cardClass += ' nlp-matched-record';
          escaped = highlightNlpText(escaped, qClean);
          if (!hasMarkedFirst) {
            cardIdAttr = ' id="firstNlpMatch"';
            hasMarkedFirst = true;
          }
        }

        return '<div class="' + cardClass + '"' + cardIdAttr + '>' +
          '<div class="nlp-record-header">' +
            '<span>' + dateStr + fieldStr + '</span>' +
            '<button type="button" onclick="copyNlpText(this)" data-text="' + encodeURIComponent(r.text || '') + '" style="background:transparent; border:none; color:#38bdf8; font-size:0.75rem; font-weight:700; cursor:pointer;">Copiar</button>' +
          '</div>' +
          '<div class="nlp-record-text-box">' + escaped + '</div>' +
        '</div>';
      }).join('');

      if (hasMarkedFirst) {
        setTimeout(() => {
          const firstEl = document.getElementById('firstNlpMatch');
          if (firstEl) {
            firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 180);
      }
    }

    function handleNlpRecordSearch(query) {
      if (!currentNlpApp) return;
      const pkg = currentNlpApp.packageName;
      const allRecords = cachedNlpRecordsMap[pkg] || [];
      const q = (query || '').trim().toLowerCase();
      const badgeEl = document.getElementById('recordCountBadge');

      if (!q) {
        if (badgeEl) badgeEl.textContent = (currentNlpApp.count || allRecords.length) + ' escritos';
        paintNlpRecordItems(allRecords, '');
        return;
      }

      const filtered = allRecords.filter(r => (r.text || '').toLowerCase().includes(q));
      if (badgeEl) badgeEl.textContent = filtered.length + ' encontrados';
      paintNlpRecordItems(filtered, q);
    }

    function copyNlpText(btn) {
      const raw = btn.getAttribute('data-text');
      const text = decodeURIComponent(raw || '');
      if (!text) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showAppToast('Texto copiado al portapapeles');
        }).catch(() => {
          showAppToast('No se pudo copiar');
        });
      } else {
        showAppToast('Copiado');
      }
    }

    function handleTopSearchInput() {
      if (topSearchDebounce) clearTimeout(topSearchDebounce);
      topSearchDebounce = setTimeout(executeTopSearch, 300);
    }

    function executeTopSearch() {
      const tagVal = document.getElementById('topSearchTag') ? document.getElementById('topSearchTag').value.trim() : '';
      const dateVal = document.getElementById('topSearchDate') ? document.getElementById('topSearchDate').value : '';
      const clearBtn = document.getElementById('btnClearTopSearch');

      if (!tagVal && !dateVal) {
        if (clearBtn) clearBtn.style.display = 'none';
        if (isSearchActive) {
          isSearchActive = false;
          if (currentMainTab === 'feed') {
            const container = document.getElementById('mainContent');
            if (container) {
              container.innerHTML = '<div id="feedList"></div>';
              loadedMediaIds.clear();
              hasMoreContent = true;
              setupIntersectionObserver();
              setupVideoAutoplayObserver();
              fetchNextFeedBlock();
            }
          } else if (currentMainTab === 'favorites') {
            renderFavoritesTab(document.getElementById('mainContent'));
          }
        }
        return;
      }

      if (clearBtn) clearBtn.style.display = 'flex';
      isSearchActive = true;

      if (currentlyPlayingVideo) {
        currentlyPlayingVideo.pause();
        currentlyPlayingVideo = null;
      }

      if (typeof closeMediaPopup === 'function') closeMediaPopup();
      if (typeof closeTagModal === 'function') closeTagModal();
      if (typeof closeContactPopup === 'function') closeContactPopup();

      const container = document.getElementById('mainContent');
      if (!container) return;

      if (currentMainTab === 'favorites') {
        // Filtrar favoritos en la pantalla activa
        const favList = document.getElementById('favList');
        if (!favList) return;
        let count = 0;
        favoritesCache.forEach((item, mId) => {
          const rowEl = document.getElementById('favRow_' + mId);
          if (!rowEl) return;
          let match = true;
          if (tagVal) {
            const cleanTag = tagVal.toLowerCase().replace(/^#/, '');
            const tags = (item.tags || []).map(t => String(t).toLowerCase());
            const hasTag = tags.some(t => t.includes(cleanTag));
            const hasName = String(item.name || '').toLowerCase().includes(cleanTag);
            const hasSource = String(item.appSource || '').toLowerCase().includes(cleanTag);
            if (!hasTag && !hasName && !hasSource) match = false;
          }
          if (dateVal && match) {
            const d = new Date(item.lastModified || 0);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const localDateStr = year + '-' + month + '-' + day;
            if (localDateStr !== dateVal) match = false;
          }
          if (match) {
            rowEl.style.display = 'flex';
            count++;
          } else {
            rowEl.style.display = 'none';
          }
        });

        let noResEl = document.getElementById('favSearchNoResults');
        if (count === 0) {
          if (!noResEl) {
            favList.insertAdjacentHTML('beforeend', '<div id="favSearchNoResults" style="padding:40px 16px; text-align:center; color:#9ca3af; font-size:0.85rem;">No se encontraron favoritos con los filtros seleccionados.<br><button type="button" onclick="clearTopSearch()" style="margin-top:10px; background:#1e293b; border:1px solid #374151; color:#38bdf8; padding:6px 14px; border-radius:999px; cursor:pointer;">Limpiar busqueda</button></div>');
          }
        } else if (noResEl) {
          noResEl.remove();
        }
      } else {
        // Feed principal: consultar /api/ver/search
        container.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; color:#9ca3af; font-size:0.9rem;">Buscando contenidos...</div>';

        const url = '/api/ver/search?tag=' + encodeURIComponent(tagVal) + '&date=' + encodeURIComponent(dateVal);
        fetch(url)
          .then(res => res.json())
          .then(data => {
            if (!data.success || !Array.isArray(data.items) || data.items.length === 0) {
              container.innerHTML = '<div style="padding:40px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1;">' +
                '<div style="font-size:2.5rem; color:#6b7280; margin-bottom:12px; display:flex; justify-content:center;">' + SVG_ICONS.tag + '</div>' +
                '<h3 style="font-size:1.05rem; font-weight:700; color:#f3f4f6; margin-bottom:6px;">Sin resultados de busqueda</h3>' +
                '<p style="font-size:0.85rem; color:#9ca3af; max-width:280px; line-height:1.4; margin-bottom:14px;">No se encontraron contenidos que coincidan con la etiqueta o fecha indicada.</p>' +
                '<button type="button" onclick="clearTopSearch()" style="background:#1e293b; border:1px solid #374151; color:#38bdf8; font-size:0.85rem; font-weight:600; padding:8px 18px; border-radius:999px; cursor:pointer;">Restablecer Feed</button>' +
              '</div>';
              return;
            }

            data.items.forEach(item => {
              favoritesCache.set(item.mediaId, item);
            });
            const cardsHtml = data.items.map(item => renderMediaRowCardHtml(item)).join('');
            container.innerHTML = '<div id="searchResultsList">' +
              '<div class="search-results-header">' +
                '<span style="font-size:0.82rem; color:#9ca3af; font-weight:600;">Resultados encontrados (' + data.items.length + ')</span>' +
                '<button type="button" onclick="clearTopSearch()" style="background:transparent; border:none; color:#38bdf8; font-size:0.78rem; font-weight:600; cursor:pointer;">Limpiar busqueda</button>' +
              '</div>' +
              cardsHtml +
            '</div>';
          })
          .catch(() => {
            container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#ef4444; font-size:0.85rem;">Error al buscar contenidos.</div>';
          });
      }
    }

    function openCalendarPicker() {
      const input = document.getElementById('topSearchDate');
      if (!input) return;
      if (typeof input.showPicker === 'function') {
        try {
          input.showPicker();
        } catch (e) {
          input.focus();
          input.click();
        }
      } else {
        input.focus();
        input.click();
      }
    }

    function onDateSelected(val) {
      if (!val) {
        clearSelectedDate();
        return;
      }
      const container = document.getElementById('activeDateBadgeContainer');
      if (container) {
        const parts = val.split('-');
        const formatted = parts.length === 3 ? (parts[2] + '/' + parts[1]) : val;
        container.innerHTML = '<span class="active-date-badge">' + SVG_ICONS.calendar + ' ' + formatted + ' <span class="badge-remove" onclick="event.stopPropagation(); clearSelectedDate()">&times;</span></span>';
        container.style.display = 'flex';
      }
      const clearBtn = document.getElementById('btnClearTopSearch');
      if (clearBtn) clearBtn.style.display = 'flex';
      executeTopSearch();
    }

    function clearSelectedDate() {
      const input = document.getElementById('topSearchDate');
      if (input) input.value = '';
      const container = document.getElementById('activeDateBadgeContainer');
      if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
      }
      executeTopSearch();
    }

    function clearTopSearch() {
      const tagInput = document.getElementById('topSearchTag');
      const dateInput = document.getElementById('topSearchDate');
      const clearBtn = document.getElementById('btnClearTopSearch');
      const dateBadge = document.getElementById('activeDateBadgeContainer');
      if (tagInput) tagInput.value = '';
      if (dateInput) dateInput.value = '';
      if (dateBadge) {
        dateBadge.innerHTML = '';
        dateBadge.style.display = 'none';
      }
      if (clearBtn) clearBtn.style.display = 'none';

      isSearchActive = false;
      if (currentMainTab === 'feed') {
        const container = document.getElementById('mainContent');
        if (container) {
          container.innerHTML = '<div id="feedList"></div>';
          loadedMediaIds.clear();
          hasMoreContent = true;
          setupIntersectionObserver();
          setupVideoAutoplayObserver();
          fetchNextFeedBlock();
        }
      } else if (currentMainTab === 'favorites') {
        renderFavoritesTab(document.getElementById('mainContent'));
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
      search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
      calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
      comment: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
      download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
      whatsapp: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>',
      contacts: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      nlpDataset: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="6" y1="8" x2="6.01" y2="8"></line><line x1="10" y1="8" x2="10.01" y2="8"></line><line x1="14" y1="8" x2="14.01" y2="8"></line><line x1="18" y1="8" x2="18.01" y2="8"></line><line x1="6" y1="12" x2="6.01" y2="12"></line><line x1="10" y1="12" x2="10.01" y2="12"></line><line x1="14" y1="12" x2="14.01" y2="12"></line><line x1="18" y1="12" x2="18.01" y2="12"></line><line x1="8" y1="16" x2="16" y2="16"></line></svg>'
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
      const tagInput = document.getElementById('tagInput');
      const notesInput = document.getElementById('notesInput');

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

    function renderMediaRowCardHtml(item) {
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

      const isFav = Boolean(item.isFavorite);
      const starIcon = isFav ? SVG_ICONS.starFilled : SVG_ICONS.starOutline;
      const starClass = isFav ? 'favorited' : '';
      const starTitle = isFav ? 'Quitar de favoritos' : 'Agregar a favoritos';

      return '<div class="fav-row-card media-row-card" id="favRow_' + item.mediaId + '" onclick="openMediaPopup(\\'' + item.mediaId + '\\')">' +
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
        '<button type="button" class="fav-star-btn ' + starClass + '" id="favStar_' + item.mediaId + '" onclick="event.stopPropagation(); toggleFav(\\'' + item.mediaId + '\\', \\'' + encodeURIComponent(item.name) + '\\', \\'' + item.type + '\\')" title="' + starTitle + '">' +
          starIcon +
        '</button>' +
      '</div>';
    }

    function renderFavRowCardHtml(item) {
      return renderMediaRowCardHtml(item);
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
      container.innerHTML = '<div class="explore-tags-container"><div id="tagsList">Cargando catalogo de etiquetas...</div><div id="tagResults" style="margin-top:18px;"></div></div>';

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
            keys.map(k => '<button type="button" class="tag-chip-btn" id="tagBtn_' + k + '" onclick="filterByTag(\\'' + k + '\\')" style="background:#1e293b; border:1px solid #374151; color:#38bdf8; font-size:0.82rem; font-weight:600; padding:6px 12px; border-radius:999px; cursor:pointer;">#' + k + ' (' + tags[k] + ')</button>').join('') +
          '</div>';
        })
        .catch(err => {
          console.error('[TAGS] Error al cargar etiquetas:', err);
          const listDiv = document.getElementById('tagsList');
          if (listDiv) listDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem;">Error al cargar etiquetas.</p>';
        });
    }

    function filterByTag(tag) {
      const resultsDiv = document.getElementById('tagResults');
      if (!resultsDiv) return;

      document.querySelectorAll('.tag-chip-btn').forEach(btn => {
        btn.style.background = '#1e293b';
        btn.style.borderColor = '#374151';
        btn.style.color = '#38bdf8';
      });
      const activeBtn = document.getElementById('tagBtn_' + tag);
      if (activeBtn) {
        activeBtn.style.background = 'rgba(56, 189, 248, 0.2)';
        activeBtn.style.borderColor = '#38bdf8';
        activeBtn.style.color = '#ffffff';
      }

      resultsDiv.innerHTML = '<div style="padding:16px 0; text-align:center;"><div class="video-spinner" style="display:block; margin:0 auto 10px auto;"></div><p style="color:#9ca3af; font-size:0.85rem;">Buscando contenidos con #' + tag + '...</p></div>';

      fetch('/api/ver/tags?tag=' + encodeURIComponent(tag))
        .then(res => res.json())
        .then(data => {
          if (!data.success || !Array.isArray(data.items) || data.items.length === 0) {
            resultsDiv.innerHTML = '<p style="color:#9ca3af; font-size:0.85rem; padding:16px 0; text-align:center;">No se encontraron contenidos con la etiqueta #' + tag + '</p>';
            return;
          }

          data.items.forEach(it => {
            favoritesCache.set(it.mediaId, it);
          });

          const rowsHtml = data.items.map(item => renderMediaRowCardHtml(item)).join('');
          resultsDiv.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
            '<h3 style="font-size:0.95rem; font-weight:700; color:#38bdf8;">Resultados para #' + tag + ' (' + data.items.length + ')</h3>' +
            '<button type="button" onclick="document.getElementById(\\'tagResults\\').innerHTML=\\'\\'" style="background:transparent; border:none; color:#9ca3af; font-size:0.8rem; cursor:pointer;">Limpiar</button>' +
          '</div>' +
          '<div id="tagResultsList" style="display:flex; flex-direction:column; gap:8px;">' + rowsHtml + '</div>';
        })
        .catch(err => {
          console.error('[TAG_FILTER] Error al filtrar por etiqueta:', err);
          resultsDiv.innerHTML = '<p style="color:#ef4444; font-size:0.85rem; padding:16px 0; text-align:center;">Error al filtrar por etiqueta.</p>';
        });
    }
  `;
}

module.exports = {
  getVerClientScript
};
