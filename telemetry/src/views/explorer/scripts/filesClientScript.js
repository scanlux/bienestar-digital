/**
 * Script de cliente para el Explorador de Archivos (selección masiva, filtros, sincronización)
 */
function getFilesClientScript({ deviceId, initialFilter }) {
  return `
    // Funciones específicas de selección y escaneo en vista Remota
    function updateSelectedCount() {
      const checkboxes = document.querySelectorAll('.file-cb:checked');
      const count = checkboxes.length;
      const countSpan = document.getElementById('selectedCount');
      const syncBtn = document.getElementById('syncSelectedBtn');
      const mobileCountSpan = document.getElementById('mobileSelectedCount');
      const mobileBar = document.getElementById('mobileStickyBar');

      if (countSpan) countSpan.textContent = count;
      if (mobileCountSpan) mobileCountSpan.textContent = count;
      if (syncBtn) {
        syncBtn.disabled = count === 0;
        syncBtn.style.opacity = count > 0 ? '1' : '0.5';
      }
      if (mobileBar) {
        mobileBar.style.display = count > 0 ? 'flex' : 'none';
      }
    }

    function toggleSelectAll(masterCb) {
      const checkboxes = document.querySelectorAll('.file-cb');
      checkboxes.forEach(cb => { cb.checked = masterCb.checked; });
      updateSelectedCount();
    }

    function requestSelectedSync(deviceId) {
      const checkboxes = document.querySelectorAll('.file-cb:checked');
      const paths = Array.from(checkboxes).map(cb => cb.getAttribute('data-path')).filter(Boolean);
      if (paths.length === 0) return;

      const btn = document.getElementById('syncSelectedBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando directivas...'; }

      let sent = 0;
      let errors = 0;

      Promise.all(paths.map(path => {
        return fetch('/api/telemetry/request-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: deviceId, filePath: path })
        })
        .then(res => res.json())
        .then(data => { if (data.success) sent++; else errors++; })
        .catch(() => errors++);
      })).then(() => {
        alert('Se registraron ' + sent + ' solicitudes de sincronización para los elementos seleccionados.');
        window.location.reload();
      });
    }

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

    function triggerSyncAll(btn) {
      const deviceId = btn.getAttribute('data-device-id');
      btn.disabled = true;
      btn.textContent = 'Sincronizando...';

      fetch('/api/telemetry/devices/' + encodeURIComponent(deviceId) + '/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeLarge: false })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Sincronizacion total activada. Se encolaron ' + (data.result ? data.result.enqueuedPending || 0 : 0) + ' archivos ligeros (<100MB) para descarga inmediata.');
          window.location.reload();
        } else {
          alert('Error al iniciar sincronizacion total.');
          btn.disabled = false;
          btn.textContent = '🔄 Sincronizar Todo el Teléfono';
        }
      })
      .catch(err => {
        alert('Error de comunicacion con el servidor.');
        btn.disabled = false;
        btn.textContent = '🔄 Sincronizar Todo el Teléfono';
      });
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
