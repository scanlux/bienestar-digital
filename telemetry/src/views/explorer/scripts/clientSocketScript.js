/**
 * Script de cliente para eventos en tiempo real (Socket.io) y previsualización multimedia
 */
function getClientSocketScript({ deviceId }) {
  return `
    ${deviceId ? `
      if (typeof io !== 'undefined') {
        try {
          const syncSocket = io('/device-sync', {
            auth: { deviceId: '${deviceId}', isWeb: true },
            query: { deviceId: '${deviceId}', isWeb: true }
          });

          syncSocket.on('connect', function() {
            console.log('[REALTIME_SYNC] Conectado a sala web del dispositivo: ${deviceId}');
          });

          syncSocket.on('device:presence', function(data) {
            console.log('[REALTIME_SYNC] Evento device:presence recibido:', data);
            const btn = document.getElementById('presenceLogoutBtn');
            const txt = document.getElementById('presenceStatusText');
            const kpiVal = document.getElementById('deviceStatusKpiValue');
            const kpiText = document.getElementById('deviceStatusText');
            const kpiDot = document.getElementById('deviceStatusDot');

            if (btn && txt) {
              if (data && data.online) {
                btn.className = 'btn-status-logout online';
                txt.textContent = 'Online';
              } else {
                btn.className = 'btn-status-logout offline';
                txt.textContent = 'Offline';
              }
            }

            if (kpiVal && kpiText && kpiDot) {
              if (data && data.online) {
                kpiVal.style.color = '#34d399';
                kpiText.textContent = 'En línea (Socket Activo)';
                kpiDot.style.background = '#10b981';
                kpiDot.style.boxShadow = '0 0 8px #10b981';
              } else {
                kpiVal.style.color = '#9ca3af';
                kpiText.textContent = 'Desconectado';
                kpiDot.style.background = '#6b7280';
                kpiDot.style.boxShadow = 'none';
              }
            }
          });

          syncSocket.on('file:uploaded', function(data) {
            console.log('[REALTIME_SYNC] Evento file:uploaded recibido:', data);
            if (!data || !data.path) return;

            const normPath = data.path.replace(/\\\\/g, '/');
            const fileElements = document.querySelectorAll('tr[data-file-path], .mobile-file-card[data-file-path]');

            fileElements.forEach(function(el) {
              const rowPath = el.getAttribute('data-file-path');
              const rowName = el.getAttribute('data-file-name');

              if (rowPath === normPath || rowPath === data.path || rowName === data.filename) {
                const cbCell = el.querySelector('.cb-cell');
                const nameCell = el.querySelector('.name-cell');
                const statusCell = el.querySelector('.status-cell');
                const actionCell = el.querySelector('.action-cell');
                const fileContentUrl = '/api/telemetry/file-content?deviceId=' + encodeURIComponent('${deviceId}') + '&path=' + encodeURIComponent(rowPath || data.path);
                const fileName = rowName || data.filename || '';

                if (cbCell) {
                  const cbInput = cbCell.querySelector('input[type="checkbox"]');
                  if (cbInput) cbInput.remove();
                }

                const isAudio = Boolean(fileName && (/\\.(opus|ogg|mp3|wav|m4a|aac|flac)$/i).test(fileName));
                const isImage = Boolean(fileName && (/\\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i).test(fileName));
                const isVideo = Boolean(fileName && (/\\.(mp4|webm|mkv|mov|avi|3gp)$/i).test(fileName));
                const fileIcon = isAudio ? '🎵' : isImage ? '🖼️' : isVideo ? '🎬' : '📄';
                const fileType = isAudio ? 'audio' : isImage ? 'image' : isVideo ? 'video' : 'other';

                if (nameCell) {
                  nameCell.innerHTML = '<a href="#" onclick="openMediaPreview(this); return false;" data-url="' + fileContentUrl + '" data-title="' + encodeURIComponent(fileName) + '" data-type="' + fileType + '" style="color:#38bdf8; text-decoration:none; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:8px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><span style="flex-shrink:0;">' + fileIcon + '</span> <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + fileName + '</span></a>';
                }

                if (statusCell) {
                  statusCell.innerHTML = '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border-color:rgba(16,185,129,0.4); font-weight:700;">✓ Sincronizado</span>';
                }

                if (actionCell) {
                  const isMobileCard = el.classList.contains('mobile-file-card');
                  const btnStyle = isMobileCard 
                    ? 'background:#059669; font-size:0.8rem; padding:8px 14px; width:100%; text-decoration:none; display:inline-flex; justify-content:center; align-items:center;'
                    : 'background:#059669; font-size:0.78rem; padding:6px 12px; width:160px; min-width:160px; max-width:160px; white-space:nowrap; text-decoration:none; display:inline-flex; justify-content:center; align-items:center;';
                  actionCell.innerHTML = '<a href="' + fileContentUrl + '" download="' + fileName + '" target="_blank" class="btn" style="' + btnStyle + '">⬇ Descargar a PC</a>';
                }
              }
            });

            // Actualizar KPIs de la barra de progreso en vivo
            const kpiDown = document.getElementById('kpiDownloadedFiles');
            const kpiPend = document.getElementById('kpiPendingFiles');
            const kpiTot = document.getElementById('kpiTotalFiles');
            const kpiPctSpan = document.getElementById('kpiProgressPct');
            const kpiBarDiv = document.getElementById('kpiProgressBar');
            if (kpiDown && kpiTot) {
              const currentDown = parseInt(kpiDown.textContent || '0', 10) + 1;
              kpiDown.textContent = currentDown;
              if (kpiPend) {
                const currentPend = Math.max(0, parseInt(kpiPend.textContent || '0', 10) - 1);
                kpiPend.textContent = currentPend;
              }
              const totalVal = parseInt(kpiTot.textContent || '1', 10);
              const newPct = Math.min(100, Math.round((currentDown / totalVal) * 100));
              if (kpiPctSpan) kpiPctSpan.textContent = newPct + '% completado';
              if (kpiBarDiv) kpiBarDiv.style.width = newPct + '%';
            }
          });

          syncSocket.on('sync:transfer_status', function(data) {
            console.log('[REALTIME_SYNC] Evento sync:transfer_status recibido:', data);
            const icon = document.getElementById('activeTransferIcon');
            const name = document.getElementById('activeTransferName');
            const size = document.getElementById('activeTransferSize');
            const badge = document.getElementById('activeTransferBadge');
            const errBanner = document.getElementById('transferErrorBanner');

            if (!data) return;

            if (data.status === 'uploading') {
              if (icon) icon.textContent = '⏳';
              if (name) {
                name.textContent = data.filename || data.path || 'Archivo en proceso...';
                name.title = data.path || '';
                name.style.color = '#38bdf8';
              }
              if (size) {
                const s = Number(data.sizeBytes);
                if (s && s > 0) {
                  size.textContent = s >= 1024*1024 ? (s/(1024*1024)).toFixed(2) + ' MB' : (s/1024).toFixed(1) + ' KB';
                }
              }
              if (badge) {
                badge.textContent = 'Subiendo';
                badge.style.background = 'rgba(56,189,248,0.15)';
                badge.style.color = '#38bdf8';
                badge.style.borderColor = 'rgba(56,189,248,0.3)';
              }
            } else if (data.status === 'completed') {
              if (icon) icon.textContent = '✓';
              if (name) {
                name.textContent = 'Último completado: ' + (data.filename || data.path || '');
                name.style.color = '#34d399';
              }
              if (badge) {
                badge.textContent = 'Completado';
                badge.style.background = 'rgba(16,185,129,0.15)';
                badge.style.color = '#10b981';
                badge.style.borderColor = 'rgba(16,185,129,0.3)';
              }
            }
          });

          syncSocket.on('sync:transfer_error', function(data) {
            console.warn('[REALTIME_SYNC] Error de transferencia recibido:', data);
            const errBanner = document.getElementById('transferErrorBanner');
            const errText = document.getElementById('transferErrorText');
            const badge = document.getElementById('activeTransferBadge');
            const icon = document.getElementById('activeTransferIcon');

            if (errBanner && errText) {
              const msg = data && (data.message || data.error) ? (data.message || data.error) : 'Fallo en la transferencia remota';
              const file = data && data.filename ? ' (' + data.filename + ')' : '';
              errText.textContent = msg + file;
              errBanner.style.display = 'flex';
            }
            if (badge) {
              badge.textContent = 'Fallo';
              badge.style.background = 'rgba(239,68,68,0.15)';
              badge.style.color = '#f87171';
              badge.style.borderColor = 'rgba(239,68,68,0.3)';
            }
            if (icon) icon.textContent = '⚠️';
          });

          syncSocket.on('sync:status_scanning', function(data) {
            console.log('[REALTIME_SYNC] Evento sync:status_scanning recibido:', data);
            const banner = document.getElementById('scanStatusBanner');
            const title = document.getElementById('scanStatusTitle');
            const desc = document.getElementById('scanStatusDesc');
            const btn = document.getElementById('scanStatusBtn');

            if (title && desc) {
              title.innerHTML = '⏳ El teléfono está indexando y procesando los archivos (file_index.json)...';
              title.style.color = '#fbbf24';
              desc.textContent = (data && data.message) ? data.message : 'La aplicación móvil está escaneando el almacenamiento interno y transmitiendo la estructura completa al servidor...';
              if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ Escaneando en progreso...';
                btn.className = 'btn btn-secondary';
              }
            }
          });

          syncSocket.on('sync:index_updated', function(data) {
            console.log('[REALTIME_SYNC] Evento sync:index_updated recibido:', data);
            const title = document.getElementById('scanStatusTitle');
            if (title) {
              title.innerHTML = '✓ ¡Estructura de archivos cargada correctamente!';
              title.style.color = '#34d399';
            }
            setTimeout(function() {
              window.location.reload();
            }, 600);
          });
        } catch (e) {
          console.error('[REALTIME_SYNC_ERROR]', e);
        }
      }
    ` : ''}

    function openMediaPreview(btn) {
      const modal = document.getElementById('mediaPreviewModal');
      const modalTitle = document.getElementById('mediaPreviewTitle');
      const modalBody = document.getElementById('mediaPreviewBody');
      const url = btn.getAttribute('data-url');
      const title = decodeURIComponent(btn.getAttribute('data-title') || 'Archivo');
      const type = btn.getAttribute('data-type');

      if (modalTitle) modalTitle.textContent = (type === 'audio' ? '🎵 Audio: ' : type === 'image' ? '🖼️ Imagen: ' : type === 'video' ? '🎬 Video: ' : '📄 Archivo: ') + title;

      if (modalBody) {
        if (type === 'audio') {
          modalBody.innerHTML = '<div style="width:100%; padding:20px; display:flex; flex-direction:column; gap:16px; align-items:center;"><div style="font-size:3.5rem;">🎵</div><audio controls autoplay style="width:100%; border-radius:8px;" src="' + url + '"></audio></div>';
        } else if (type === 'image') {
          modalBody.innerHTML = '<div style="width:100%; text-align:center; padding:10px;"><img src="' + url + '" style="max-width:100%; max-height:60vh; object-fit:contain; border-radius:10px; border:1px solid #1f2937; box-shadow:0 10px 25px rgba(0,0,0,0.5);" alt="' + title + '" /></div>';
        } else if (type === 'video') {
          modalBody.innerHTML = '<div style="width:100%; text-align:center; padding:10px;"><video controls autoplay style="max-width:100%; max-height:60vh; object-fit:contain; border-radius:10px; border:1px solid #1f2937; box-shadow:0 10px 25px rgba(0,0,0,0.5);" src="' + url + '">Tu navegador no soporta reproducción de video HTML5.</video></div>';
        } else {
          modalBody.innerHTML = '<div style="padding:30px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px;"><div style="font-size:3.5rem;">📄</div><p style="color:#9ca3af;">Este archivo está disponible para descargar directamente a tu equipo.</p><a href="' + url + '" download="' + title + '" class="btn" style="background:#059669;">⬇ Descargar Archivo a PC</a></div>';
        }
      }

      if (modal) modal.classList.add('active');
    }

    function closeMediaPreview() {
      const modal = document.getElementById('mediaPreviewModal');
      const modalBody = document.getElementById('mediaPreviewBody');
      if (modalBody) {
        const audio = modalBody.querySelector('audio');
        const video = modalBody.querySelector('video');
        if (audio) audio.pause();
        if (video) video.pause();
        modalBody.innerHTML = '';
      }
      if (modal) modal.classList.remove('active');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMediaPreview();
        if (typeof closeSystemModal === 'function') closeSystemModal();
      }
    });
  `;
}

module.exports = {
  getClientSocketScript
};
