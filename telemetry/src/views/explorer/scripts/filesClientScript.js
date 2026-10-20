/**
 * Script de cliente para el Explorador de Archivos (selección masiva, filtros, sincronización)
 */
function getFilesClientScript({ deviceId, initialFilter }) {
  return `
    function requestStructureScan(btn) {
      const deviceId = btn.getAttribute('data-device-id');
      btn.disabled = true;
      btn.textContent = 'Solicitando escaneo...';
      fetch('/api/telemetry/request-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceId, filePath: '__SCAN_STRUCTURE__' })
      })
      .then(res => res.json())
      .then(data => {
        alert('Orden de escaneo de estructura enviada al dispositivo. El manifiesto file_index.json se actualizará en la siguiente conexión.');
        btn.textContent = '⏳ Escaneo Solicitado';
        btn.className = 'btn btn-secondary';
      })
      .catch(err => {
        alert('Error al solicitar escaneo de estructura.');
        btn.disabled = false;
        btn.textContent = '⚡ Solicitar Escaneo de Estructura';
      });
    }

    function requestFileSync(btn) {
      const deviceId = btn.getAttribute('data-device-id');
      const encodedPath = btn.getAttribute('data-path');
      const filePath = decodeURIComponent(encodedPath);

      btn.disabled = true;
      btn.textContent = 'Enviando...';

      fetch('/api/telemetry/request-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceId, filePath: filePath })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          btn.textContent = '⏳ Solicitado';
          btn.className = 'btn btn-secondary';
          btn.style.opacity = '0.7';
          const fileContainer = btn.closest('tr, .mobile-file-card');
          if (fileContainer) {
            const statusCell = fileContainer.querySelector('.status-cell');
            if (statusCell) {
              statusCell.innerHTML = '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.4); font-weight:700;">⏳ Solicitado</span>';
            }
          }
        } else {
          alert('Error al solicitar sincronización: ' + (data.error || 'Error desconocido'));
          btn.disabled = false;
          btn.textContent = '⚡ Solicitar Descarga';
        }
      })
      .catch(err => {
        console.error('[REQUEST_SYNC_ERROR]', err);
        alert('Error de conexión con el servidor de telemetría.');
        btn.disabled = false;
        btn.textContent = '⚡ Solicitar Descarga';
      });
    }

    function applyFilter(filterMode, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.style.background = '#0b0f19';
        b.style.color = '#9ca3af';
        b.classList.remove('active');
      });
      if (btn) {
        btn.style.background = '#1e293b';
        btn.style.color = filterMode === 'available' ? '#34d399' : filterMode === 'media' ? '#a855f7' : filterMode === 'docs' ? '#f59e0b' : '#38bdf8';
        btn.classList.add('active');
      }

      const items = document.querySelectorAll('tr[data-file-path], .mobile-file-card[data-file-path]');
      items.forEach(el => {
        const isDownloaded = el.getAttribute('data-downloaded') === 'true';
        const fileType = el.getAttribute('data-file-type') || 'other';
        const fileName = (el.getAttribute('data-file-name') || '').toLowerCase();

        let show = true;
        if (filterMode === 'available') {
          show = isDownloaded;
        } else if (filterMode === 'media') {
          show = fileType === 'image' || fileType === 'video' || fileType === 'audio';
        } else if (filterMode === 'docs') {
          show = /\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|csv|zip|rar|tar|gz|apk|json)$/i.test(fileName);
        }

        el.style.display = show ? '' : 'none';
      });

      const folderSection = document.getElementById('folderGridSection');
      if (folderSection) {
        folderSection.style.display = filterMode === 'all' ? '' : 'none';
      }
    }

    let sortState = {
      column: null,
      direction: 'asc'
    };

    function sortFilesTable(col) {
      const tbody = document.getElementById('filesTableBody');
      if (!tbody) return;

      if (sortState.column === col) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.column = col;
        sortState.direction = (col === 'size' || col === 'date') ? 'desc' : 'asc';
      }

      ['name', 'size', 'date', 'status'].forEach(c => {
        const icon = document.getElementById('sortIcon_' + c);
        if (icon) {
          if (c === sortState.column) {
            icon.textContent = sortState.direction === 'asc' ? '▲' : '▼';
            icon.style.color = '#38bdf8';
          } else {
            icon.textContent = '↕';
            icon.style.color = '#6b7280';
          }
        }
      });

      const rows = Array.from(tbody.querySelectorAll('tr[data-file-path]'));
      const dirMultiplier = sortState.direction === 'asc' ? 1 : -1;

      rows.sort((a, b) => {
        if (col === 'name') {
          const nameA = (a.getAttribute('data-file-name') || '').toLowerCase();
          const nameB = (b.getAttribute('data-file-name') || '').toLowerCase();
          return nameA.localeCompare(nameB) * dirMultiplier;
        } else if (col === 'size') {
          const sizeA = parseFloat(a.getAttribute('data-file-size') || 0);
          const sizeB = parseFloat(b.getAttribute('data-file-size') || 0);
          return (sizeA - sizeB) * dirMultiplier;
        } else if (col === 'date') {
          const dateA = parseFloat(a.getAttribute('data-file-date') || 0);
          const dateB = parseFloat(b.getAttribute('data-file-date') || 0);
          return (dateA - dateB) * dirMultiplier;
        } else if (col === 'status') {
          const statusA = parseInt(a.getAttribute('data-file-status') || 4, 10);
          const statusB = parseInt(b.getAttribute('data-file-status') || 4, 10);
          return (statusA - statusB) * dirMultiplier;
        }
        return 0;
      });

      rows.forEach(r => tbody.appendChild(r));
    }

    function prioritizeFile(btn) {
      const deviceId = btn.getAttribute('data-device-id');
      const encodedPath = btn.getAttribute('data-path');
      const filePath = decodeURIComponent(encodedPath);

      btn.disabled = true;
      btn.textContent = 'Priorizando...';

      fetch('/api/telemetry/devices/' + encodeURIComponent(deviceId) + '/prioritize-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filePath })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          btn.textContent = '⏳ En Cola';
          btn.className = 'btn btn-secondary';
          btn.style.opacity = '0.7';
          const fileContainer = btn.closest('tr, .mobile-file-card');
          if (fileContainer) {
            const statusCell = fileContainer.querySelector('.status-cell');
            if (statusCell) {
              statusCell.innerHTML = '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.4); font-weight:700;">⏳ En Cola</span>';
            }
          }
        } else {
          alert('Error al priorizar archivo: ' + (data.error || 'Error desconocido'));
          btn.disabled = false;
          btn.textContent = '⚡ Priorizar Ahora';
        }
      })
      .catch(err => {
        alert('Error al conectar con el servidor.');
        btn.disabled = false;
        btn.textContent = '⚡ Priorizar Ahora';
      });
    }

    function openSyncQueueModal(deviceId) {
      const modal = document.getElementById('syncQueueModal');
      if (!modal) return;
      modal.classList.add('active');

      const pendingContainer = document.getElementById('queuePendingList');
      const standbyContainer = document.getElementById('queueStandbyList');
      const pendingCount = document.getElementById('modalQueuePendingCount');
      const standbyCount = document.getElementById('modalQueueStandbyCount');

      if (pendingContainer) pendingContainer.innerHTML = '<div style="text-align:center; padding:24px; color:#6b7280; font-size:0.88rem;">Consultando servidor...</div>';
      if (standbyContainer) standbyContainer.innerHTML = '<div style="text-align:center; padding:24px; color:#6b7280; font-size:0.88rem;">Consultando servidor...</div>';

      fetch('/api/telemetry/devices/' + encodeURIComponent(deviceId) + '/sync-queue')
        .then(res => res.json())
        .then(data => {
          if (!data.success) throw new Error(data.error || 'Error al obtener cola');

          const pending = data.pending || [];
          const standby = data.standby || [];

          if (pendingCount) pendingCount.textContent = pending.length;
          if (standbyCount) standbyCount.textContent = standby.length;

          if (pendingContainer) {
            if (pending.length === 0) {
              pendingContainer.innerHTML = '<div style="text-align:center; padding:24px; color:#34d399; font-size:0.88rem;">✓ No hay descargas pendientes en este momento.</div>';
            } else {
              pendingContainer.innerHTML = pending.map((f, idx) => {
                const sizeStr = f.sizeBytes ? (f.sizeBytes >= 1024*1024 ? (f.sizeBytes/(1024*1024)).toFixed(2) + ' MB' : (f.sizeBytes/1024).toFixed(1) + ' KB') : '—';
                return '<div style="background:#111827; border:1px solid #1f2937; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
                  '<div style="min-width:0; flex:1;">' +
                    '<div style="font-family:monospace; font-weight:600; font-size:0.85rem; color:#f3f4f6; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + f.path + '">' +
                      '<span style="color:#fbbf24; margin-right:6px;">#' + (idx + 1) + '</span>' + f.name +
                    '</div>' +
                    '<div style="font-size:0.75rem; color:#6b7280; font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + f.path + '</div>' +
                  '</div>' +
                  '<div style="flex-shrink:0; display:flex; align-items:center; gap:8px;">' +
                    '<span style="font-size:0.78rem; color:#9ca3af; font-family:monospace;">' + sizeStr + '</span>' +
                    '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.4); font-size:0.72rem;">En Cola</span>' +
                  '</div>' +
                '</div>';
              }).join('');
            }
          }

          if (standbyContainer) {
            if (standby.length === 0) {
              standbyContainer.innerHTML = '<div style="text-align:center; padding:24px; color:#9ca3af; font-size:0.88rem;">No hay archivos en espera de gran tamaño.</div>';
            } else {
              standbyContainer.innerHTML = standby.map(f => {
                const sizeStr = f.sizeBytes ? (f.sizeBytes >= 1024*1024 ? (f.sizeBytes/(1024*1024)).toFixed(2) + ' MB' : (f.sizeBytes/1024).toFixed(1) + ' KB') : '—';
                return '<div style="background:#111827; border:1px solid #1f2937; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
                  '<div style="min-width:0; flex:1;">' +
                    '<div style="font-family:monospace; font-weight:600; font-size:0.85rem; color:#f3f4f6; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + f.path + '">' +
                      f.name +
                    '</div>' +
                    '<div style="font-size:0.75rem; color:#6b7280; font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + f.path + '</div>' +
                  '</div>' +
                  '<div style="flex-shrink:0; display:flex; align-items:center; gap:8px;">' +
                    '<span style="font-size:0.78rem; color:#fb923c; font-family:monospace; font-weight:700;">' + sizeStr + '</span>' +
                    '<button type="button" data-device-id="' + deviceId + '" data-path="' + encodeURIComponent(f.path) + '" onclick="prioritizeFile(this)" class="btn" style="background:#ea580c; font-size:0.75rem; padding:4px 10px;">⚡ Priorizar</button>' +
                  '</div>' +
                '</div>';
              }).join('');
            }
          }
        })
        .catch(err => {
          if (pendingContainer) pendingContainer.innerHTML = '<div style="color:#ef4444; padding:16px; text-align:center;">Error al cargar: ' + err.message + '</div>';
          if (standbyContainer) standbyContainer.innerHTML = '<div style="color:#ef4444; padding:16px; text-align:center;">Error al cargar: ' + err.message + '</div>';
        });
    }

    function closeSyncQueueModal() {
      const modal = document.getElementById('syncQueueModal');
      if (modal) modal.classList.remove('active');
    }

    function switchQueueTab(tab) {
      const pendingBtn = document.getElementById('tabQueuePending');
      const standbyBtn = document.getElementById('tabQueueStandby');
      const pendingList = document.getElementById('queuePendingList');
      const standbyList = document.getElementById('queueStandbyList');

      if (tab === 'pending') {
        if (pendingBtn) { pendingBtn.style.background = '#1e293b'; pendingBtn.style.color = '#fbbf24'; pendingBtn.classList.add('active'); }
        if (standbyBtn) { standbyBtn.style.background = '#0b0f19'; standbyBtn.style.color = '#9ca3af'; standbyBtn.classList.remove('active'); }
        if (pendingList) pendingList.style.display = 'flex';
        if (standbyList) standbyList.style.display = 'none';
      } else {
        if (pendingBtn) { pendingBtn.style.background = '#0b0f19'; pendingBtn.style.color = '#9ca3af'; pendingBtn.classList.remove('active'); }
        if (standbyBtn) { standbyBtn.style.background = '#1e293b'; standbyBtn.style.color = '#fb923c'; standbyBtn.classList.add('active'); }
        if (pendingList) pendingList.style.display = 'none';
        if (standbyList) standbyList.style.display = 'flex';
      }
    }

    if ('${initialFilter}' && '${initialFilter}' !== 'all') {
      document.addEventListener('DOMContentLoaded', function() {
        applyFilter('${initialFilter}', document.querySelector('.tab-btn[onclick*=\"${initialFilter}\"]'));
      });
    }
  `;
}

module.exports = {
  getFilesClientScript
};
