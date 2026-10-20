/**
 * Nivel 3-nlp: Aplicaciones Activas con Registros NLP
 */
const { getAppIcon } = require('../../../utils/appIcons');

function renderNlpAppsView({ deviceId, appsList = [], formatCompactDate }) {
  return `
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="🔍 Buscar aplicación por nombre o paquete..." class="search-input" />
      <span class="badge badge-purple" id="countBadge">Aplicaciones: ${appsList.length}</span>
    </div>

    <div class="grid-cards" id="cardsGrid">
      ${appsList.map(a => `
        <a href="/expl/devices/${deviceId}/apps/${encodeURIComponent(a.packageName)}" class="card-item" data-search="${(a.packageName || '').toLowerCase()} ${(a.displayName || '').toLowerCase()}">
          <div>
            <div class="card-header">
              <div class="card-title"><span class="app-icon">${getAppIcon(a.packageName)}</span>${a.displayName}</div>
              <span class="badge badge-purple">${a.count || 0} escritos</span>
            </div>
            <div class="card-meta">
              <span style="color: #6b7280; font-size: 0.8rem; font-family: monospace; word-break: break-all;">Paquete: ${a.packageName}</span>
              <span>Última actividad: <strong>${a.lastActivity ? formatCompactDate(a.lastActivity) : 'Reciente'}</strong></span>
            </div>
          </div>
          <div style="margin-top: 16px; display:flex; justify-content:flex-end;">
            <span class="btn" style="font-size:0.8rem; padding:6px 12px;">Ver Registros &rarr;</span>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

module.exports = {
  renderNlpAppsView
};
