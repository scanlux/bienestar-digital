/**
 * Nivel 3: Registros Conversacionales de Teclado NLP
 */
function renderNlpRecordsView({ items = [] }) {
  return `
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
  `;
}

module.exports = {
  renderNlpRecordsView
};
