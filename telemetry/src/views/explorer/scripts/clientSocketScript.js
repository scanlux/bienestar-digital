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
            const kpiStandby = document.getElementById('kpiStandbyFiles');
            const kpiTot = document.getElementById('kpiTotalFiles');
            const kpiPctSpan = document.getElementById('kpiProgressPct');
            const kpiBarDiv = document.getElementById('kpiProgressBar');
            const kpiVolLabel = document.getElementById('kpiVolumeLabel');

            // Consultar datos reales de sincronizacion para evitar discrepancias
            if ('${deviceId}') {
              fetch('/api/telemetry/devices/' + encodeURIComponent('${deviceId}') + '/sync-stats')
                .then(r => r.json())
                .then(res => {
                  if (res && res.success && res.stats) {
                    const s = res.stats;
                    if (kpiDown) kpiDown.textContent = Math.min(s.totalFiles, s.downloadedFiles);
                    if (kpiPend) kpiPend.textContent = s.pendingFiles;
                    if (kpiStandby) kpiStandby.textContent = s.standbyFiles || 0;
                    if (kpiTot) kpiTot.textContent = s.totalFiles;

                    const activeRemaining = s.pendingFiles + (s.standbyFiles || 0);
                    let pct = 0;
                    if (s.totalFiles > 0) {
                      pct = Math.round((Math.min(s.totalFiles, s.downloadedFiles) / s.totalFiles) * 100);
                      if (activeRemaining > 0 && pct >= 100) {
                        pct = 99;
                      }
                    }
                    if (kpiPctSpan) kpiPctSpan.textContent = pct + '% completado';
                    if (kpiBarDiv) kpiBarDiv.style.width = pct + '%';
                    if (kpiVolLabel && s.totalBytes > 0) {
                      const fmtB = function(b) {
                        if (b >= 1024*1024*1024) return (b/(1024*1024*1024)).toFixed(2) + ' GB';
                        if (b >= 1024*1024) return (b/(1024*1024)).toFixed(1) + ' MB';
                        return (b/1024).toFixed(1) + ' KB';
                      };
                      kpiVolLabel.textContent = '(' + fmtB(s.downloadedBytes || 0) + ' / ' + fmtB(s.totalBytes) + ')';
                    }
                  }
                })
                .catch(() => {});
            }
          });

          function formatLaneBytes(b) {
            const s = Number(b);
            if (!s || s <= 0) return '';
            if (s >= 1024*1024*1024) return (s/(1024*1024*1024)).toFixed(2) + ' GB';
            if (s >= 1024*1024) return (s/(1024*1024)).toFixed(1) + ' MB';
            return (s/1024).toFixed(1) + ' KB';
          }

          function updateNetworkBadges(networkType, limitKBps) {
            const netBadge = document.getElementById('syncNetworkBadge');
            const bwBadge = document.getElementById('syncBandwidthBadge');
            if (netBadge) {
              if (networkType === 'wifi') {
                netBadge.textContent = 'WiFi (Doble Carril)';
                netBadge.style.background = 'rgba(16,185,129,0.15)';
                netBadge.style.color = '#34d399';
                netBadge.style.borderColor = 'rgba(16,185,129,0.35)';
              } else if (networkType === 'mobile') {
                netBadge.textContent = 'Datos Móviles (Solo ≤10MB)';
                netBadge.style.background = 'rgba(245,158,11,0.15)';
                netBadge.style.color = '#fbbf24';
                netBadge.style.borderColor = 'rgba(245,158,11,0.35)';
              } else {
                netBadge.textContent = 'Desconectado';
                netBadge.style.background = 'rgba(107,114,128,0.15)';
                netBadge.style.color = '#9ca3af';
                netBadge.style.borderColor = 'rgba(107,114,128,0.3)';
              }
            }
            if (bwBadge && limitKBps && Number(limitKBps) > 0) {
              bwBadge.textContent = 'Límite 40%: ~' + limitKBps + ' KB/s';
            }
          }

          function updateLaneCard(laneNum, laneData) {
            if (!laneData) return;
            const prefix = laneNum === 2 ? 'lane2' : 'lane1';
            const icon = document.getElementById(prefix + 'Icon');
            const name = document.getElementById(prefix + 'Name');
            const size = document.getElementById(prefix + 'Size');
            const badge = document.getElementById(prefix + 'Badge');
            const progWrap = document.getElementById(prefix + 'ProgressWrap');
            const progBar = document.getElementById(prefix + 'ProgressBar');

            const st = laneData.status || 'idle';
            const fname = laneData.filename || laneData.path || '';
            const totalChunks = Number(laneData.totalChunks || 0);
            const chunkIdx = Number(laneData.chunkIndex || 0);
            const pct = Number(laneData.progressPct || 0);

            if (size) size.textContent = formatLaneBytes(laneData.sizeBytes);

            if (st === 'uploading') {
              if (icon) icon.textContent = '⏳';
              if (name) {
                name.textContent = fname || 'Subiendo archivo...';
                name.title = laneData.path || fname;
                name.style.color = laneNum === 2 ? '#fb923c' : '#38bdf8';
              }
              if (badge) {
                badge.textContent = totalChunks > 1 ? ('Subiendo ' + chunkIdx + '/' + totalChunks + ' (' + pct + '%)') : 'Subiendo';
                badge.style.background = laneNum === 2 ? 'rgba(251,146,60,0.15)' : 'rgba(56,189,248,0.15)';
                badge.style.color = laneNum === 2 ? '#fb923c' : '#38bdf8';
                badge.style.borderColor = laneNum === 2 ? 'rgba(251,146,60,0.35)' : 'rgba(56,189,248,0.35)';
              }
              if (progWrap && progBar) {
                if (totalChunks > 1) {
                  progWrap.style.display = 'block';
                  progBar.style.width = Math.min(100, Math.max(2, pct)) + '%';
                } else {
                  progWrap.style.display = 'none';
                }
              }
            } else if (st === 'paused_wifi' || st === 'paused_mobile_limit') {
              if (icon) icon.textContent = '⏸';
              if (name) {
                name.textContent = fname ? ('Pausado: ' + fname) : 'Pausado esperando WiFi';
                name.style.color = '#fbbf24';
              }
              if (badge) {
                badge.textContent = st === 'paused_wifi' ? 'Pausado (Requiere WiFi)' : 'Pausado (>10MB en Datos)';
                badge.style.background = 'rgba(245,158,11,0.15)';
                badge.style.color = '#fbbf24';
                badge.style.borderColor = 'rgba(245,158,11,0.35)';
              }
              if (progWrap && progBar && totalChunks > 1) {
                progWrap.style.display = 'block';
                progBar.style.width = Math.min(100, pct) + '%';
              }
            } else if (st === 'completed') {
              if (icon) icon.textContent = '✓';
              if (name) {
                name.textContent = fname ? ('Último completado: ' + fname) : 'Completado';
                name.style.color = '#34d399';
              }
              if (badge) {
                badge.textContent = 'Completado';
                badge.style.background = 'rgba(16,185,129,0.15)';
                badge.style.color = '#10b981';
                badge.style.borderColor = 'rgba(16,185,129,0.3)';
              }
              if (progWrap) progWrap.style.display = 'none';
            } else {
              if (icon) icon.textContent = '💤';
              if (name) {
                name.textContent = laneNum === 2 ? 'En reposo (Solo activo por WiFi)' : 'En reposo (Esperando archivo)';
                name.style.color = '#6b7280';
              }
              if (badge) {
                badge.textContent = 'Inactivo';
                badge.style.background = 'rgba(107,114,128,0.15)';
                badge.style.color = '#9ca3af';
                badge.style.borderColor = 'rgba(107,114,128,0.3)';
              }
              if (progWrap) progWrap.style.display = 'none';
            }
          }

          syncSocket.on('device:sync_state', function(state) {
            if (!state) return;
            updateNetworkBadges(state.networkType, state.limitKBps);
            if (state.lane1) updateLaneCard(1, state.lane1);
            if (state.lane2) updateLaneCard(2, state.lane2);
          });

          syncSocket.on('sync:transfer_status', function(data) {
            if (!data) return;
            const laneNum = data.lane === 'large' ? 2 : 1;
            updateLaneCard(laneNum, data);
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
      const modalMeta = document.getElementById('mediaPreviewMeta');
      const downloadBtn = document.getElementById('mediaPreviewDownloadBtn');
      const url = btn.getAttribute('data-url');
      const title = decodeURIComponent(btn.getAttribute('data-title') || 'Archivo');
      const type = btn.getAttribute('data-type');

      if (modalTitle) {
        modalTitle.textContent = (type === 'audio' ? '🎵 Audio: ' : type === 'image' ? '🖼️ Imagen: ' : type === 'video' ? '🎬 Video: ' : '📄 Archivo: ') + title;
      }

      if (downloadBtn) {
        downloadBtn.href = url;
        downloadBtn.setAttribute('download', title);
      }

      if (modalBody) {
        if (type === 'audio') {
          if (modalMeta) modalMeta.textContent = '🎵 Audio con soporte de streaming instantáneo';
          modalBody.innerHTML = '<div style="width:100%; max-width:520px; padding:24px; display:flex; flex-direction:column; gap:16px; align-items:center; background:#111827; border-radius:12px; border:1px solid #1f2937;"><div style="font-size:3.5rem;">🎵</div><div style="font-family:monospace; font-weight:700; color:#f3f4f6; text-align:center; word-break:break-all;">' + title + '</div><audio controls autoplay style="width:100%; border-radius:8px;" src="' + url + '">Tu navegador no soporta reproducción de audio HTML5.</audio></div>';
        } else if (type === 'image') {
          if (modalMeta) modalMeta.textContent = '🖼️ Previsualización de imagen';
          modalBody.innerHTML = '<div style="width:100%; text-align:center; padding:10px;"><img src="' + url + '" style="max-width:100%; max-height:68vh; object-fit:contain; border-radius:10px; border:1px solid #1f2937; box-shadow:0 10px 25px rgba(0,0,0,0.5);" alt="' + title + '" /></div>';
        } else if (type === 'video') {
          if (modalMeta) modalMeta.textContent = '⚡ Streaming progresivo activo (HTTP 206) — Puedes adelantar/retroceder libremente';
          modalBody.innerHTML = '<div style="width:100%; display:flex; justify-content:center; align-items:center;"><video controls autoplay playsinline preload="metadata" style="max-width:100%; max-height:68vh; object-fit:contain; border-radius:10px; background:#000; border:1px solid #1f2937; box-shadow:0 10px 25px rgba(0,0,0,0.6);" src="' + url + '">Tu navegador no soporta reproducción de video HTML5.</video></div>';
        } else {
          if (modalMeta) modalMeta.textContent = '📄 Archivo sin previsualización directa';
          modalBody.innerHTML = '<div style="padding:30px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px;"><div style="font-size:3.5rem;">📄</div><div style="font-family:monospace; font-weight:700; color:#f3f4f6;">' + title + '</div><p style="color:#9ca3af; max-width:400px;">Este archivo no tiene previsualización multimedia directa. Puedes descargarlo directamente a tu equipo.</p></div>';
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
        if (audio) { audio.pause(); audio.src = ''; }
        if (video) { video.pause(); video.src = ''; }
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
