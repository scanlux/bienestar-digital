/**
 * Nivel 1: Listado de Dispositivos Conectados
 */
function renderDevicesView({ devicesList = [] }) {
  return `
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="🔍 Buscar dispositivo por ID o modelo..." class="search-input" />
      <span class="badge" id="countBadge">Dispositivos: ${devicesList.length}</span>
    </div>
    
    <div class="grid-cards" id="cardsGrid">
      ${devicesList.map(d => `
        <div class="card-item" data-search="${(d.id || '').toLowerCase()}">
          <a href="/expl/devices/${d.id}" style="text-decoration:none; color:inherit;">
            <div>
              <div class="card-header">
                <div class="card-title">📱 ${d.id}</div>
              </div>
              <div class="card-meta">
                <span>Registros escritos: <strong>${d.lineCount || 0}</strong></span>
                <span>Tamaño: <strong>${((d.size || 0) / 1024).toFixed(1)} KB</strong></span>
              </div>
            </div>
          </a>
          <div style="margin-top: 18px; display:flex; justify-content:space-between; align-items:flex-end;">
            <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
              <span class="badge">${d.appsCount || 0} Apps</span>
              ${(d.systemEventsCount > 0) ? `
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
  `;
}

module.exports = {
  renderDevicesView
};
