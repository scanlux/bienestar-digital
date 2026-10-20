/**
 * Script de cliente para la Libreta de Contactos e Historial de Llamadas
 */
function getContactsClientScript({ processedContacts = [] }) {
  return `
    const rawContactsData = ${JSON.stringify(processedContacts)};
    let currentSortDirection = 'desc';

    function toggleCallSort() {
      currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
      const icon = document.getElementById('sortCallIcon');
      if (icon) icon.textContent = currentSortDirection === 'desc' ? '⬇' : '⬆';

      const tbody = document.getElementById('contactsTableBody');
      if (!tbody) return;

      const rows = Array.from(tbody.querySelectorAll('.contact-row-item'));
      rows.sort((a, b) => {
        const callsA = parseInt(a.getAttribute('data-calls') || '0', 10);
        const callsB = parseInt(b.getAttribute('data-calls') || '0', 10);
        if (callsA !== callsB) {
          return currentSortDirection === 'desc' ? (callsB - callsA) : (callsA - callsB);
        }
        const nameA = a.getAttribute('data-name') || '';
        const nameB = b.getAttribute('data-name') || '';
        return nameA.localeCompare(nameB);
      });

      rows.forEach(r => tbody.appendChild(r));
    }

    function filterContactsList() {
      const q = (document.getElementById('contactSearchInput')?.value || '').toLowerCase().trim();
      const rows = document.querySelectorAll('.contact-row-item');
      const mobileCards = document.querySelectorAll('.contact-mobile-item');
      let visibleCount = 0;

      rows.forEach(r => {
        const meta = r.getAttribute('data-search') || '';
        const match = !q || meta.includes(q);
        r.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });

      mobileCards.forEach(mc => {
        const meta = mc.getAttribute('data-search') || '';
        mc.style.display = (!q || meta.includes(q)) ? 'flex' : 'none';
      });

      const badge = document.getElementById('contactCountBadge');
      if (badge) badge.textContent = 'Contactos: ' + visibleCount;
    }

    function formatCompactDateJS(ts) {
      if (!ts) return '—';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
    }

    function openContactDetailModal(contactId) {
      const contact = rawContactsData.find(c => String(c.id) === String(contactId));
      if (!contact) return;

      const titleElem = document.getElementById('modalContactName');
      const bodyElem = document.getElementById('modalContactBody');
      const modalElem = document.getElementById('contactDetailModal');

      titleElem.textContent = '👤 ' + contact.fullName;

      let html = '';

      // Estadísticas Generales de Llamadas
      html += '<div style="background:#151d30; border:1px solid #1f2937; border-radius:12px; padding:14px 18px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">';
      html += '<div><div style="font-size:0.75rem; text-transform:uppercase; color:#9ca3af; font-weight:700;">Total Interacciones</div><div style="font-size:1.4rem; font-weight:800; color:#c084fc;">' + contact.totalCalls + ' llamadas</div></div>';
      html += '<div style="display:flex; gap:12px; font-size:0.85rem; font-weight:700;">';
      html += '<span style="color:#34d399;">' + contact.outgoingCalls + ' ↗ Salientes</span>';
      html += '<span style="color:#38bdf8;">' + contact.incomingCalls + ' ↙ Entrantes</span>';
      html += '<span style="color:#f87171;">' + contact.missedCalls + ' ✕ Perdidas</span>';
      html += '</div></div>';

      // Telephones
      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        html += '<div style="margin-bottom:16px;"><div style="font-size:0.75rem; text-transform:uppercase; color:#c084fc; font-weight:700; margin-bottom:8px; border-bottom:1px solid #1f2937; padding-bottom:4px;">📞 Teléfonos</div>';
        contact.phoneNumbers.forEach(p => {
          html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; font-size:0.9rem;"><span style="font-family:monospace; color:#f3f4f6;">' + p.number + '</span><span class="badge" style="background:#2e1065; color:#c084fc;">' + (p.label || 'Teléfono') + '</span></div>';
        });
        html += '</div>';
      }

      // Emails
      if (contact.emails && contact.emails.length > 0) {
        html += '<div style="margin-bottom:16px;"><div style="font-size:0.75rem; text-transform:uppercase; color:#c084fc; font-weight:700; margin-bottom:8px; border-bottom:1px solid #1f2937; padding-bottom:4px;">✉️ Correos Electrónicos</div>';
        contact.emails.forEach(e => {
          html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; font-size:0.9rem;"><span style="color:#38bdf8;">' + e.email + '</span><span class="badge" style="background:#1e293b; color:#9ca3af;">' + (e.label || 'Email') + '</span></div>';
        });
        html += '</div>';
      }

      // Organization
      if (contact.organization && (contact.organization.company || contact.organization.jobPosition)) {
        html += '<div style="margin-bottom:16px;"><div style="font-size:0.75rem; text-transform:uppercase; color:#c084fc; font-weight:700; margin-bottom:8px; border-bottom:1px solid #1f2937; padding-bottom:4px;">🏢 Organización</div>';
        if (contact.organization.company) html += '<div style="font-size:0.9rem; margin-bottom:4px;">Empresa: <strong style="color:#f3f4f6;">' + contact.organization.company + '</strong></div>';
        if (contact.organization.jobPosition) html += '<div style="font-size:0.9rem;">Cargo: <strong style="color:#f3f4f6;">' + contact.organization.jobPosition + '</strong></div>';
        html += '</div>';
      }

      // Historial Cronológico de Llamadas
      if (contact.callLogs && contact.callLogs.length > 0) {
        html += '<div style="margin-top:16px; margin-bottom:16px;">';
        html += '<div style="font-size:0.75rem; text-transform:uppercase; color:#c084fc; font-weight:700; margin-bottom:8px; border-bottom:1px solid #1f2937; padding-bottom:4px; display:flex; justify-content:space-between; align-items:center;">';
        html += '<span>📞 Historial Cronológico de Llamadas</span>';
        html += '<span class="badge" style="background:#2e1065; color:#c084fc;">' + contact.callLogs.length + ' registros</span>';
        html += '</div>';

        html += '<div style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:4px;">';
        contact.callLogs.forEach(l => {
          const dateStr = formatCompactDateJS(l.date);
          const isOut = l.isOutgoing || l.type === 'outgoing';
          const isIn = l.isIncoming || l.type === 'incoming';
          const typeLabel = isOut ? '↗ Saliente' : (isIn ? '↙ Entrante' : '✕ Perdida');
          const badgeBg = isOut ? 'rgba(52, 211, 153, 0.15)' : (isIn ? 'rgba(56, 189, 248, 0.15)' : 'rgba(248, 113, 113, 0.15)');
          const badgeColor = isOut ? '#34d399' : (isIn ? '#38bdf8' : '#f87171');
          const durSec = Number(l.duration || 0);
          const durationStr = durSec > 0 ? (Math.floor(durSec / 60) + 'm ' + (durSec % 60) + 's') : '0s';

          html += '<div style="background:#151d30; border:1px solid #1f2937; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">';
          html += '<div style="display:flex; align-items:center; gap:8px;">';
          html += '<span style="background:' + badgeBg + '; color:' + badgeColor + '; border:1px solid ' + badgeColor + '40; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;">' + typeLabel + '</span>';
          html += '<span style="color:#9ca3af; font-family:monospace; font-size:0.8rem;">' + dateStr + '</span>';
          html += '</div>';
          html += '<span style="color:#e5e7eb; font-weight:600; font-size:0.8rem;">⏱️ ' + durationStr + '</span>';
          html += '</div>';
        });
        html += '</div></div>';
      }

      // Notes
      if (contact.notes) {
        html += '<div style="margin-bottom:16px;"><div style="font-size:0.75rem; text-transform:uppercase; color:#c084fc; font-weight:700; margin-bottom:8px; border-bottom:1px solid #1f2937; padding-bottom:4px;">📝 Notas</div><div style="background:#151d30; padding:10px 14px; border-radius:8px; font-size:0.88rem; color:#d1d5db; line-height:1.5;">' + contact.notes + '</div></div>';
      }

      // Groups
      if (contact.groups && contact.groups.length > 0) {
        html += '<div><div style="font-size:0.75rem; text-transform:uppercase; color:#c084fc; font-weight:700; margin-bottom:8px; border-bottom:1px solid #1f2937; padding-bottom:4px;">🏷️ Grupos / Categorías</div><div style="display:flex; gap:6px; flex-wrap:wrap;">' + contact.groups.map(g => '<span class="badge" style="background:#3b0764; color:#c084fc; font-weight:600;">' + g + '</span>').join('') + '</div></div>';
      }

      bodyElem.innerHTML = html;
      modalElem.classList.add('active');
    }

    function closeContactDetailModal() {
      const modalElem = document.getElementById('contactDetailModal');
      if (modalElem) modalElem.classList.remove('active');
    }
  `;
}

module.exports = {
  getContactsClientScript
};
