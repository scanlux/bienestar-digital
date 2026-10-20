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
