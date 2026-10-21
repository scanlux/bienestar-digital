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
  <link rel="icon" href="https://trendy.sytes.net/favicon.ico" type="image/x-icon">
  <style>
${styles}
  </style>
</head>
<body>
  <div class="app-viewport">
    <!-- Top Bar Sticky con Buscador por Fecha y Tag -->
    <header class="top-bar">
      <div class="top-search-container" id="topSearchContainer">
        <button type="button" class="btn-search-trigger" onclick="executeTopSearch()" title="Iniciar busqueda">
          ${ICONS.search}
        </button>
        <div class="top-search-group">
          <input type="text" id="topSearchTag" class="top-search-input" placeholder="Buscar por tag o texto..." onkeydown="if(event.key==='Enter') executeTopSearch()" />
        </div>
        <div id="activeDateBadgeContainer" style="display:none;"></div>
        <div class="top-date-group">
          <input type="date" id="topSearchDate" class="top-date-hidden" onchange="onDateSelected(this.value)" />
          <button type="button" class="btn-calendar-trigger" onclick="openCalendarPicker()" title="Buscar por calendario">
            ${ICONS.calendar}
          </button>
        </div>
        <button type="button" id="btnClearTopSearch" class="btn-clear-search" onclick="clearTopSearch()" title="Limpiar busqueda" style="display:none;">&times;</button>
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
        <p style="font-size:0.8rem; color:#9ca3af;" id="tagModalFilename">archivo.mp4</p>
        
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

  <script>
${scriptsHtml}
  </script>
</body>
</html>`;
}

module.exports = {
  renderVerLayout
};
