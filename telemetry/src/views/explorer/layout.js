/**
 * Shell maestro de presentación para el Explorador de Telemetría
 */
const { getExplorerStyles } = require('./styles');

function renderLayout({
  title,
  headerTitleHtml,
  headerActionHtml = '',
  topNavBreadcrumbsHtml = '',
  contentHtml = '',
  scriptsHtml = ''
}) {
  const styles = getExplorerStyles();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Explorador NLP</title>
  <link rel="icon" href="https://trendy.sytes.net/favicon.ico" type="image/x-icon">
  <link rel="shortcut icon" href="https://trendy.sytes.net/favicon.ico">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📱</text></svg>">
  <script src="/socket.io/socket.io.js"></script>
  <style>
${styles}
  </style>
</head>
<body>
  <div class="navbar-fixed">
    <a href="/expl/logout" id="presenceLogoutBtn" class="btn-status-logout offline" title="Estado del Dispositivo (Clic para Salir)"><span class="status-dot"></span><span id="presenceStatusText">Offline</span></a>
    <div class="nav-breadcrumbs">
      ${topNavBreadcrumbsHtml}
    </div>
  </div>

  <div class="container">

    <div class="header">
      <div>
        <div class="header-title">${headerTitleHtml}</div>
        <div class="header-subtitle">Explorador Dataset NLP — Visualización Jerárquica</div>
      </div>
      <div>
        ${headerActionHtml}
      </div>
    </div>

    ${contentHtml}

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
${scriptsHtml}
  </script>
</body>
</html>`;
}

module.exports = {
  renderLayout
};
