const path = require('path');
const { getAppIcon } = require('../utils/appIcons');
const { getAppDisplayName } = require('../utils/helpers');

const generateExplorerHtml = ({ title, level, deviceId, appPackage, devicesList = [], appsList = [], items = [], downloadUrl, currentPath = '/storage/emulated/0', allFiles = [], downloadedMap = {}, pendingPaths = new Set(), autoSyncFolders = new Set() }) => {
  const cleanTitle = (appPackage && level === 3) 
    ? `${getAppDisplayName(appPackage)}` 
    : String(title).replace(/<[^>]*>/g, '').trim();

  const formatCompactDate = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle} - Explorador NLP</title>
  <link rel="icon" href="https://trendy.sytes.net/favicon.ico" type="image/x-icon">
  <link rel="shortcut icon" href="https://trendy.sytes.net/favicon.ico">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📱</text></svg>">
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f3f4f6; line-height: 1.5; padding-top: 70px; padding-bottom: 24px; padding-left: 24px; padding-right: 24px; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
    .container { max-width: 1240px; margin: 0 auto; width: 100%; flex: 1; }
    .footer-quote { text-align: center; margin-top: 48px; padding-top: 24px; border-top: 1px solid #1f2937; color: #6b7280; font-size: 0.88rem; font-style: italic; }
    .footer-quote span { font-style: normal; font-weight: 600; color: #9ca3af; margin-left: 6px; }
    
    .navbar-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 56px; background: rgba(17, 24, 39, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #1f2937; display: flex; align-items: center; padding: 0 24px; z-index: 999; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .nav-breadcrumbs { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: #9ca3af; flex-wrap: nowrap; overflow-x: auto; width: 100%; scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; }
    .nav-breadcrumbs::-webkit-scrollbar { display: none; width: 0; height: 0; }
    .nav-breadcrumbs a { color: #38bdf8; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
    .nav-breadcrumbs a:hover { text-decoration: underline; }
    .nav-breadcrumbs .separator { color: #4b5563; flex-shrink: 0; }
    .nav-breadcrumbs .current { color: #f3f4f6; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
    .btn-logout { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 5px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; text-decoration: none; transition: all 0.2s; flex-shrink: 0; margin-right: 12px; display: inline-flex; align-items: center; gap: 4px; }
    .btn-logout:hover { background: rgba(239, 68, 68, 0.25); border-color: #ef4444; color: #fff; transform: translateY(-1px); }
    
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #1f2937; padding-bottom: 20px; flex-wrap: wrap; gap: 16px; margin-top: 10px; }
    .header-title { font-size: 1.5rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 12px; letter-spacing: -0.025em; }
    .header-subtitle { color: #9ca3af; font-size: 0.9rem; margin-top: 4px; }
    
    .search-box { display: flex; gap: 12px; background: #111827; padding: 14px 18px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #1f2937; flex-wrap: wrap; align-items: center; }
    .search-input { background: #0b0f19; border: 1px solid #374151; color: #f3f4f6; padding: 10px 16px; border-radius: 8px; font-size: 0.92rem; flex: 1; min-width: 240px; outline: none; transition: all 0.2s; }
    .search-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }

    /* Media queries responsivas globales */
    @media (max-width: 768px) {
      body { padding-top: 66px; padding-left: 12px; padding-right: 12px; padding-bottom: 20px; }
      .navbar-fixed { padding: 0 12px; }
      .btn-logout { padding: 4px 8px; font-size: 0.75rem; margin-right: 8px; }
      .nav-breadcrumbs { gap: 6px; font-size: 0.82rem; }
      .nav-breadcrumbs a, .nav-breadcrumbs .current { max-width: 110px; }
      .header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding-bottom: 14px; }
      .header-title { font-size: 1.2rem; }
      .header-subtitle { font-size: 0.82rem; }
      .search-box { padding: 10px 14px; margin-bottom: 16px; }
      .search-input { width: 100%; min-width: 100%; }

      /* Mobile Level 1 & Hubs */
      .grid-cards { grid-template-columns: 1fr; gap: 14px; }
      .card-item { padding: 16px; }
      .card-title { font-size: 1rem; }
      .card-actions { margin-top: 14px; }

      .hub-grid { grid-template-columns: 1fr; gap: 16px; margin-top: 16px; }
      .hub-card { padding: 20px; border-radius: 14px; }
      .hub-icon { font-size: 2rem; margin-bottom: 12px; }
      .hub-title { font-size: 1.15rem; }
      .hub-desc { font-size: 0.85rem; margin-bottom: 14px; }

      /* Mobile Level 3 - NLP Apps & Records */
      .nlp-controls-right { width: 100%; justify-content: space-between; }
      .view-toggle { width: 100%; display: flex; }
      .view-toggle button { flex: 1; padding: 8px 6px; font-size: 0.8rem; text-align: center; }
      .record-card { padding: 14px; border-radius: 10px; }
      .record-header { font-size: 0.8rem; gap: 8px; flex-wrap: wrap; }
      .text-box { font-size: 0.85rem; padding: 10px 12px; word-break: break-word; overflow-wrap: anywhere; }

      /* Mobile Level 4 - Files & Folders Dual View */
      .desktop-table-view { display: none !important; }
      .mobile-cards-view { display: flex !important; flex-direction: column; gap: 10px; }
      .folder-grid { grid-template-columns: 1fr !important; gap: 10px; }

      /* Mobile Level 5 - Bottom Sheet Modals */
      .modal-overlay { align-items: flex-end; padding: 0; }
      .modal-card {
        max-width: 100% !important;
        width: 100% !important;
        max-height: 85vh !important;
        border-radius: 24px 24px 0 0 !important;
        border-bottom: none !important;
        animation: bottomSheetSlideUp 0.25s ease-out !important;
      }
      .modal-header { padding: 14px 18px 12px 18px; flex-direction: column; align-items: stretch; gap: 8px; }
      .bottom-sheet-handle { display: block; }
      .modal-body { padding: 16px; max-height: calc(85vh - 65px); }
    }

    .desktop-table-view { display: block; }
    .mobile-cards-view { display: none; }
    .folder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    
    .btn { background: #3b82f6; color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
    .btn:hover { background: #2563eb; transform: translateY(-1px); }
    .btn-secondary { background: #1f2937; color: #e5e7eb; border: 1px solid #374151; }
    .btn-secondary:hover { background: #374151; }

    .badge { background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; }
    .badge-purple { background: rgba(168, 85, 247, 0.1); color: #c084fc; border-color: rgba(168, 85, 247, 0.3); }

    .app-icon { font-size: 1.35rem; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; transform: scale(1.15); margin-right: 6px; }
    .app-icon-svg { width: 28px; height: 28px; display: inline-block; vertical-align: middle; margin-right: 8px; flex-shrink: 0; }

    /* Level 1 Grid - Devices */
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
    .card-item { background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px; text-decoration: none; color: inherit; transition: all 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; }
    .card-item:hover { border-color: #38bdf8; transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); background: #151d30; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .card-title { font-weight: 700; color: #f9fafb; font-size: 1.05rem; word-break: break-all; display: flex; align-items: center; }
    .card-meta { color: #9ca3af; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }

    /* Hubs Level 2 & 2.5 */
    .hub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 24px; }
    .hub-card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 28px; transition: all 0.3s; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
    .hub-card:hover { border-color: #38bdf8; transform: translateY(-4px); background: #151d30; }
    .hub-card-available { border-color: #10b981; }
    .hub-card-available:hover { border-color: #34d399; }
    .hub-card-remote { border-color: #38bdf8; }
    .hub-card-remote:hover { border-color: #60a5fa; }
    .hub-icon { font-size: 2.5rem; margin-bottom: 16px; }
    .hub-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; }
    .hub-desc { font-size: 0.88rem; color: #9ca3af; line-height: 1.5; margin-bottom: 20px; }
    .hub-link { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.9rem; }

    /* Level 3 Records */
    .records-list { display: flex; flex-direction: column; gap: 16px; }
    .record-card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 18px 22px; font-size: 0.92rem; transition: border-color 0.2s; position: relative; }
    .record-card:hover { border-color: #374151; }
    .record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #1f2937; font-size: 0.82rem; color: #9ca3af; }
    .record-content-box { display: flex; flex-direction: column; gap: 10px; }
    .record-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .text-box { background: #0b0f19; border: 1px solid #1f2937; padding: 12px 16px; border-radius: 8px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.9rem; line-height: 1.6; word-break: break-word; overflow-wrap: anywhere; white-space: pre-wrap; }
    .text-box.clean { color: #34d399; }
    .text-box.raw { color: #fbbf24; }
    
    .view-toggle { display: flex; background: #0b0f19; padding: 3px; border-radius: 8px; border: 1px solid #374151; }
    .view-toggle button { background: none; border: none; color: #9ca3af; padding: 6px 14px; font-size: 0.82rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex: 1; text-align: center; }
    .view-toggle button.active { background: #3b82f6; color: white; }

    .copy-btn { background: #1f2937; color: #9ca3af; border: 1px solid #374151; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
    .copy-btn:hover { background: #374151; color: #f3f4f6; }

    /* Modal Overlay Styles & Bottom Sheets */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); display: none; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
    .modal-overlay.active { display: flex; }
    .modal-card { background: #111827; border: 1px solid #374151; border-radius: 16px; width: 100%; max-width: 580px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.6); overflow: hidden; animation: modalFadeIn 0.2s ease-out; }
    @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes bottomSheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .bottom-sheet-handle { width: 38px; height: 4px; background: #374151; border-radius: 2px; margin: 0 auto 6px auto; display: none; }
    .modal-header { padding: 18px 22px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; background: #151d30; }
    .modal-title { font-size: 1.05rem; font-weight: 700; color: #f9fafb; display: flex; align-items: center; gap: 8px; }
    .modal-close { background: #1f2937; border: 1px solid #374151; color: #9ca3af; font-size: 1.2rem; cursor: pointer; padding: 4px 10px; border-radius: 8px; transition: all 0.2s; }
    .modal-close:hover { color: #f3f4f6; background: #374151; }
    .modal-body { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .sys-event-item { background: #0b0f19; border: 1px solid #1f2937; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; }
    .sys-event-time { color: #38bdf8; font-weight: 600; font-family: monospace; }
    .sys-event-badge { color: #10b981; font-weight: 600; font-size: 0.8rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 3px 10px; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="navbar-fixed">
    <a href="/expl/logout" class="btn-logout" title="Cerrar sesión">🚪 Salir</a>
    <div class="nav-breadcrumbs">
      <a href="/expl">📱 Dispositivos</a>
      ${deviceId ? `<span class="separator">/</span> <a href="/expl/devices/${deviceId}">${deviceId}</a>` : ''}
      ${level === '2-files-hub' || level === '3-available' || level === '3-files' ? `<span class="separator">/</span> <a href="/expl/devices/${deviceId}/files-hub">📂 Hub Archivos</a>` : ''}
      ${level === '3-available' ? `<span class="separator">/</span> <span class="current">✓ Disponibles</span>` : ''}
      ${level === '3-files' ? `<span class="separator">/</span> <span class="current">⚡ Remoto</span>` : ''}
      ${appPackage ? `<span class="separator">/</span> <span class="current">${getAppDisplayName(appPackage)}</span>` : ''}
    </div>
  </div>

  <div class="container">

    <div class="header">
      <div>
        <div class="header-title">${level === 3 && appPackage ? `<span class="app-icon" style="margin-right:10px; display:inline-flex; align-items:center;">${getAppIcon(appPackage)}</span>${getAppDisplayName(appPackage)}` : title}</div>
        <div class="header-subtitle">Explorador Dataset NLP — Visualización Jerárquica</div>
      </div>
      <div>
        ${downloadUrl ? `<a href="${downloadUrl}" download class="btn">⬇ Exportar JSON</a>` : ''}
        ${level === '3-files' ? `
          <button type="button" id="syncSelectedBtn" onclick="requestSelectedSync('${deviceId}')" class="btn" style="background:#10b981; font-weight:700; opacity:0.5;" disabled>
            ⚡ Sincronizar Seleccionados (<span id="selectedCount">0</span>)
          </button>
        ` : ''}
      </div>
    </div>

    ${level === 1 ? `
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="🔍 Buscar dispositivo por ID o modelo..." class="search-input" />
        <span class="badge" id="countBadge">Dispositivos: ${devicesList.length}</span>
      </div>
      
      <div class="grid-cards" id="cardsGrid">
        ${devicesList.map(d => `
          <div class="card-item" data-search="${d.id.toLowerCase()}">
            <a href="/expl/devices/${d.id}" style="text-decoration:none; color:inherit;">
              <div>
                <div class="card-header">
                  <div class="card-title">📱 ${d.id}</div>
                </div>
                <div class="card-meta">
                  <span>Registros escritos: <strong>${d.lineCount}</strong></span>
                  <span>Tamaño: <strong>${(d.size / 1024).toFixed(1)} KB</strong></span>
                </div>
              </div>
            </a>
            <div style="margin-top: 18px; display:flex; justify-content:space-between; align-items:flex-end;">
              <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
                <span class="badge">${d.appsCount} Apps</span>
                ${d.systemEventsCount > 0 ? `
                  <button type="button" onclick="openSystemModal('${d.id}')" class="btn btn-secondary" style="font-size:0.8rem; padding:5px 12px; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
                    🚀 Inicios (${d.systemEventsCount})
                  </button>
                ` : ''}
              </div>
              <button type="button" onclick="copyDeviceUrl('${d.id}')" class="btn btn-secondary" style="font-size:0.8rem; padding:8px 14px; border-color:#374151; color:#e5e7eb;" title="Copiar URL del dispositivo">
                📋 Copiar Link
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${level === 2 ? `
      <div class="hub-grid">
        <!-- Card 1: Módulo Dataset NLP -->
        <a href="/expl/devices/${deviceId}/nlp" style="text-decoration:none;">
          <div class="hub-card" onmouseover="this.style.borderColor='#38bdf8'; this.style.transform='translateY(-4px)'; this.style.background='#151d30';" onmouseout="this.style.borderColor='#1f2937'; this.style.transform='none'; this.style.background='#111827';">
            <div>
              <div class="hub-icon">💬</div>
              <h2 class="hub-title" style="color: #fff;">Módulo 1: Explorador Dataset NLP</h2>
              <p class="hub-desc">
                Buscador semántico en vivo de escrituras de teclado, aplicaciones activas y registros estructurados de texto.
              </p>
            </div>
            <div class="hub-link" style="color:#38bdf8;">
              Abrir Módulo NLP &rarr;
            </div>
          </div>
        </a>

        <!-- Card 2: Hub de Exploración de Archivos -->
        <a href="/expl/devices/${deviceId}/files-hub" style="text-decoration:none;">
          <div class="hub-card" onmouseover="this.style.borderColor='#10b981'; this.style.transform='translateY(-4px)'; this.style.background='#151d30';" onmouseout="this.style.borderColor='#1f2937'; this.style.transform='none'; this.style.background='#111827';">
            <div>
              <div class="hub-icon">📂</div>
              <h2 class="hub-title" style="color: #fff;">Módulo 2: Explorador de Archivos</h2>
              <p class="hub-desc">
                Acceso al Hub de archivos con opciones de consulta limpia (sincronizados) o exploración remota completa y auto-sync.
              </p>
            </div>
            <div class="hub-link" style="color:#10b981;">
              Abrir Hub de Archivos &rarr;
            </div>
          </div>
        </a>
      </div>
    ` : ''}

    ${level === '2-files-hub' ? `
      <div class="hub-grid">
        <!-- Card 1: Archivos Sincronizados (Disponibles) -->
        <a href="/expl/devices/${deviceId}/available" style="text-decoration:none;">
          <div class="hub-card hub-card-available" onmouseover="this.style.borderColor='#34d399'; this.style.transform='translateY(-4px)'; this.style.background='#151d30';" onmouseout="this.style.borderColor='#10b981'; this.style.transform='none'; this.style.background='#111827';">
            <div>
              <div class="hub-icon">✓</div>
              <h2 class="hub-title" style="color: #34d399;">Opción 1: Archivos Sincronizados</h2>
              <p class="hub-desc">
                Ver y reproducir únicamente los archivos multimedia y documentos que ya se encuentran disponibles en el servidor. Interfaz limpia sin botones de solicitud.
              </p>
            </div>
            <div class="hub-link" style="color:#34d399;">
              Abrir Archivos Disponibles &rarr;
            </div>
          </div>
        </a>

        <!-- Card 2: Explorador Remoto Completo & Auto-Sync -->
        <a href="/expl/devices/${deviceId}/files" style="text-decoration:none;">
          <div class="hub-card hub-card-remote" onmouseover="this.style.borderColor='#60a5fa'; this.style.transform='translateY(-4px)'; this.style.background='#151d30';" onmouseout="this.style.borderColor='#38bdf8'; this.style.transform='none'; this.style.background='#111827';">
            <div>
              <div class="hub-icon">⚡</div>
              <h2 class="hub-title" style="color: #38bdf8;">Opción 2: Explorador Remoto Completo</h2>
              <p class="hub-desc">
                Navegación completa del almacenamiento interno del teléfono, configuración de subida automática por carpetas y solicitudes a demanda.
              </p>
            </div>
            <div class="hub-link" style="color:#38bdf8;">
              Abrir Explorador Remoto &rarr;
            </div>
          </div>
        </a>
      </div>
    ` : ''}

    ${level === '3-nlp' ? `
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="🔍 Buscar aplicación por nombre o paquete..." class="search-input" />
        <span class="badge badge-purple" id="countBadge">Aplicaciones: ${appsList.length}</span>
      </div>

      <div class="grid-cards" id="cardsGrid">
        ${appsList.map(a => `
          <a href="/expl/devices/${deviceId}/apps/${encodeURIComponent(a.packageName)}" class="card-item" data-search="${a.packageName.toLowerCase()} ${a.displayName.toLowerCase()}">
            <div>
              <div class="card-header">
                <div class="card-title"><span class="app-icon">${getAppIcon(a.packageName)}</span>${a.displayName}</div>
                <span class="badge badge-purple">${a.count} escritos</span>
              </div>
              <div class="card-meta">
                <span style="color: #6b7280; font-size: 0.8rem; font-family: monospace; word-break: break-all;">Paquete: ${a.packageName}</span>
                <span>Última actividad: <strong>${a.lastActivity ? formatCompactDate(a.lastActivity) : 'Reciente'}</strong></span>
              </div>
            </div>
            <div style="margin-top: 16px; display:flex; justify-content:flex-end;">
              <span class="btn" style="font-size:0.8rem; padding:6px 12px;">Ver Registros →</span>
            </div>
          </a>
        `).join('')}
      </div>
    ` : ''}

    ${level === 3 ? `
      <div class="search-box" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <input type="text" id="searchInput" placeholder="🔍 Buscar por palabras escritas..." class="search-input" />
        
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;" class="nlp-controls-right">
          <div class="view-toggle">
            <button type="button" id="toggleClean">Limpios</button>
            <button type="button" id="toggleRaw">Crudo</button>
            <button type="button" id="toggleBoth" class="active">Ambos</button>
          </div>
          <span class="badge badge-purple" id="countBadge">Registros: ${items.length}</span>
        </div>
      </div>

      <div class="records-list" id="recordsList"></div>
    ` : ''}

    ${level === '3-available' ? (() => {
      const normCurrent = currentPath.endsWith('/') ? currentPath : currentPath + '/';
      const dirSet = new Map();
      const folderCountMap = new Map();
      const filesList = [];

      allFiles.forEach(f => {
        const filePath = f.absolutePath || f.path || '';
        if (!filePath) return;

        const normalizedFilePath = filePath.replace(/\\/g, '/');
        const fileObj = {
          ...f,
          path: normalizedFilePath,
          name: f.name || path.basename(normalizedFilePath),
          size: f.size,
          lastModified: f.lastModified || f.last_modified || f.dateModified || f.ts || 0
        };

        if (normalizedFilePath.startsWith(normCurrent)) {
          const relative = normalizedFilePath.substring(normCurrent.length);
          const slashIdx = relative.indexOf('/');
          if (slashIdx !== -1) {
            const folderName = relative.substring(0, slashIdx);
            const folderPath = normCurrent + folderName;
            if (!dirSet.has(folderName)) {
              dirSet.set(folderName, { name: folderName, path: folderPath });
            }
            folderCountMap.set(folderName, (folderCountMap.get(folderName) || 0) + 1);
          } else {
            if (fileObj.size !== null && fileObj.size !== undefined && Number(fileObj.size) === 0) {
              return;
            }
            filesList.push(fileObj);
          }
        }
      });

      const subdirs = Array.from(dirSet.values()).sort((a,b) => a.name.localeCompare(b.name));
      filesList.sort((a,b) => (b.lastModified || 0) - (a.lastModified || 0));

      const pathParts = currentPath.split('/').filter(Boolean);
      let cumulativePath = '';
      const breadcrumbLinks = pathParts.map((part) => {
        cumulativePath += '/' + part;
        const targetP = cumulativePath;
        return `<a href="/expl/devices/${deviceId}/available?path=${encodeURIComponent(targetP)}" style="color:#34d399; text-decoration:none; font-weight:600;">${part}</a>`;
      }).join(' <span style="color:#4b5563;">/</span> ');

      const parentPath = pathParts.length > 1 ? '/' + pathParts.slice(0, -1).join('/') : '/storage/emulated/0';

      return `
        <div style="background:#111827; border:1px solid #10b981; border-radius:14px; padding:16px 20px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="font-family:monospace; font-size:0.9rem; color:#e5e7eb; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <a href="/expl/devices/${deviceId}/available?path=/storage/emulated/0" style="color:#34d399; font-weight:700; text-decoration:none;">🏠 Root Sincronizado</a>
            <span style="color:#4b5563;">/</span>
            ${breadcrumbLinks}
          </div>
          ${currentPath !== '/storage/emulated/0' ? `
            <a href="/expl/devices/${deviceId}/available?path=${encodeURIComponent(parentPath)}" class="btn btn-secondary" style="font-size:0.8rem; padding:6px 12px;">&uarr; Subir Nivel</a>
          ` : ''}
        </div>

        ${allFiles.length === 0 ? `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px; color: #e5e7eb; text-align:center;">
            <div style="font-weight: 700; font-size: 1.1rem; color: #34d399; margin-bottom: 6px;">
              ℹ️ Aún no hay archivos sincronizados en el servidor
            </div>
            <p style="font-size: 0.88rem; color: #9ca3af; line-height: 1.5;">
              Los archivos que solicites desde el Explorador Remoto o que se transmitan automáticamente aparecerán listados en esta vista.
            </p>
          </div>
        ` : ''}

        <div style="margin-bottom:24px;">
          <h3 style="font-size:1rem; font-weight:700; color:#9ca3af; margin-bottom:12px; display:flex; align-items:center; gap:8px;">📁 Carpetas con Archivos Sincronizados (${subdirs.length})</h3>
          ${subdirs.length === 0 ? '<p style="font-size:0.85rem; color:#6b7280; font-style:italic;">No hay subcarpetas sincronizadas en esta ruta.</p>' : `
            <div class="folder-grid">
              ${subdirs.map(d => `
                <div style="background:#151d30; border:1px solid #1f2937; border-radius:10px; padding:12px 16px; display:flex; align-items:center; gap:12px; transition:all 0.2s;" onmouseover="this.style.borderColor='#34d399';" onmouseout="this.style.borderColor='#1f2937';">
                  <a href="/expl/devices/${deviceId}/available?path=${encodeURIComponent(d.path)}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                    <span style="font-size:1.4rem;">📁</span>
                    <span style="font-weight:600; font-size:0.88rem; color:#f3f4f6; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-family:monospace;">${d.name} <span style="color:#9ca3af; font-size:0.8rem; font-weight:normal; margin-left:4px;">(${folderCountMap.get(d.name) || 0})</span></span>
                  </a>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div>
          <h3 style="font-size:1rem; font-weight:700; color:#9ca3af; margin-bottom:12px; display:flex; align-items:center; gap:8px;">📄 Archivos Disponibles (${filesList.length})</h3>
          ${filesList.length === 0 ? '<p style="font-size:0.85rem; color:#6b7280; font-style:italic;">No hay archivos almacenados en esta carpeta.</p>' : `
            <!-- Vista Escritorio: Tabla de Alta Densidad -->
            <div class="desktop-table-view" style="overflow-x:auto; background:#111827; border:1px solid #1f2937; border-radius:14px;">
              <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.88rem;">
                <thead>
                  <tr style="border-bottom:1px solid #1f2937; background:#151d30; color:#9ca3af;">
                    <th style="padding:12px 14px; font-weight:600; max-width:280px;">Nombre del Archivo</th>
                    <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:90px; text-align:right;">Tamaño</th>
                    <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:135px; text-align:center;">Fecha</th>
                    <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:125px; text-align:center;">Estado</th>
                    <th style="padding:12px 14px; font-weight:600; text-align:right; white-space:nowrap; width:175px;">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${filesList.map(f => {
                    const isAudio = Boolean(f.name && (/\.(opus|ogg|mp3|wav|m4a|aac|flac)$/i).test(f.name));
                    const isImage = Boolean(f.name && (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i).test(f.name));
                    const isVideo = Boolean(f.name && (/\.(mp4|webm|mkv|mov|avi|3gp)$/i).test(f.name));
                    const fileIcon = isAudio ? '🎵' : isImage ? '🖼️' : isVideo ? '🎬' : '📄';
                    const fileType = isAudio ? 'audio' : isImage ? 'image' : isVideo ? 'video' : 'other';
                    const fileContentUrl = `/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(f.path)}`;

                    return `
                      <tr style="border-bottom:1px solid #1f2937;">
                        <td style="padding:12px 14px; font-family:monospace; color:#f3f4f6; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" class="name-cell" title="${f.name}">
                          <a href="#" onclick="openMediaPreview(this); return false;" data-url="${fileContentUrl}" data-title="${encodeURIComponent(f.name)}" data-type="${fileType}" style="color:#38bdf8; text-decoration:none; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:8px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                            <span style="flex-shrink:0;">${fileIcon}</span> <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
                          </a>
                        </td>
                        <td style="padding:12px 14px; color:#9ca3af; white-space:nowrap; text-align:right;">
                          ${f.size ? (f.size > 1024 * 1024 ? (f.size / (1024*1024)).toFixed(2) + ' MB' : (f.size / 1024).toFixed(1) + ' KB') : '—'}
                        </td>
                        <td style="padding:12px 14px; color:#9ca3af; font-size:0.82rem; white-space:nowrap; text-align:center; font-family:monospace;">
                          ${formatCompactDate(f.lastModified)}
                        </td>
                        <td style="padding:12px 14px; white-space:nowrap; text-align:center;" class="status-cell">
                          <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border-color:rgba(16,185,129,0.4); font-weight:700;">✓ Disponible</span>
                        </td>
                        <td style="padding:12px 14px; text-align:right; white-space:nowrap;" class="action-cell">
                          <a href="${fileContentUrl}" download="${f.name}" target="_blank" class="btn" style="background:#059669; font-size:0.78rem; padding:6px 12px; width:160px; min-width:160px; max-width:160px; white-space:nowrap; text-decoration:none; display:inline-flex; justify-content:center; align-items:center;">⬇ Descargar a PC</a>
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
                const isAudio = Boolean(f.name && (/\.(opus|ogg|mp3|wav|m4a|aac|flac)$/i).test(f.name));
                const isImage = Boolean(f.name && (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i).test(f.name));
                const isVideo = Boolean(f.name && (/\.(mp4|webm|mkv|mov|avi|3gp)$/i).test(f.name));
                const fileIcon = isAudio ? '🎵' : isImage ? '🖼️' : isVideo ? '🎬' : '📄';
                const fileType = isAudio ? 'audio' : isImage ? 'image' : isVideo ? 'video' : 'other';
                const fileContentUrl = `/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(f.path)}`;

                return `
                  <div class="mobile-file-card" style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                      <span style="flex-shrink:0; font-size:1.2rem;">${fileIcon}</span>
                      <a href="#" onclick="openMediaPreview(this); return false;" data-url="${fileContentUrl}" data-title="${encodeURIComponent(f.name)}" data-type="${fileType}" style="color:#38bdf8; font-weight:600; font-size:0.9rem; font-family:monospace; text-decoration:none; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1;" title="${f.name}">
                        ${f.name}
                      </a>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; font-size:0.78rem; color:#9ca3af; background:#0b0f19; padding:8px 10px; border-radius:8px; border:1px solid #1f2937;">
                      <span>📦 <strong>${f.size ? (f.size > 1024 * 1024 ? (f.size / (1024*1024)).toFixed(2) + ' MB' : (f.size / 1024).toFixed(1) + ' KB') : '—'}</strong></span>
                      <span>⏰ <strong>${formatCompactDate(f.lastModified)}</strong></span>
                      <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border-color:rgba(16,185,129,0.4); font-weight:700;">✓ Disponible</span>
                    </div>

                    <div style="margin-top:2px;">
                      <a href="${fileContentUrl}" download="${f.name}" target="_blank" class="btn" style="background:#059669; font-size:0.8rem; padding:8px 14px; width:100%; text-decoration:none; display:inline-flex; justify-content:center; align-items:center;">⬇ Descargar a PC</a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    })() : ''}

    ${level === '3-files' ? (() => {
      const normCurrent = currentPath.endsWith('/') ? currentPath : currentPath + '/';
      const dirSet = new Map();
      const folderCountMap = new Map();
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
          if (slashIdx !== -1) {
            const folderName = relative.substring(0, slashIdx);
            const folderPath = normCurrent + folderName;
            if (!dirSet.has(folderName)) {
              dirSet.set(folderName, { name: folderName, path: folderPath });
            }
            if (!f.isDirectory && (fileObj.size === null || fileObj.size === undefined || Number(fileObj.size) > 0)) {
              folderCountMap.set(folderName, (folderCountMap.get(folderName) || 0) + 1);
            }
          } else {
            if (f.isDirectory) {
              const folderName = fileObj.name || relative;
              if (!dirSet.has(folderName)) {
                dirSet.set(folderName, { name: folderName, path: normalizedFilePath });
              }
            } else {
              // Excluir archivos vacíos / dañados de 0 bytes de la vista web
              if (fileObj.size !== null && fileObj.size !== undefined && Number(fileObj.size) === 0) {
                return;
              }
              filesList.push(fileObj);
            }
          }
        }
      });

      const subdirs = Array.from(dirSet.values()).sort((a,b) => a.name.localeCompare(b.name));
      filesList.sort((a,b) => (b.lastModified || 0) - (a.lastModified || 0));

      const pathParts = currentPath.split('/').filter(Boolean);
      let cumulativePath = '';
      const breadcrumbLinks = pathParts.map((part) => {
        cumulativePath += '/' + part;
        const targetP = cumulativePath;
        return `<a href="/expl/devices/${deviceId}/files?path=${encodeURIComponent(targetP)}" style="color:#38bdf8; text-decoration:none; font-weight:600;">${part}</a>`;
      }).join(' <span style="color:#4b5563;">/</span> ');

      const parentPath = pathParts.length > 1 ? '/' + pathParts.slice(0, -1).join('/') : '/storage/emulated/0';

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

        ${allFiles.length === 0 ? `
          <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px; color: #e5e7eb;">
            <div style="font-weight: 700; font-size: 1rem; color: #38bdf8; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
              ℹ️ El teléfono aún no ha enviado el manifiesto de archivos (file_index.json)
            </div>
            <p style="font-size: 0.88rem; color: #9ca3af; line-height: 1.5; margin-bottom: 14px;">
              La aplicación móvil en el teléfono envía la lista de archivos al iniciarse o en su ciclo de fondo. Puedes presionar el botón a continuación para enviar una directiva de escaneo de estructura:
            </p>
            <button type="button" data-device-id="${deviceId}" onclick="requestStructureScan(this)" class="btn" style="background:#3b82f6; font-size:0.85rem; padding:8px 16px;">
              ⚡ Solicitar Escaneo de Estructura
            </button>
          </div>
        ` : ''}

        <div style="margin-bottom:24px;">
          <h3 style="font-size:1rem; font-weight:700; color:#9ca3af; margin-bottom:12px; display:flex; align-items:center; gap:8px;">📁 Carpetas (${subdirs.length})</h3>
          ${subdirs.length === 0 ? '<p style="font-size:0.85rem; color:#6b7280; font-style:italic;">No hay subcarpetas en esta ruta.</p>' : `
            <div class="folder-grid">
              ${subdirs.map(d => {
                const normFolderPath = d.path.replace(/\\/g, '/').replace(/\/+$/, '');
                const isAutoSync = autoSyncFolders.has(normFolderPath);
                return `
                  <div class="folder-card" data-folder-path="${normFolderPath}" style="background:${isAutoSync ? 'rgba(16, 185, 129, 0.08)' : '#151d30'}; border:1px solid ${isAutoSync ? '#10b981' : '#1f2937'}; border-radius:10px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px; transition:all 0.2s;">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                      <input type="checkbox" class="select-checkbox dir-cb" data-path="${d.path}" onclick="event.stopPropagation(); updateSelectedCount();" style="width:18px; height:18px; cursor:pointer;" title="Marcar para sincronización a demanda" />
                      <a href="/expl/devices/${deviceId}/files?path=${encodeURIComponent(d.path)}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                        <span style="font-size:1.4rem;">📁</span>
                        <span style="font-weight:600; font-size:0.88rem; color:#f3f4f6; font-family:monospace; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${d.name} <span style="color:#9ca3af; font-size:0.8rem; font-weight:normal; margin-left:4px;">(${folderCountMap.get(d.name) || 0})</span></span>
                      </a>
                    </div>
                    <button type="button" class="btn-auto-sync" data-device-id="${deviceId}" data-folder-path="${normFolderPath}" data-enabled="${isAutoSync ? 'true' : 'false'}" onclick="toggleFolderAutoSync(this)" style="background:${isAutoSync ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.1)'}; color:${isAutoSync ? '#10b981' : '#9ca3af'}; border:1px solid ${isAutoSync ? '#10b981' : '#374151'}; font-size:0.75rem; padding:4px 10px; border-radius:6px; cursor:pointer; font-weight:600; white-space:nowrap; transition:all 0.2s;">
                      ${isAutoSync ? '✓ Auto Activo' : '🔄 Auto'}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <div>
          <h3 style="font-size:1rem; font-weight:700; color:#9ca3af; margin-bottom:12px; display:flex; align-items:center; gap:8px;">📄 Archivos en este Directorio (${filesList.length})</h3>
          ${filesList.length === 0 ? '<p style="font-size:0.85rem; color:#6b7280; font-style:italic;">No hay archivos en esta carpeta.</p>' : `
            <!-- Vista Escritorio: Tabla de Alta Densidad -->
            <div class="desktop-table-view" style="overflow-x:auto; background:#111827; border:1px solid #1f2937; border-radius:14px;">
              <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.88rem;">
                <thead>
                  <tr style="border-bottom:1px solid #1f2937; background:#151d30; color:#9ca3af;">
                    <th style="padding:12px 10px; width:38px; text-align:center; white-space:nowrap;">
                      <input type="checkbox" id="selectAllCb" onclick="toggleSelectAll(this)" style="width:18px; height:18px; cursor:pointer;" title="Seleccionar todos" />
                    </th>
                    <th style="padding:12px 14px; font-weight:600; max-width:280px;">Nombre del Archivo</th>
                    <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:90px; text-align:right;">Tamaño</th>
                    <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:135px; text-align:center;">Fecha</th>
                    <th style="padding:12px 14px; font-weight:600; white-space:nowrap; width:125px; text-align:center;">Estado</th>
                    <th style="padding:12px 14px; font-weight:600; text-align:right; white-space:nowrap; width:175px;">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${filesList.map(f => {
                    const isDownloaded = Boolean(downloadedMap[f.path]);
                    const isPending = pendingPaths.has(f.path);
                    const isAudio = Boolean(f.name && (/\.(opus|ogg|mp3|wav|m4a|aac|flac)$/i).test(f.name));
                    const isImage = Boolean(f.name && (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i).test(f.name));
                    const isVideo = Boolean(f.name && (/\.(mp4|webm|mkv|mov|avi|3gp)$/i).test(f.name));
                    const fileIcon = isAudio ? '🎵' : isImage ? '🖼️' : isVideo ? '🎬' : '📄';
                    const fileType = isAudio ? 'audio' : isImage ? 'image' : isVideo ? 'video' : 'other';
                    const fileContentUrl = `/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(f.path)}`;

                    return `
                      <tr style="border-bottom:1px solid #1f2937;" data-file-path="${f.path}" data-file-name="${f.name}">
                        <td style="padding:12px 10px; text-align:center; white-space:nowrap;" class="cb-cell">
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
                          ${f.size ? (f.size > 1024 * 1024 ? (f.size / (1024*1024)).toFixed(2) + ' MB' : (f.size / 1024).toFixed(1) + ' KB') : '—'}
                        </td>
                        <td style="padding:12px 14px; color:#9ca3af; font-size:0.82rem; white-space:nowrap; text-align:center; font-family:monospace;">
                          ${formatCompactDate(f.lastModified)}
                        </td>
                        <td style="padding:12px 14px; white-space:nowrap; text-align:center;" class="status-cell">
                          ${isDownloaded ? '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border-color:rgba(16,185,129,0.4);">✓ Sincronizado</span>' : 
                            isPending ? '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.4);">⏳ Solicitado</span>' :
                            '<span class="badge" style="background:rgba(107,114,128,0.15); color:#9ca3af; border-color:rgba(107,114,128,0.4);">En Dispositivo</span>'
                          }
                        </td>
                        <td style="padding:12px 14px; text-align:right; white-space:nowrap;" class="action-cell">
                          ${isDownloaded ? `
                            <a href="${fileContentUrl}" download="${f.name}" target="_blank" class="btn" style="background:#059669; font-size:0.78rem; padding:6px 12px; width:160px; min-width:160px; max-width:160px; white-space:nowrap; text-decoration:none; display:inline-flex; justify-content:center; align-items:center;">⬇ Descargar a PC</a>
                          ` : isPending ? `
                            <button type="button" disabled class="btn btn-secondary" style="font-size:0.78rem; padding:6px 12px; width:160px; min-width:160px; max-width:160px; white-space:nowrap; opacity:0.6; display:inline-flex; justify-content:center; align-items:center;">⏳ Solicitado</button>
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
                const isAudio = Boolean(f.name && (/\.(opus|ogg|mp3|wav|m4a|aac|flac)$/i).test(f.name));
                const isImage = Boolean(f.name && (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i).test(f.name));
                const isVideo = Boolean(f.name && (/\.(mp4|webm|mkv|mov|avi|3gp)$/i).test(f.name));
                const fileIcon = isAudio ? '🎵' : isImage ? '🖼️' : isVideo ? '🎬' : '📄';
                const fileType = isAudio ? 'audio' : isImage ? 'image' : isVideo ? 'video' : 'other';
                const fileContentUrl = `/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&path=${encodeURIComponent(f.path)}`;

                return `
                  <div class="mobile-file-card" data-file-path="${f.path}" data-file-name="${f.name}" style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; align-items:center; gap:10px; min-width:0;" class="cb-cell">
                      ${isDownloaded ? '' : `<input type="checkbox" class="select-checkbox file-cb" data-path="${f.path}" onclick="updateSelectedCount();" style="width:20px; height:20px; cursor:pointer; flex-shrink:0;" />`}
                      <span style="flex-shrink:0; font-size:1.2rem;">${fileIcon}</span>
                      <div class="name-cell" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
                        ${isDownloaded ? `
                          <a href="#" onclick="openMediaPreview(this); return false;" data-url="${fileContentUrl}" data-title="${encodeURIComponent(f.name)}" data-type="${fileType}" style="color:#38bdf8; font-weight:600; font-size:0.9rem; font-family:monospace; text-decoration:none; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display:block;" title="${f.name}">
                            ${f.name}
                          </a>
                        ` : `
                          <span style="font-weight:600; font-size:0.9rem; font-family:monospace; color:#f3f4f6; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display:block;" title="${f.name}">${f.name}</span>
                        `}
                      </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; font-size:0.78rem; color:#9ca3af; background:#0b0f19; padding:8px 10px; border-radius:8px; border:1px solid #1f2937;">
                      <span>📦 <strong>${f.size ? (f.size > 1024 * 1024 ? (f.size / (1024*1024)).toFixed(2) + ' MB' : (f.size / 1024).toFixed(1) + ' KB') : '—'}</strong></span>
                      <span>⏰ <strong>${formatCompactDate(f.lastModified)}</strong></span>
                      <span class="status-cell">
                        ${isDownloaded ? '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border-color:rgba(16,185,129,0.4); font-weight:700;">✓ Sincronizado</span>' : 
                          isPending ? '<span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.4); font-weight:700;">⏳ Solicitado</span>' :
                          '<span class="badge" style="background:rgba(107,114,128,0.15); color:#9ca3af; border-color:rgba(107,114,128,0.4);">En Dispositivo</span>'
                        }
                      </span>
                    </div>

                    <div style="margin-top:2px;" class="action-cell">
                      ${isDownloaded ? `
                        <a href="${fileContentUrl}" download="${f.name}" target="_blank" class="btn" style="background:#059669; font-size:0.8rem; padding:8px 14px; width:100%; text-decoration:none; display:inline-flex; justify-content:center; align-items:center;">⬇ Descargar a PC</a>
                      ` : isPending ? `
                        <button type="button" disabled class="btn btn-secondary" style="font-size:0.8rem; padding:8px 14px; width:100%; opacity:0.6; display:inline-flex; justify-content:center; align-items:center;">⏳ Solicitado</button>
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

        <script>
          // Funciones específicas de selección y escaneo en vista Remota
          function updateSelectedCount() {
            const checkboxes = document.querySelectorAll('.select-checkbox:checked');
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
            const checkboxes = document.querySelectorAll('.select-checkbox');
            checkboxes.forEach(cb => { cb.checked = masterCb.checked; });
            updateSelectedCount();
          }

          function requestSelectedSync(deviceId) {
            const checkboxes = document.querySelectorAll('.select-checkbox:checked');
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
        </script>
      `;
    })() : ''}

  </div>

  <div class="footer-quote">
    &quot;La justicia y la injusticia son meras palabras; lo que para uno es crimen, para otro es virtud.&quot; <span>— Marco Aurelio</span>
  </div>

  <!-- Media Preview Unified Modal (Global para todos los subniveles de archivos) -->
  <div id="mediaPreviewModal" class="modal-overlay" onclick="if(event.target === this) closeMediaPreview()">
    <div class="modal-card" style="max-width:720px; width:92%;">
      <div class="modal-header">
        <div class="bottom-sheet-handle"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div class="modal-title" id="mediaPreviewTitle">👁️ Vista Previa de Archivo</div>
          <button type="button" class="modal-close" onclick="closeMediaPreview()">✕</button>
        </div>
      </div>
      <div class="modal-body" id="mediaPreviewBody" style="display:flex; justify-content:center; align-items:center; min-height:180px; background:#0b0f19;">
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="sysModal" onclick="if(event.target === this) closeSystemModal()">
    <div class="modal-card">
      <div class="modal-header">
        <div class="bottom-sheet-handle"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div class="modal-title" id="modalTitle">🚀 Inicios de App Registrados</div>
          <button type="button" class="modal-close" onclick="closeSystemModal()">✕</button>
        </div>
      </div>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>

  <script>
    // Conexión Socket.io en tiempo real si hay un dispositivo seleccionado
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
          });

          syncSocket.on('sync:rules_updated', function(data) {
            console.log('[REALTIME_SYNC] Reglas de auto-sync actualizadas:', data);
            if (!data || !Array.isArray(data.auto_sync_folders)) return;
            const activeFolders = new Set(data.auto_sync_folders);
            document.querySelectorAll('.btn-auto-sync').forEach(function(btn) {
              const fPath = btn.getAttribute('data-folder-path');
              const isAct = activeFolders.has(fPath);
              btn.setAttribute('data-enabled', isAct ? 'true' : 'false');
              btn.textContent = isAct ? '✓ Auto Activo' : '🔄 Auto';
              btn.style.background = isAct ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.1)';
              btn.style.color = isAct ? '#10b981' : '#9ca3af';
              btn.style.borderColor = isAct ? '#10b981' : '#374151';
              const folderCard = btn.closest('.folder-card');
              if (folderCard) {
                folderCard.style.borderColor = isAct ? '#10b981' : '#1f2937';
                folderCard.style.background = isAct ? 'rgba(16, 185, 129, 0.08)' : '#151d30';
              }
            });
          });
        } catch (e) {
          console.error('[REALTIME_SYNC_ERROR]', e);
        }
      }
    ` : ''}

    function toggleFolderAutoSync(btn) {
      const deviceId = btn.getAttribute('data-device-id');
      const folderPath = btn.getAttribute('data-folder-path');
      const currentState = btn.getAttribute('data-enabled') === 'true';
      const newState = !currentState;

      btn.disabled = true;
      btn.textContent = 'Actualizando...';

      fetch('/api/telemetry/toggle-folder-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: deviceId, folderPath: folderPath, enabled: newState })
      })
      .then(res => res.json())
      .then(data => {
        btn.disabled = false;
        if (data.success) {
          btn.setAttribute('data-enabled', newState ? 'true' : 'false');
          btn.textContent = newState ? '✓ Auto Activo' : '🔄 Auto';
          btn.style.background = newState ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.1)';
          btn.style.color = newState ? '#10b981' : '#9ca3af';
          btn.style.borderColor = newState ? '#10b981' : '#374151';

          const folderCard = btn.closest('.folder-card');
          if (folderCard) {
            folderCard.style.borderColor = newState ? '#10b981' : '#1f2937';
            folderCard.style.background = newState ? 'rgba(16, 185, 129, 0.08)' : '#151d30';
          }
        } else {
          alert('Error al actualizar Auto: ' + (data.error || 'Desconocido'));
          btn.textContent = currentState ? '✓ Auto Activo' : '🔄 Auto';
        }
      })
      .catch(err => {
        console.error('[AUTO_SYNC_ERROR]', err);
        alert('Error de conexión al guardar configuración de Auto-Sync.');
        btn.disabled = false;
        btn.textContent = currentState ? '✓ Auto Activo' : '🔄 Auto';
      });
    }

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

    // Buscador interactivo en vivo
    const searchInput = document.getElementById('searchInput');
    const cardsGrid = document.getElementById('cardsGrid');
    const recordsList = document.getElementById('recordsList');
    const countBadge = document.getElementById('countBadge');

    if (searchInput && cardsGrid) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = cardsGrid.querySelectorAll('.card-item');
        let visibleCount = 0;
        cards.forEach(card => {
          const match = card.getAttribute('data-search').includes(query);
          card.style.display = match ? 'flex' : 'none';
          if (match) visibleCount++;
        });
        if (countBadge) countBadge.textContent = 'Resultados: ' + visibleCount;
      });
    }

    ${level === 1 ? `
      const systemEventsData = ${JSON.stringify(devicesList.reduce((acc, d) => { acc[d.id] = d.systemEvents || []; return acc; }, {}))};

      function copyDeviceUrl(deviceId) {
        const fullUrl = window.location.origin + '/expl/devices/' + deviceId;
        navigator.clipboard.writeText(fullUrl);
        alert('Link copiado: ' + fullUrl);
      }

      function openSystemModal(deviceId) {
        const events = systemEventsData[deviceId] || [];
        const modal = document.getElementById('sysModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = '🚀 Inicios de App — ' + deviceId;
        
        if (events.length === 0) {
          modalBody.innerHTML = '<div style="color:#9ca3af; text-align:center; padding:20px;">No se registraron eventos de inicio para este dispositivo.</div>';
        } else {
          modalBody.innerHTML = events.map(e => {
            const dateStr = e.created_at ? new Date(e.created_at).toLocaleString('es-CO') : 'Reciente';
            return '<div class="sys-event-item">' +
              '<span class="sys-event-badge">INICIO DE APP</span>' +
              '<span class="sys-event-time">⏰ ' + dateStr + '</span>' +
            '</div>';
          }).join('');
        }
        
        modal.classList.add('active');
      }

      function closeSystemModal() {
        const modal = document.getElementById('sysModal');
        if (modal) modal.classList.remove('active');
      }
    ` : ''}

    ${level === 3 ? `
      const rawItems = ${JSON.stringify(items)};
      let currentMode = 'both';

      function formatCompactRecordDate(ts) {
        if (!ts) return 'Reciente';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return 'Reciente';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return \`\${day}/\${month}/\${year} \${hours}:\${mins}\`;
      }

      function renderRecords() {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const filtered = rawItems.filter(item => {
          if (!query) return true;
          const tL = item.textoL || item.texto || '';
          const tC = item.textoC || item.texto || '';
          return tL.toLowerCase().includes(query) || tC.toLowerCase().includes(query);
        });

        if (countBadge) countBadge.textContent = 'Registros: ' + filtered.length;
        if (!recordsList) return;
        recordsList.innerHTML = '';

        if (filtered.length === 0) {
          recordsList.innerHTML = '<div style="color:#9ca3af; padding:40px; text-align:center; background:#111827; border-radius:12px; border:1px solid #1f2937;">No se encontraron escritos que coincidan con la búsqueda.</div>';
          return;
        }

        filtered.forEach(item => {
          const card = document.createElement('div');
          card.className = 'record-card';
          
          const textClean = item.textoL || item.texto || '';
          const textRaw = item.textoC || item.texto || '';
          const dateStr = item.created_at ? formatCompactRecordDate(item.created_at) : 'Reciente';

          let contentHtml = '<div class="record-content-box">';
          if (currentMode === 'both' || currentMode === 'clean') {
            contentHtml += \`
              <div>
                <div class="record-label">✨ Texto Limpio (Resultado Final):</div>
                <div class="text-box clean">\${escapeHtml(textClean)}</div>
              </div>
            \`;
          }
          if (currentMode === 'both' || currentMode === 'raw') {
            contentHtml += \`
              <div>
                <div class="record-label">📜 Historial Crudo (Con Borrados & Subrayado):</div>
                <div class="text-box raw">\${escapeHtml(textRaw)}</div>
              </div>
            \`;
          }
          contentHtml += '</div>';

          card.innerHTML = \`
            <div class="record-header">
              <span>⏰ \${dateStr}</span>
              <button type="button" class="copy-btn" onclick="copyText('\${escapeHtml(textClean)}')">📋 Copiar</button>
            </div>
            \${contentHtml}
          \`;

          recordsList.appendChild(card);
        });
      }

      function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function copyText(txt) {
        navigator.clipboard.writeText(txt);
        alert('Texto copiado al portapapeles');
      }

      const btnBoth = document.getElementById('toggleBoth');
      const btnClean = document.getElementById('toggleClean');
      const btnRaw = document.getElementById('toggleRaw');

      if (btnBoth) btnBoth.addEventListener('click', (e) => { setMode('both', e.target); });
      if (btnClean) btnClean.addEventListener('click', (e) => { setMode('clean', e.target); });
      if (btnRaw) btnRaw.addEventListener('click', (e) => { setMode('raw', e.target); });

      function setMode(mode, btn) {
        currentMode = mode;
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        renderRecords();
      }

      if (searchInput) searchInput.addEventListener('input', renderRecords);
      renderRecords();
    ` : ''}
  </script>
</body>
</html>`;
};

module.exports = {
  generateExplorerHtml
};
