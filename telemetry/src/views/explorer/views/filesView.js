/**
 * Nivel 3-files: Explorador Unificado de Archivos
 */
const path = require('path');

function renderFilesView({
  deviceId,
  currentPath = '/storage/emulated/0',
  allFiles = [],
  downloadedMap = {},
  pendingPaths = new Set(),
  standbyPaths = new Set(),
  syncStats = {},
  initialFilter = 'all',
  formatCompactDate,
  formatFileSize
}) {
  const normCurrent = currentPath.endsWith('/') ? currentPath : currentPath + '/';
  const dirSet = new Map();
  const folderTotalMap = new Map();
  const folderDownloadedMap = new Map();
  const filesList = [];

  allFiles.forEach(f => {
    const filePath = f.absolutePath || f.path || (f.relativePath ? ('/storage/emulated/0/' + f.relativePath.replace(/^\/+/, '')) : '');
    if (!filePath) return;

    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const fileObj = {
      ...f,
      path: normalizedFilePath,
      name: f.name || path.basename(normalizedFilePath),
      size: f.sizeBytes !== undefined ? f.sizeBytes : (f.size !== undefined ? f.size : null),
      lastModified: f.lastModified || f.last_modified || f.dateModified || f.ts || 0
    };

    if (normalizedFilePath.startsWith(normCurrent)) {
      const relative = normalizedFilePath.substring(normCurrent.length);
      const slashIdx = relative.indexOf('/');
      const numSize = Number(fileObj.size !== undefined && fileObj.size !== null ? fileObj.size : 0);

      if (slashIdx !== -1) {
        const folderName = relative.substring(0, slashIdx);
        const folderPath = normCurrent + folderName;
        if (!dirSet.has(folderName)) {
          dirSet.set(folderName, { name: folderName, path: folderPath });
        }
        if (!f.isDirectory && !isNaN(numSize) && numSize >= 100) {
          folderTotalMap.set(folderName, (folderTotalMap.get(folderName) || 0) + 1);
          if (downloadedMap[normalizedFilePath] || downloadedMap[filePath]) {
            folderDownloadedMap.set(folderName, (folderDownloadedMap.get(folderName) || 0) + 1);
          }
        }
      } else {
        if (f.isDirectory) {
          const folderName = fileObj.name || relative;
          if (!dirSet.has(folderName)) {
            dirSet.set(folderName, { name: folderName, path: normalizedFilePath });
          }
        } else {
          // Excluir archivos vacíos / stubs de prueba (< 100 bytes) de la vista web
          if (isNaN(numSize) || numSize < 100) {
            return;
          }
          filesList.push(fileObj);
        }
      }
    }
  });

  const subdirs = Array.from(dirSet.values()).sort((a,b) => a.name.localeCompare(b.name));
  filesList.sort((a,b) => (b.lastModified || 0) - (a.lastModified || 0));

  const rawPathParts = currentPath.split('/').filter(Boolean);
  const isPathPartsTruncated = rawPathParts.length > 3;
  const visiblePathParts = isPathPartsTruncated ? rawPathParts.slice(-3) : rawPathParts;

  let cumulativePath = isPathPartsTruncated ? '/' + rawPathParts.slice(0, rawPathParts.length - 3).join('/') : '';
  const breadcrumbLinks = (isPathPartsTruncated ? '<span style="color:#4b5563;">... /</span> ' : '') + visiblePathParts.map((part) => {
    cumulativePath += '/' + part;
    const targetP = cumulativePath;
    return `<a href="/expl/devices/${deviceId}/files?path=${encodeURIComponent(targetP)}" style="color:#38bdf8; text-decoration:none; font-weight:600;">${part}</a>`;
  }).join(' <span style="color:#4b5563;">/</span> ');

  const parentPath = rawPathParts.length > 1 ? '/' + rawPathParts.slice(0, -1).join('/') : '/storage/emulated/0';

  const total = syncStats.totalFiles || allFiles.length || 1;
  const downloaded = syncStats.downloadedFiles || Object.keys(downloadedMap).length || 0;
  const pct = Math.min(100, Math.round((downloaded / total) * 100));

  return `
    <div style="background:#111827; border:1px solid #1f2937; border-radius:14px; padding:16px 20px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
      <div style="font-family:monospace; font-size:0.9rem; color:#e5e7eb; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <a href="/expl/devices/${deviceId}/files?path=/storage/emulated/0" style="color:#38bdf8; font-weight:700; text-decoration:none;">🏠 Root</a>
        <span style="color:#4b5563;">/</span>
        ${breadcrumbLinks}
      </div>
      ${currentPath !== '/storage/emulated/0' ? `
        <a href="/expl/devices/${deviceId}/files?path=${encodeURIComponent(parentPath)}" class="btn btn-secondary" style="font-size:0.8rem; padding:6px 12px;">&uarr; Subir Nivel</a>
      ` : ''}
    </div>

    <!-- Barra de Pestanas de Filtrado Unificado (Tabs) -->
    <div class="tabs-container" style="display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; border-bottom:1px solid #1f2937; padding-bottom:12px;">
      <button type="button" class="tab-btn ${initialFilter === 'all' ? 'active' : ''}" onclick="applyFilter('all', this)" style="padding:8px 16px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; border:1px solid #374151; background:${initialFilter === 'all' ? '#1e293b' : '#0b0f19'}; color:${initialFilter === 'all' ? '#38bdf8' : '#9ca3af'}; transition:all 0.2s;">
        📂 Todos los Archivos
      </button>
      <button type="button" class="tab-btn ${initialFilter === 'available' ? 'active' : ''}" onclick="applyFilter('available', this)" style="padding:8px 16px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; border:1px solid #374151; background:${initialFilter === 'available' ? '#1e293b' : '#0b0f19'}; color:${initialFilter === 'available' ? '#34d399' : '#9ca3af'}; transition:all 0.2s;">
        ✓ Solo Sincronizados (Disponibles)
      </button>
      <button type="button" class="tab-btn ${initialFilter === 'media' ? 'active' : ''}" onclick="applyFilter('media', this)" style="padding:8px 16px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; border:1px solid #374151; background:${initialFilter === 'media' ? '#1e293b' : '#0b0f19'}; color:${initialFilter === 'media' ? '#a855f7' : '#9ca3af'}; transition:all 0.2s;">
        🎬 Multimedia (Fotos y Videos)
      </button>
      <button type="button" class="tab-btn ${initialFilter === 'docs' ? 'active' : ''}" onclick="applyFilter('docs', this)" style="padding:8px 16px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; border:1px solid #374151; background:${initialFilter === 'docs' ? '#1e293b' : '#0b0f19'}; color:${initialFilter === 'docs' ? '#f59e0b' : '#9ca3af'}; transition:all 0.2s;">
        📄 Documentos
      </button>
    </div>

    ${allFiles.length === 0 ? `
      <div id="scanStatusBanner" style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px; color: #e5e7eb;">
        <div id="scanStatusTitle" style="font-weight: 700; font-size: 1rem; color: #38bdf8; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
          ℹ️ El teléfono aún no ha enviado el manifiesto de archivos (file_index.json)
        </div>
        <p id="scanStatusDesc" style="font-size: 0.88rem; color: #9ca3af; line-height: 1.5; margin-bottom: 14px;">
          La aplicación móvil en el teléfono envía la lista de archivos al iniciarse o en su ciclo de fondo. Puedes presionar el botón a continuación para enviar una directiva de escaneo de estructura:
        </p>
        <button type="button" id="scanStatusBtn" data-device-id="${deviceId}" onclick="requestStructureScan(this)" class="btn" style="background:#3b82f6; font-size:0.85rem; padding:8px 16px;">
          ⚡ Solicitar Escaneo de Estructura
        </button>
      </div>
    ` : ''}

    <div id="folderGridSection" style="margin-bottom:24px;">
      <h3 style="font-size:1rem; font-weight:700; color:#9ca3af; margin-bottom:12px; display:flex; align-items:center; gap:8px;">📁 Carpetas (${subdirs.length})</h3>
      ${subdirs.length === 0 ? '<p style="font-size:0.85rem; color:#6b7280; font-style:italic;">No hay subcarpetas en esta ruta.</p>' : `
        <div class="folder-grid">
          ${subdirs.map(d => {
            const totalCount = folderTotalMap.get(d.name) || 0;
            const downloadedCount = folderDownloadedMap.get(d.name) || 0;
            return `
              <a href="/expl/devices/${deviceId}/files?path=${encodeURIComponent(d.path)}" class="folder-card">
                <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
                  <span style="font-size:1.35rem; flex-shrink:0;">📁</span>
                  <span style="font-weight:600; font-size:0.88rem; color:#f3f4f6; font-family:monospace; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${d.name}">${d.name}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                  <span class="badge" style="background:rgba(56,189,248,0.1); color:#38bdf8; border-color:rgba(56,189,248,0.25); font-size:0.75rem; padding:2px 8px; font-weight:600;">${downloadedCount}/${totalCount}</span>
                  <span style="color:#6b7280; font-size:0.9rem; font-weight:bold;">&rarr;</span>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- KPI Banner de Sincronizacion Global (Server-Driven) -->
    <div class="sync-kpi-banner" style="background:#111827; border:1px solid #1f2937; border-radius:14px; padding:18px 22px; margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; margin-bottom:14px;">
        <div>
          <div style="font-size:1.1rem; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:8px;">
            <span>⚡ Sincronización Global del Dispositivo</span>
            <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border-color:rgba(16,185,129,0.3); font-size:0.75rem;">Server-Driven</span>
          </div>
          <div style="font-size:0.84rem; color:#9ca3af; margin-top:2px;">
            El servidor entrega continuamente archivos ordenados por menor tamaño al teléfono en segundo plano.
          </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button type="button" id="btnSyncAll" data-device-id="${deviceId}" onclick="triggerSyncAll(this)" class="btn" style="background:#10b981; font-weight:700; font-size:0.85rem; padding:8px 18px;">
            🔄 Sincronizar Todo el Teléfono
          </button>
        </div>
      </div>

      <!-- Metricas KPI Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px;">
        <div style="background:#0b0f19; border:1px solid #1f2937; border-radius:10px; padding:10px 14px; text-align:center;">
          <div style="font-size:0.75rem; color:#9ca3af; text-transform:uppercase; font-weight:600;">Total Archivos</div>
          <div id="kpiTotalFiles" style="font-size:1.25rem; font-weight:800; color:#f3f4f6;">${syncStats.totalFiles || allFiles.length}</div>
        </div>
        <div style="background:#0b0f19; border:1px solid #1f2937; border-radius:10px; padding:10px 14px; text-align:center;">
          <div style="font-size:0.75rem; color:#34d399; text-transform:uppercase; font-weight:600;">Sincronizados</div>
          <div id="kpiDownloadedFiles" style="font-size:1.25rem; font-weight:800; color:#34d399;">${syncStats.downloadedFiles || Object.keys(downloadedMap).length}</div>
        </div>
        <div style="background:#0b0f19; border:1px solid #1f2937; border-radius:10px; padding:10px 14px; text-align:center;">
          <div style="font-size:0.75rem; color:#fbbf24; text-transform:uppercase; font-weight:600;">En Cola / Descarga</div>
          <div id="kpiPendingFiles" style="font-size:1.25rem; font-weight:800; color:#fbbf24;">${syncStats.pendingFiles || pendingPaths.size}</div>
        </div>
        <div style="background:#0b0f19; border:1px solid #1f2937; border-radius:10px; padding:10px 14px; text-align:center;">
          <div style="font-size:0.75rem; color:#fb923c; text-transform:uppercase; font-weight:600;">En Espera (>100MB)</div>
          <div id="kpiStandbyFiles" style="font-size:1.25rem; font-weight:800; color:#fb923c;">${syncStats.standbyFiles || standbyPaths.size}</div>
        </div>
      </div>

      <!-- Barra de Progreso Porcentual -->
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#9ca3af; margin-bottom:4px;">
          <span>Progreso de Respaldo Global</span>
          <span id="kpiProgressPct" style="font-weight:700; color:#10b981;">${pct}% completado</span>
        </div>
        <div style="width:100%; height:8px; background:#1f2937; border-radius:999px; overflow:hidden;">
          <div id="kpiProgressBar" style="width:${pct}%; height:100%; background:linear-gradient(90deg, #10b981, #38bdf8); border-radius:999px; transition:width 0.4s ease;"></div>
        </div>
      </div>
    </div>

    <div>
      <h3 style="font-size:1rem; font-weight:700; color:#9ca3af; margin-bottom:12px; display:flex; align-items:center; gap:8px;">📄 Archivos en este Directorio (${filesList.length})</h3>
      ${filesList.length === 0 ? '<p style="font-size:0.85rem; color:#6b7280; font-style:italic;">No hay archivos en esta carpeta.</p>' : `
        <!-- Vista Escritorio: Tabla de Alta Densidad -->
        <div class="desktop-table-view" style="overflow-x:auto; background:#111827; border:1px solid #1f2937; border-radius:14px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.88rem;">
            <thead>
              <tr style="border-bottom:1px solid #1f2937; background:#151d30; color:#9ca3af; user-select:none;">
                <th style="padding:12px 10px 12px 20px; width:48px; text-align:center; white-space:nowrap;">
                  <input type="checkbox" id="selectAllCb" onclick="toggleSelectAll(this)" style="width:18px; height:18px; cursor:pointer;" title="Seleccionar todos" />
                </th>
                <th style="padding:12px 14px; font-weight:600; max-width:280px; cursor:pointer;" onclick="sortFilesTable('name')" title="Ordenar por Nombre">
                  Nombre del Archivo <span id="sortIcon_name" style="font-size:0.75rem; color:#6b7280; margin-left:4px;">↕</span>
                </th>
                <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:90px; text-align:right; cursor:pointer;" onclick="sortFilesTable('size')" title="Ordenar por Tamaño">
                  Tamaño <span id="sortIcon_size" style="font-size:0.75rem; color:#6b7280; margin-left:4px;">↕</span>
                </th>
                <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:135px; text-align:center; cursor:pointer;" onclick="sortFilesTable('date')" title="Ordenar por Fecha">
                  Fecha <span id="sortIcon_date" style="font-size:0.75rem; color:#6b7280; margin-left:4px;">↕</span>
                </th>
                <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:140px; text-align:center; cursor:pointer;" onclick="sortFilesTable('status')" title="Ordenar por Estado">
                  Estado <span id="sortIcon_status" style="font-size:0.75rem; color:#6b7280; margin-left:4px;">↕</span>
                </th>
                <th style="padding:12px 14px; font-weight:600; text-align:right; white-space:nowrap; width:175px;">Acción</th>
              </tr>
            </thead>
            <tbody id="filesTableBody">
              ${filesList.map(f => {
                const isDownloaded = Boolean(downloadedMap[f.path]);
                const isPending = pendingPaths.has(f.path);
                const isStandby = standbyPaths.has(f.path);
                const statusCode = isDownloaded ? 1 : isPending ? 2 : isStandby ? 3 : 4;
                const isAudio = Boolean(f.name && (/\\.(opus|ogg|mp3|wav|m4a|aac|flac)$/i).test(f.name));
                const isImage = Boolean(f.name && (/\\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i).test(f.name));
                const videoRegex = /\\.(mp4|webm|mkv|mov|avi|3gp)$/i;
                const isVideo = Boolean(f.name && videoRegex.test(f.name));
                const fileIcon = isAudio ? '🎵' : isImage ? '🖼️' : isVideo ? '🎬' : '📄';
                const fileType = isAudio ? 'audio' : isImage ? 'image' : isVideo ? 'video' : 'other';
                const fileContentUrl = `/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(f.path)}`;

                return `
                  <tr style="border-bottom:1px solid #1f2937;" data-file-path="${f.path}" data-file-name="${(f.name || '').toLowerCase()}" data-file-size="${f.size || 0}" data-file-date="${f.lastModified || 0}" data-file-status="${statusCode}" data-downloaded="${isDownloaded ? 'true' : 'false'}" data-file-type="${fileType}">
                    <td style="padding:12px 10px 12px 20px; text-align:center; white-space:nowrap;" class="cb-cell">
                      ${isDownloaded ? '' : `<input type="checkbox" class="select-checkbox file-cb" data-path="${f.path}" onclick="updateSelectedCount();" style="width:18px; height:18px; cursor:pointer;" />`}
                    </td>
                    <td style="padding:12px 14px; font-family:monospace; color:#f3f4f6; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" class="name-cell" title="${f.name}">
                      ${isDownloaded ? `
                        <a href="#" onclick="openMediaPreview(this); return false;" data-url="${fileContentUrl}" data-title="${encodeURIComponent(f.name)}" data-type="${fileType}" style="color:#38bdf8; text-decoration:none; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:8px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                          <span style="flex-shrink:0;">${fileIcon}</span> <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
                        </a>
                      ` : `
                        <span style="display:inline-flex; align-items:center; gap:8px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><span style="flex-shrink:0;">${fileIcon}</span> <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span></span>
                      `}
                    </td>
                    <td style="padding:12px 14px; color:#9ca3af; white-space:nowrap; text-align:right;">
                      ${formatFileSize(f.size)}
                    </td>
                    <td style="padding:12px 14px; color:#9ca3af; font-size:0.82rem; white-space:nowrap; text-align:center; font-family:monospace;">
                      ${formatCompactDate(f.lastModified)}
                    </td>
                    <td style="padding:12px 14px; white-space:nowrap; text-align:center;" class="status-cell">
                      ${isDownloaded ? '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border-color:rgba(16,185,129,0.4);">✓ Sincronizado</span>' : 
                        isPending ? '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.4);">⏳ En Cola</span>' :
                        isStandby ? '<span class="badge" style="background:rgba(249,115,22,0.15); color:#f97316; border-color:rgba(249,115,22,0.4);">⏸ En Espera</span>' :
                        '<span class="badge" style="background:rgba(107,114,128,0.15); color:#9ca3af; border-color:rgba(107,114,128,0.4);">En Dispositivo</span>'
                      }
                    </td>
                    <td style="padding:12px 14px; text-align:right; white-space:nowrap;" class="action-cell">
                      ${isDownloaded ? `
                        <a href="${fileContentUrl}" download="${f.name}" target="_blank" class="btn" style="background:#059669; font-size:0.78rem; padding:6px 12px; width:160px; min-width:160px; max-width:160px; white-space:nowrap; text-decoration:none; display:inline-flex; justify-content:center; align-items:center;">⬇ Descargar a PC</a>
                      ` : isPending ? `
                        <button type="button" disabled class="btn btn-secondary" style="font-size:0.78rem; padding:6px 12px; width:160px; min-width:160px; max-width:160px; white-space:nowrap; opacity:0.6; display:inline-flex; justify-content:center; align-items:center;">⏳ En Cola</button>
                      ` : isStandby ? `
                        <button type="button" data-device-id="${deviceId}" data-path="${encodeURIComponent(f.path)}" onclick="prioritizeFile(this)" class="btn" style="background:#ea580c; font-size:0.78rem; padding:6px 12px; width:160px; min-width:160px; max-width:160px; white-space:nowrap; display:inline-flex; justify-content:center; align-items:center;">⚡ Priorizar Ahora</button>
                      ` : `
                        <button type="button" data-device-id="${deviceId}" data-path="${encodeURIComponent(f.path)}" onclick="requestFileSync(this)" class="btn" style="font-size:0.78rem; padding:6px 12px; width:160px; min-width:160px; max-width:160px; white-space:nowrap; display:inline-flex; justify-content:center; align-items:center;">⚡ Solicitar Descarga</button>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Vista Móvil: Tarjetas Compactas Táctiles -->
        <div class="mobile-cards-view">
          ${filesList.map(f => {
            const isDownloaded = Boolean(downloadedMap[f.path]);
            const isPending = pendingPaths.has(f.path);
            const isStandby = standbyPaths.has(f.path);
            const isAudio = Boolean(f.name && (/\\.(opus|ogg|mp3|wav|m4a|aac|flac)$/i).test(f.name));
            const isImage = Boolean(f.name && (/\\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i).test(f.name));
            const isVideo = Boolean(f.name && (/\\.(mp4|webm|mkv|mov|avi|3gp)$/i).test(f.name));
            const fileIcon = isAudio ? '🎵' : isImage ? '🖼️' : isVideo ? '🎬' : '📄';
            const fileType = isAudio ? 'audio' : isImage ? 'image' : isVideo ? 'video' : 'other';
            const fileContentUrl = `/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(f.path)}`;
            const formattedSize = formatFileSize(f.size);

            return `
              <div class="mobile-file-card" data-file-path="${f.path}" data-file-name="${f.name}" data-downloaded="${isDownloaded ? 'true' : 'false'}" data-file-type="${fileType}" style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <div class="name-cell" style="display:flex; align-items:center; gap:8px; min-width:0; flex:1; overflow:hidden;">
                    <span style="flex-shrink:0; font-size:1.2rem;">${fileIcon}</span>
                    ${isDownloaded ? `
                      <a href="#" onclick="openMediaPreview(this); return false;" data-url="${fileContentUrl}" data-title="${encodeURIComponent(f.name)}" data-type="${fileType}" style="color:#38bdf8; font-weight:600; font-size:0.9rem; font-family:monospace; text-decoration:none; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1;" title="${f.name}">
                        ${f.name}
                      </a>
                    ` : `
                      <span style="font-weight:600; font-size:0.9rem; font-family:monospace; color:#f3f4f6; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1;" title="${f.name}">${f.name}</span>
                    `}
                  </div>
                  <div class="status-cell" style="flex-shrink:0;">
                    ${isDownloaded ? '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border-color:rgba(16,185,129,0.4); font-weight:700;">✓ Sincronizado</span>' : 
                      isPending ? '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.4); font-weight:700;">⏳ En Cola</span>' :
                      isStandby ? '<span class="badge" style="background:rgba(249,115,22,0.15); color:#f97316; border-color:rgba(249,115,22,0.4); font-weight:700;">⏸ En Espera</span>' :
                      '<span class="badge" style="background:rgba(107,114,128,0.15); color:#9ca3af; border-color:rgba(107,114,128,0.4);">En Dispositivo</span>'
                    }
                  </div>
                </div>

                <div style="display:flex; align-items:center;">
                  <div class="cb-cell" style="display:${isDownloaded ? 'none' : 'flex'}; align-items:center; margin-right:10px;">
                    <input type="checkbox" class="select-checkbox file-cb" data-path="${f.path}" onclick="updateSelectedCount();" style="width:20px; height:20px; cursor:pointer; flex-shrink:0;" />
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; flex:1; font-size:0.8rem; color:#9ca3af; background:#0b0f19; padding:8px 12px; border-radius:8px; border:1px solid #1f2937;">
                    <span>Tamaño: <span style="margin-left:2px;">📦</span> <strong style="color:#e5e7eb; margin-left:4px;">${formattedSize}</strong></span>
                    <span>Fecha: <strong style="color:#e5e7eb; margin-left:4px; font-family:monospace;">${formatCompactDate(f.lastModified)}</strong></span>
                  </div>
                </div>

                <div style="margin-top:2px;" class="action-cell">
                  ${isDownloaded ? `
                    <a href="${fileContentUrl}" download="${f.name}" target="_blank" class="btn" style="background:#059669; font-size:0.8rem; padding:8px 14px; width:100%; text-decoration:none; display:inline-flex; justify-content:center; align-items:center;">⬇ Descargar a PC</a>
                  ` : isPending ? `
                    <button type="button" disabled class="btn btn-secondary" style="font-size:0.8rem; padding:8px 14px; width:100%; opacity:0.6; display:inline-flex; justify-content:center; align-items:center;">⏳ En Cola</button>
                  ` : isStandby ? `
                    <button type="button" data-device-id="${deviceId}" data-path="${encodeURIComponent(f.path)}" onclick="prioritizeFile(this)" class="btn" style="background:#ea580c; font-size:0.8rem; padding:8px 14px; width:100%; display:inline-flex; justify-content:center; align-items:center;">⚡ Priorizar Ahora</button>
                  ` : `
                    <button type="button" data-device-id="${deviceId}" data-path="${encodeURIComponent(f.path)}" onclick="requestFileSync(this)" class="btn" style="font-size:0.8rem; padding:8px 14px; width:100%; display:inline-flex; justify-content:center; align-items:center;">⚡ Solicitar Descarga</button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- Barra Flotante de Selección Masiva para Móvil -->
    <div id="mobileStickyBar" style="position:fixed; bottom:16px; left:12px; right:12px; z-index:999; background:#111827; border:1px solid #10b981; border-radius:14px; padding:12px 16px; display:none; justify-content:space-between; align-items:center; box-shadow:0 10px 30px rgba(0,0,0,0.8);">
      <span style="font-size:0.88rem; color:#e5e7eb; font-weight:600;">
        Seleccionados: <strong id="mobileSelectedCount" style="color:#34d399;">0</strong>
      </span>
      <button type="button" onclick="requestSelectedSync('${deviceId}')" class="btn" style="background:#10b981; font-weight:700; font-size:0.85rem; padding:8px 16px;">
        ⚡ Sincronizar Seleccionados
      </button>
    </div>
  `;
}

module.exports = {
  renderFilesView
};
