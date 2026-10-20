/**
 * Script de cliente para la vista de Dispositivos (Búsqueda y modal de inicios del sistema)
 */
function getDevicesClientScript({ devicesList = [] }) {
  return `
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

    const searchInput = document.getElementById('searchInput');
    const cardsGrid = document.getElementById('cardsGrid');
    const countBadge = document.getElementById('countBadge');

    if (searchInput && cardsGrid) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = cardsGrid.querySelectorAll('.card-item');
        let visibleCount = 0;
        cards.forEach(card => {
          const match = (card.getAttribute('data-search') || '').includes(query);
          card.style.display = match ? 'flex' : 'none';
          if (match) visibleCount++;
        });
        if (countBadge) countBadge.textContent = 'Resultados: ' + visibleCount;
      });
    }
  `;
}

module.exports = {
  getDevicesClientScript
};
