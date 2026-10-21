/**
 * Shell maestro de presentación para Ver Media (/expl/ver)
 */
const { getVerStyles } = require('./stylesVer');
const { ICONS } = require('./icons');

function renderVerLayout({
  title = 'Ver Media',
  deviceId = '',
  username = '',
  contentHtml = '',
  scriptsHtml = ''
}) {
  const styles = getVerStyles();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230b0f19'/%3E%3Cpath d='M3 16s5.5-9 13-9 13 9 13 9-5.5 9-13 9S3 16 3 16z' fill='none' stroke='%2338bdf8' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='16' cy='16' r='4.5' fill='%2338bdf8'/%3E%3Ccircle cx='17.5' cy='14.5' r='1.5' fill='%23ffffff'/%3E%3C/svg%3E">
  <link rel="alternate icon" href="https://trendy.sytes.net/favicon.ico">
  <style>
${styles}
  </style>
</head>
<body>
  <div class="app-viewport">
    <!-- Top Bar Sticky con Buscador por Fecha y Tag -->
    <header class="top-bar">
      <div class="top-search-section" id="topSearchContainer">
        <div class="top-search-bar">
          <input type="text" id="topSearchTag" class="top-search-input" placeholder="Buscar por tag o texto..." onkeydown="if(event.key==='Enter') executeTopSearch()" />
          <div id="activeDateBadgeContainer" style="display:none;"></div>
          <button type="button" id="btnClearTopSearch" class="btn-clear-search" onclick="clearTopSearch()" title="Limpiar busqueda" style="display:none;">&times;</button>
        </div>
        <div class="top-date-group">
          <input type="date" id="topSearchDate" class="top-date-hidden" onchange="onDateSelected(this.value)" />
          <button type="button" class="btn-calendar-trigger" onclick="openCalendarPicker()" title="Buscar por calendario">
            ${ICONS.calendar}
          </button>
        </div>
        <button type="button" class="btn-search-trigger" onclick="executeTopSearch()" title="Iniciar busqueda">
          ${ICONS.search}
        </button>
      </div>
      <!-- Barra de Busqueda Superior para Contactos con Boton de Envio al Lado -->
      <div class="top-search-section" id="topSearchContactsContainer" style="display:none;">
        <div class="top-search-bar">
          <input type="text" id="contactsTopSearchInput" class="top-search-input" placeholder="Buscar contacto por nombre o numero..." oninput="onContactsTopSearchInput(this.value)" onkeydown="if(event.key==='Enter') executeContactsSearch()" />
          <button type="button" id="btnClearContactsSearch" class="btn-clear-search" onclick="clearContactsTopSearch()" title="Limpiar busqueda" style="display:none;">&times;</button>
        </div>
        <button type="button" class="btn-top-search-submit" onclick="executeContactsSearch()" title="Enviar busqueda">
          ${ICONS.search}
          <span>Buscar</span>
        </button>
      </div>
      <!-- Barra de Busqueda Superior para NLP con Boton de Envio al Lado -->
      <div class="top-search-section" id="topSearchNlpContainer" style="display:none;">
        <div class="top-search-bar">
          <input type="text" id="nlpTopSearchInput" class="top-search-input" placeholder="Buscar aplicacion o paquete..." oninput="onNlpTopSearchInput(this.value)" onkeydown="if(event.key==='Enter') executeNlpSearch()" />
          <button type="button" id="btnClearNlpSearch" class="btn-clear-search" onclick="clearNlpTopSearch()" title="Limpiar busqueda" style="display:none;">&times;</button>
        </div>
        <button type="button" class="btn-top-search-submit" onclick="executeNlpSearch()" title="Enviar busqueda">
          ${ICONS.search}
          <span>Buscar</span>
        </button>
      </div>
      <div class="top-bar-title" id="topBarTitle" style="display:none; font-weight:800; font-size:1.05rem; color:#ffffff; padding-left:4px;">Ver Media</div>
      <div class="top-bar-right">
        <a href="/expl/ver/logout" title="Cerrar Sesion" style="color:#ef4444; display:flex; align-items:center; text-decoration:none; padding:4px;">${ICONS.logout}</a>
      </div>
    </header>

    <!-- Main Content Container -->
    <main id="mainContent" style="flex:1;">
      ${contentHtml}
    </main>

    <!-- Barra de Navegación Fija Inferior -->
    <nav class="bottom-nav">
      <button type="button" class="nav-tab active" id="tabFeed" onclick="switchMainTab('feed')">
        <span class="nav-tab-icon">${ICONS.home}</span>
        <span>Feed</span>
      </button>
      <button type="button" class="nav-tab" id="tabFavorites" onclick="switchMainTab('favorites')">
        <span class="nav-tab-icon">${ICONS.starOutline}</span>
        <span>Favoritos</span>
      </button>
      <button type="button" class="nav-tab" id="tabContacts" onclick="switchMainTab('contacts')">
        <span class="nav-tab-icon">${ICONS.contacts}</span>
        <span>Contactos</span>
      </button>
      <button type="button" class="nav-tab" id="tabNlp" onclick="switchMainTab('nlp')">
        <span class="nav-tab-icon">${ICONS.nlpDataset}</span>
        <span>NLP</span>
      </button>
      <button type="button" class="nav-tab" id="tabExplore" onclick="switchMainTab('explore')">
        <span class="nav-tab-icon">${ICONS.tag}</span>
        <span>Etiquetas</span>
      </button>
    </nav>

    <!-- Modal Tactil de Etiquetado y Catalogacion -->
    <div id="tagModalOverlay" class="modal-overlay" onclick="if(event.target === this) closeTagModal()">
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:1rem; font-weight:700; color:#fff;">Catalogar Contenido</h3>
          <button type="button" onclick="closeTagModal()" style="background:transparent; border:none; color:#9ca3af; font-size:1.2rem; cursor:pointer;">&times;</button>
        </div>
        
        <div>
          <label style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#9ca3af; display:block; margin-bottom:6px;">
            Etiquetas (separadas por coma)
          </label>
          <input type="text" id="tagInput" placeholder="familia, trabajo, importante..." style="width:100%; background:#0b0f19; border:1px solid #374151; border-radius:8px; padding:10px 12px; color:#fff; font-size:0.9rem; outline:none;" />
        </div>

        <div>
          <label style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#9ca3af; display:block; margin-bottom:6px;">
            Nota / Descripcion
          </label>
          <textarea id="notesInput" rows="3" placeholder="Anade una descripcion o detalle para recordar..." style="width:100%; background:#0b0f19; border:1px solid #374151; border-radius:8px; padding:10px 12px; color:#fff; font-size:0.9rem; outline:none; resize:none;"></textarea>
        </div>

        <button type="button" onclick="submitTagModal()" style="width:100%; background:linear-gradient(90deg, #ec4899, #8b5cf6); border:none; border-radius:8px; color:#fff; font-weight:700; font-size:0.9rem; padding:11px; cursor:pointer;">
          Guardar Catalogacion
        </button>
      </div>
    </div>

    <!-- Popup Modal de Visualizacion Multimedia para Favoritos -->
    <div id="mediaPopupModal" class="media-popup-overlay" onclick="if(event.target === this) closeMediaPopup()">
      <div class="media-popup-container">
        <div class="media-popup-header">
          <div class="media-popup-meta">
            <span class="media-popup-title" id="popupMediaTitle">Contenido</span>
            <span class="app-source-badge" id="popupMediaSource" style="position:static;">Dispositivo</span>
          </div>
          <button type="button" class="btn-close-popup" onclick="closeMediaPopup()" title="Cerrar visor">&times;</button>
        </div>
        <div class="media-popup-body" id="popupMediaBody"></div>
        <div class="media-popup-footer">
          <div class="media-popup-actions" id="popupMediaActions"></div>
          <div id="popupMediaNotes" class="post-notes" style="display:none; margin-top:8px;"></div>
          <div id="popupMediaTags" class="post-tags-container" style="margin-top:6px;"></div>
        </div>
      </div>
    </div>

    <!-- Modal Popup de Detalle de Contacto e Historial de Llamadas -->
    <div id="contactPopupModal" class="media-popup-overlay" onclick="if(event.target === this) closeContactPopup()">
      <div class="media-popup-container" style="max-height:88vh;">
        <div class="media-popup-header">
          <div class="media-popup-meta">
            <span class="media-popup-title" id="contactPopupTitle">Detalle de Contacto</span>
            <span style="font-size:0.75rem; color:#9ca3af;" id="contactPopupSub">Informacion y registro</span>
          </div>
          <button type="button" class="btn-close-popup" onclick="closeContactPopup()" title="Cerrar visor">&times;</button>
        </div>
        <div class="media-popup-body" id="contactPopupBody" style="background:#0b0f19; padding:16px; overflow-y:auto; display:flex; flex-direction:column; gap:14px; min-height:160px; max-height:calc(88vh - 70px);"></div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div id="appToast" class="toast">Enlace copiado al portapapeles</div>
  </div>

  <!-- Session Lock Screen Overlay (Solicitud de Palabra Clave al Cargar o Enfocar la Pestaña) -->
  <div id="sessionLockOverlay" class="session-lock-overlay">
    <div class="lock-card">
      <div class="logo-badge">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h1 class="app-title">Ver Media</h1>
      <p class="app-subtitle">Introduce la palabra clave para desbloquear</p>

      <div id="lockErrorBanner" class="error-banner" style="display:none;"></div>

      <form id="lockPasscodeForm" onsubmit="event.preventDefault(); submitUnlockPasscode();">
        <div class="input-group">
          <label for="lockPasscodeInput">Palabra Clave</label>
          <input type="password" id="lockPasscodeInput" placeholder="Introduce la palabra clave..." required autofocus autocomplete="off" />
        </div>
        <button type="submit" id="btnUnlockSubmit" class="btn-submit">Desbloquear</button>
      </form>
    </div>
  </div>

  <script>
${scriptsHtml}
  </script>
</body>
</html>`;
}

module.exports = {
  renderVerLayout
};
