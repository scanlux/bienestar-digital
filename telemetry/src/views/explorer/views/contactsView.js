/**
 * Nivel 2.6: Libreta de Contactos y Registro de Llamadas
 */
function renderContactsView({
  contactsList = [],
  callLogsList = [],
  metadata = {},
  formatCompactDate
}) {
  // Normalización, Agrupación y Cruce con Registro de Llamadas
  const normalizePhoneKey = (num) => {
    if (!num) return '';
    let str = String(num).replace(/[^0-9]/g, '');
    if (str.length > 10 && str.startsWith('57')) {
      str = str.substring(2);
    }
    return str;
  };

  const callLogsMap = new Map();
  (callLogsList || []).forEach(log => {
    const rawNum = log.number || log.normalizedNumber || '';
    const norm = normalizePhoneKey(rawNum);
    if (!norm) return;

    if (!callLogsMap.has(norm)) {
      callLogsMap.set(norm, {
        totalCalls: 0,
        incomingCalls: 0,
        outgoingCalls: 0,
        missedCalls: 0,
        logs: []
      });
    }

    const entry = callLogsMap.get(norm);
    entry.totalCalls++;
    if (log.isIncoming || log.type === 'incoming') entry.incomingCalls++;
    else if (log.isOutgoing || log.type === 'outgoing') entry.outgoingCalls++;
    else if (log.isMissed || log.type === 'missed' || log.type === 'rejected') entry.missedCalls++;
    else entry.incomingCalls++;

    entry.logs.push(log);
  });

  const consolidatedContactsMap = new Map();
  const processedPhoneKeys = new Set();

  (contactsList || []).forEach(c => {
    const primaryPhoneObj = (c.phoneNumbers && c.phoneNumbers.length > 0)
      ? (c.phoneNumbers.find(p => p.isPrimary) || c.phoneNumbers[0])
      : null;
    const rawPrimary = primaryPhoneObj ? primaryPhoneObj.number : '';
    const normKey = normalizePhoneKey(rawPrimary);
    const mapKey = normKey || `id_${c.id}`;

    const parts = [c.prefix, c.firstName, c.middleName, c.surname, c.suffix].filter(Boolean);
    const fullName = parts.length > 0 ? parts.join(' ') : (c.name || 'Sin Nombre');

    if (consolidatedContactsMap.has(mapKey)) {
      const existing = consolidatedContactsMap.get(mapKey);
      if (fullName && !existing.fullName.includes(fullName)) {
        existing.alternateNames.push(fullName);
      }
      (c.phoneNumbers || []).forEach(p => {
        if (!existing.phoneNumbers.some(ep => normalizePhoneKey(ep.number) === normalizePhoneKey(p.number))) {
          existing.phoneNumbers.push(p);
        }
      });
      (c.emails || []).forEach(e => {
        if (!existing.emails.some(ee => (ee.email || '').toLowerCase() === (e.email || '').toLowerCase())) {
          existing.emails.push(e);
        }
      });
      if (!existing.organization.company && c.organization?.company) {
        existing.organization = { ...c.organization };
      }
    } else {
      consolidatedContactsMap.set(mapKey, {
        id: c.id,
        fullName: fullName,
        alternateNames: [],
        nickname: c.nickname || '',
        phoneNumbers: [...(c.phoneNumbers || [])],
        emails: [...(c.emails || [])],
        organization: c.organization ? { ...c.organization } : { company: '', jobPosition: '' },
        addresses: [...(c.addresses || [])],
        notes: c.notes || '',
        groups: [...(c.groups || [])],
        normKey
      });
    }

    if (normKey) processedPhoneKeys.add(normKey);
  });

  const processedContacts = Array.from(consolidatedContactsMap.values()).map(c => {
    let totalCalls = 0;
    let incomingCalls = 0;
    let outgoingCalls = 0;
    let missedCalls = 0;
    let logs = [];

    c.phoneNumbers.forEach(p => {
      const norm = normalizePhoneKey(p.number);
      if (norm && callLogsMap.has(norm)) {
        const stats = callLogsMap.get(norm);
        totalCalls += stats.totalCalls;
        incomingCalls += stats.incomingCalls;
        outgoingCalls += stats.outgoingCalls;
        missedCalls += stats.missedCalls;
        logs = logs.concat(stats.logs);
      }
    });

    if (c.normKey && callLogsMap.has(c.normKey) && logs.length === 0) {
      const stats = callLogsMap.get(c.normKey);
      totalCalls += stats.totalCalls;
      incomingCalls += stats.incomingCalls;
      outgoingCalls += stats.outgoingCalls;
      missedCalls += stats.missedCalls;
      logs = logs.concat(stats.logs);
    }

    logs.sort((a, b) => (b.date || 0) - (a.date || 0));

    return {
      ...c,
      totalCalls,
      incomingCalls,
      outgoingCalls,
      missedCalls,
      callLogs: logs
    };
  });

  // Agregar registros de llamadas de números no guardados previamente en agenda
  callLogsMap.forEach((stats, normKey) => {
    if (!processedPhoneKeys.has(normKey)) {
      const sample = stats.logs[0];
      const rawNumber = sample ? (sample.number || sample.normalizedNumber || normKey) : normKey;
      const cachedName = sample ? (sample.name || '') : '';

      processedContacts.push({
        id: 'log_' + normKey,
        fullName: cachedName ? cachedName : `No Guardado (${rawNumber})`,
        alternateNames: [],
        nickname: cachedName ? 'Del Historial de Llamadas' : '',
        phoneNumbers: [{ number: rawNumber, label: 'Llamadas' }],
        emails: [],
        organization: { company: '', jobPosition: '' },
        addresses: [],
        notes: 'Contacto no guardado en agenda pero registrado en el historial de llamadas.',
        groups: ['Historial de Llamadas'],
        normKey,
        totalCalls: stats.totalCalls,
        incomingCalls: stats.incomingCalls,
        outgoingCalls: stats.outgoingCalls,
        missedCalls: stats.missedCalls,
        callLogs: stats.logs.sort((a, b) => (b.date || 0) - (a.date || 0))
      });
    }
  });

  // Ordenar por defecto: mayor cantidad de llamadas primero
  processedContacts.sort((a, b) => {
    if (b.totalCalls !== a.totalCalls) return b.totalCalls - a.totalCalls;
    return a.fullName.localeCompare(b.fullName);
  });

  return {
    processedContacts,
    html: `
      <!-- KPI Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-top:20px; margin-bottom:24px;">
        <div style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:16px 20px;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">Total Contactos Únicos</div>
          <div style="font-size:1.6rem; font-weight:800; color:#c084fc;">${processedContacts.length}</div>
        </div>
        <div style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:16px 20px;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">Historial de Llamadas</div>
          <div style="font-size:1.6rem; font-weight:800; color:#34d399;">${callLogsList.length} registros</div>
        </div>
        <div style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:16px 20px;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">Estado App Contactos (HTTP Worker)</div>
          <div id="contactWorkerStatusKpiValue" style="font-size:1rem; font-weight:700; color:${metadata.deviceStatus?.color || '#9ca3af'}; display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:${metadata.deviceStatus?.dotColor || '#6b7280'}; display:inline-block; ${metadata.deviceStatus?.isOnline ? 'box-shadow: 0 0 8px #10b981;' : ''}" id="contactWorkerStatusDot"></span>
            <span id="contactWorkerStatusText">${metadata.deviceStatus?.text || 'No Instalada / Sin Datos'}</span>
          </div>
        </div>
        <div style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:16px 20px;">
          <div style="font-size:0.75rem; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:0.5px; margin-bottom:4px;">Último Respaldo</div>
          <div style="font-size:1rem; font-weight:700; color:#f3f4f6;">${metadata.timestamp ? formatCompactDate(metadata.timestamp) : 'Sin registros'}</div>
        </div>
      </div>

      <!-- Barra de Búsqueda y Herramientas -->
      <div class="search-box" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <input type="text" id="contactSearchInput" placeholder="🔍 Buscar por nombre, teléfono, email, organización..." class="search-input" oninput="filterContactsList()" />
        <span class="badge badge-purple" id="contactCountBadge">Contactos: ${processedContacts.length}</span>
      </div>

      ${processedContacts.length === 0 ? `
        <div style="background:rgba(192, 132, 252, 0.08); border:1px solid rgba(192, 132, 252, 0.3); border-radius:14px; padding:24px; text-align:center; color:#e5e7eb; margin-top:20px;">
          <div style="font-size:1.5rem; margin-bottom:8px;">📱</div>
          <div style="font-weight:700; font-size:1.1rem; color:#c084fc; margin-bottom:6px;">Aún no se han recibido contactos o historial de llamadas</div>
          <p style="font-size:0.9rem; color:#9ca3af; max-width:600px; margin:0 auto 14px auto; line-height:1.5;">
            La aplicación móvil transmite la copia de seguridad de la libreta de direcciones y del registro de llamadas automáticamente.
          </p>
        </div>
      ` : `
        <!-- Tabla Desktop -->
        <div class="desktop-table-view" style="overflow-x:auto; background:#111827; border:1px solid #1f2937; border-radius:14px; margin-top:16px;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.88rem;">
            <thead>
              <tr style="border-bottom:1px solid #1f2937; background:#151d30; color:#9ca3af;">
                <th style="padding:14px 18px; font-weight:600;">Contacto</th>
                <th style="padding:14px 18px; font-weight:600;">Teléfono Principal</th>
                <th style="padding:14px 18px; font-weight:600;">Correo Electrónico</th>
                <th style="padding:14px 18px; font-weight:600;">Empresa / Cargo</th>
                <th style="padding:14px 18px; font-weight:600; cursor:pointer; user-select:none; color:#c084fc;" onclick="toggleCallSort()" title="Haz clic para ordenar por total de llamadas">
                  📞 Total Llamadas <span id="sortCallIcon" style="margin-left:4px; font-weight:800;">⬇</span>
                </th>
              </tr>
            </thead>
            <tbody id="contactsTableBody">
              ${processedContacts.map(c => {
                const fullName = c.fullName;
                const initial = fullName.charAt(0).toUpperCase();

                const primaryPhoneObj = (c.phoneNumbers && c.phoneNumbers.length > 0)
                  ? (c.phoneNumbers.find(p => p.isPrimary) || c.phoneNumbers[0])
                  : null;
                const primaryPhone = primaryPhoneObj ? primaryPhoneObj.number : '--';

                const primaryEmailObj = (c.emails && c.emails.length > 0) ? c.emails[0] : null;
                const primaryEmail = primaryEmailObj ? primaryEmailObj.email : '--';

                const company = (c.organization && c.organization.company) ? c.organization.company : '--';
                const jobPosition = (c.organization && c.organization.jobPosition) ? ` (${c.organization.jobPosition})` : '';
                const orgInfo = company !== '--' ? `${company}${jobPosition}` : '--';

                const searchMeta = `${fullName} ${c.alternateNames.join(' ')} ${c.nickname || ''} ${primaryPhone} ${primaryEmail} ${orgInfo}`.toLowerCase();

                return `
                  <tr class="contact-row-item" data-id="${c.id}" data-calls="${c.totalCalls}" data-name="${fullName.toLowerCase()}" data-search="${searchMeta}" style="border-bottom:1px solid #1f2937; transition:background 0.2s; cursor:pointer;" onclick="openContactDetailModal('${c.id}')" onmouseover="this.style.background='#151d30'" onmouseout="this.style.background='transparent'">
                    <td style="padding:14px 18px;">
                      <div style="display:flex; align-items:center; gap:12px;">
                        <span style="width:36px; height:36px; border-radius:50%; background:#3b0764; color:#c084fc; display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:0.95rem; flex-shrink:0;">${initial}</span>
                        <div>
                          <strong style="color:#f3f4f6; font-size:0.92rem;">${fullName}</strong>
                          ${c.nickname ? `<div style="font-size:0.78rem; color:#9ca3af;">"${c.nickname}"</div>` : ''}
                          ${c.alternateNames.length > 0 ? `<div style="font-size:0.75rem; color:#6b7280;">Nombres alt: ${c.alternateNames.join(', ')}</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td style="padding:14px 18px; color:#e5e7eb; font-family:monospace;">
                      ${primaryPhone}
                    </td>
                    <td style="padding:14px 18px; color:#9ca3af;">
                      ${primaryEmail}
                    </td>
                    <td style="padding:14px 18px; color:#9ca3af;">
                      ${orgInfo}
                    </td>
                    <td style="padding:14px 18px;">
                      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span class="badge" style="background:#2e1065; color:#c084fc; font-weight:700; border-color:#581c87; font-size:0.85rem;">
                          ${c.totalCalls} llamadas
                        </span>
                        <span style="font-size:0.78rem; color:#9ca3af; display:inline-flex; gap:6px;">
                          <span title="Salientes" style="color:#34d399; font-weight:600;">${c.outgoingCalls} ↗</span>
                          <span title="Entrantes" style="color:#38bdf8; font-weight:600;">${c.incomingCalls} ↙</span>
                          <span title="Perdidas/Rechazadas" style="color:#f87171; font-weight:600;">${c.missedCalls} ✕</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Tarjetas Mobile -->
        <div class="mobile-cards-view" style="display:none; flex-direction:column; gap:12px; margin-top:16px;">
          ${processedContacts.map(c => {
            const fullName = c.fullName;
            const initial = fullName.charAt(0).toUpperCase();

            const primaryPhoneObj = (c.phoneNumbers && c.phoneNumbers.length > 0)
              ? (c.phoneNumbers.find(p => p.isPrimary) || c.phoneNumbers[0])
              : null;
            const primaryPhone = primaryPhoneObj ? primaryPhoneObj.number : '--';
            const primaryEmailObj = (c.emails && c.emails.length > 0) ? c.emails[0] : null;
            const primaryEmail = primaryEmailObj ? primaryEmailObj.email : '--';

            const searchMeta = `${fullName} ${c.alternateNames.join(' ')} ${c.nickname || ''} ${primaryPhone} ${primaryEmail}`.toLowerCase();

            return `
              <div class="contact-mobile-item" data-id="${c.id}" data-calls="${c.totalCalls}" data-name="${fullName.toLowerCase()}" data-search="${searchMeta}" style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:16px;" onclick="openContactDetailModal('${c.id}')">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="width:36px; height:36px; border-radius:50%; background:#3b0764; color:#c084fc; display:inline-flex; align-items:center; justify-content:center; font-weight:700;">${initial}</span>
                    <div>
                      <strong style="color:#f3f4f6; font-size:0.95rem;">${fullName}</strong>
                      ${c.nickname ? `<div style="font-size:0.78rem; color:#9ca3af;">"${c.nickname}"</div>` : ''}
                    </div>
                  </div>
                  <span class="badge" style="background:#2e1065; color:#c084fc; border:1px solid #581c87; font-size:0.75rem;">${c.totalCalls} llamadas</span>
                </div>
                <div style="font-size:0.85rem; color:#e5e7eb; font-family:monospace; margin-bottom:4px;">📞 ${primaryPhone}</div>
                ${primaryEmail !== '--' ? `<div style="font-size:0.82rem; color:#9ca3af;">✉️ ${primaryEmail}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}

      <!-- Modal de Detalle Completo de Contacto -->
      <div id="contactDetailModal" class="modal-overlay" onclick="if(event.target === this) closeContactDetailModal()">
        <div class="modal-card" style="max-width:580px; width:92%; background:#111827; border:1px solid #581c87; border-radius:16px;">
          <div class="modal-header" style="border-bottom:1px solid #1f2937; padding:16px 20px;">
            <div class="modal-title" id="modalContactName" style="color:#c084fc; font-size:1.15rem; font-weight:700;">Detalle del Contacto</div>
            <button type="button" class="modal-close" onclick="closeContactDetailModal()" style="background:none; border:none; color:#9ca3af; font-size:1.4rem; cursor:pointer;">✕</button>
          </div>
          <div class="modal-body" id="modalContactBody" style="padding:20px; color:#e5e7eb; max-height:78vh; overflow-y:auto;">
          </div>
        </div>
      </div>
    `
  };
}

module.exports = {
  renderContactsView
};
