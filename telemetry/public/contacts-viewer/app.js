document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const defaultDeviceId = urlParams.get('device') || 'huawei_jkm_lx3_8d9f84b14266ae35';

  let currentContacts = [];

  const deviceModelText = document.getElementById('deviceModelText');
  const devicePathBadge = document.getElementById('devicePathBadge');
  const kpiContactCount = document.getElementById('kpiContactCount');
  const kpiLastBackup = document.getElementById('kpiLastBackup');
  const kpiHash = document.getElementById('kpiHash');
  const searchInput = document.getElementById('searchInput');
  const contactsTableBody = document.getElementById('contactsTableBody');

  const contactModal = document.getElementById('contactModal');
  const modalContactName = document.getElementById('modalContactName');
  const modalContactBody = document.getElementById('modalContactBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  // Load device backup from backend
  async function loadDeviceContacts(deviceId) {
    const candidateEndpoints = [
      `/api/telemetry/devices/${encodeURIComponent(deviceId)}/contacts`,
      `/api/devices/${encodeURIComponent(deviceId)}/contacts`,
      `/api/telemetry/contacts?deviceId=${encodeURIComponent(deviceId)}`
    ];

    let data = null;
    for (const endpoint of candidateEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          data = await response.json();
          if (data && data.success && data.contacts) break;
        }
      } catch (e) {
        // try next endpoint
      }
    }

    if (data && data.success && data.contacts) {
      renderDeviceMetadata(data);
      currentContacts = data.contacts || [];
      renderContactsTable(currentContacts);
    } else {
      console.warn('Backend API connection failed or no data returned, using fallback sample payload');
      // Fallback sample payload if server is offline during static HTML preview
      const fallbackData = {
        deviceId,
        deviceModel: 'HUAWEI JKM-LX3',
        timestamp: Date.now(),
        contactCount: 3,
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        contacts: [
          {
            id: 101,
            prefix: "Dr.",
            firstName: "Carlos",
            middleName: "Eduardo",
            surname: "Mendoza",
            suffix: "Jr.",
            nickname: "Charlie",
            phoneNumbers: [
              { number: "+57 300 123 4567", type: 2, label: "Móvil", isPrimary: true },
              { number: "+57 601 555 0199", type: 3, label: "Oficina", isPrimary: false }
            ],
            emails: [
              { email: "carlos.mendoza@empresa.com", type: 2, label: "Trabajo" },
              { email: "charlie.mendoza@gmail.com", type: 1, label: "Personal" }
            ],
            addresses: [
              { value: "Calle 100 # 15-20, Bogotá", type: 2, label: "Trabajo" }
            ],
            organization: { company: "Logística y Domicilios S.A.S.", jobPosition: "Director de Operaciones" },
            websites: ["https://domicilios.example.com"],
            notes: "Contacto clave para soporte de entregas y coordinación corporativa.",
            groups: ["Clientes VIP", "Proveedores"]
          },
          {
            id: 102,
            firstName: "María",
            middleName: "Fernanda",
            surname: "Gómez",
            nickname: "Mafe",
            phoneNumbers: [
              { number: "+57 315 987 6543", type: 2, label: "Móvil", isPrimary: true }
            ],
            emails: [
              { email: "mafe.gomez@bienestar.co", type: 1, label: "Personal" }
            ],
            addresses: [
              { value: "Carrera 7 # 45-10, Medellín", type: 1, label: "Casa" }
            ],
            organization: { company: "Salud & Vida Ltda.", jobPosition: "Coordinadora Administrativa" },
            websites: [],
            notes: "Atención de lunes a viernes en horario de oficina.",
            groups: ["Personal"]
          },
          {
            id: 103,
            prefix: "Ing.",
            firstName: "Alejandro",
            surname: "Ríos",
            nickname: "Alejo",
            phoneNumbers: [
              { number: "+57 311 444 8899", type: 2, label: "Móvil", isPrimary: true }
            ],
            emails: [
              { email: "a.rios@techcorp.io", type: 2, label: "Trabajo" }
            ],
            addresses: [],
            organization: { company: "TechCorp Solutions", jobPosition: "Lead Software Architect" },
            websites: ["https://techcorp.io"],
            notes: "Especialista en infraestructura cloud e integración API.",
            groups: ["Desarrolladores"]
          }
        ]
      };
      renderDeviceMetadata(fallbackData);
      currentContacts = fallbackData.contacts;
      renderContactsTable(currentContacts);
    }
  }

  function renderDeviceMetadata(data) {
    deviceModelText.textContent = data.deviceModel || 'Dispositivo Móvil';
    devicePathBadge.textContent = `/expl/devices/${data.deviceId}`;
    kpiContactCount.textContent = data.contactCount || (data.contacts ? data.contacts.length : 0);
    
    if (data.timestamp) {
      const date = new Date(data.timestamp);
      kpiLastBackup.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      kpiLastBackup.textContent = 'Reciente';
    }

    kpiHash.textContent = data.hash ? data.hash.substring(0, 16) + '...' : 'N/A';
  }

  function getFullName(c) {
    const parts = [c.prefix, c.firstName, c.middleName, c.surname, c.suffix].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Sin Nombre';
  }

  function renderContactsTable(contacts) {
    if (!contacts || contacts.length === 0) {
      contactsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">No se encontraron contactos en esta libreta.</td>
        </tr>
      `;
      return;
    }

    contactsTableBody.innerHTML = contacts.map(c => {
      const fullName = getFullName(c);
      const initial = (c.firstName || fullName).charAt(0).toUpperCase();

      const primaryPhoneObj = (c.phoneNumbers && c.phoneNumbers.length > 0)
        ? (c.phoneNumbers.find(p => p.isPrimary) || c.phoneNumbers[0])
        : null;
      const primaryPhone = primaryPhoneObj ? primaryPhoneObj.number : '--';

      const primaryEmailObj = (c.emails && c.emails.length > 0) ? c.emails[0] : null;
      const primaryEmail = primaryEmailObj ? primaryEmailObj.email : '--';

      const company = (c.organization && c.organization.company) ? c.organization.company : '--';
      const jobPosition = (c.organization && c.organization.jobPosition) ? ` (${c.organization.jobPosition})` : '';
      const orgInfo = company !== '--' ? `${company}${jobPosition}` : '--';

      return `
        <tr data-contact-id="${c.id}">
          <td>
            <div class="contact-name-box">
              <span class="avatar-badge">${initial}</span>
              <div>
                <strong>${escapeHtml(fullName)}</strong>
                ${c.nickname ? `<div style="font-size:12px; color:var(--text-muted);">"${escapeHtml(c.nickname)}"</div>` : ''}
              </div>
            </div>
          </td>
          <td>
            <span>${escapeHtml(primaryPhone)}</span>
            ${primaryPhone !== '--' ? `<button class="copy-btn" onclick="event.stopPropagation(); copyText('${escapeHtml(primaryPhone)}')">Copiar</button>` : ''}
          </td>
          <td>${escapeHtml(primaryEmail)}</td>
          <td>${escapeHtml(orgInfo)}</td>
          <td>
            <button class="btn-detail" onclick="event.stopPropagation(); openContactModal(${c.id})">Ver Ficha</button>
          </td>
        </tr>
      `;
    }).join('');

    // Add click event for rows
    document.querySelectorAll('#contactsTableBody tr[data-contact-id]').forEach(row => {
      row.addEventListener('click', () => {
        const id = parseInt(row.getAttribute('data-contact-id'), 10);
        openContactModal(id);
      });
    });
  }

  // Reactive Search Filter
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderContactsTable(currentContacts);
      return;
    }

    const filtered = currentContacts.filter(c => {
      const fullName = getFullName(c).toLowerCase();
      const nickname = (c.nickname || '').toLowerCase();
      const company = (c.organization?.company || '').toLowerCase();
      const job = (c.organization?.jobPosition || '').toLowerCase();
      
      const phones = (c.phoneNumbers || []).map(p => p.number.toLowerCase()).join(' ');
      const emails = (c.emails || []).map(e => e.email.toLowerCase()).join(' ');

      return fullName.includes(query) ||
             nickname.includes(query) ||
             company.includes(query) ||
             job.includes(query) ||
             phones.includes(query) ||
             emails.includes(query);
    });

    renderContactsTable(filtered);
  });

  // Modal Popup Functionality
  window.openContactModal = function(contactId) {
    const contact = currentContacts.find(c => c.id === contactId);
    if (!contact) return;

    const fullName = getFullName(contact);
    modalContactName.textContent = fullName;

    let bodyHtml = '';

    // Telephones
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      bodyHtml += `<div class="info-section">
        <div class="info-section-title">Teléfonos</div>`;
      contact.phoneNumbers.forEach(p => {
        bodyHtml += `
          <div class="info-item">
            <span><strong>${escapeHtml(p.number)}</strong></span>
            <span class="tag-badge">${escapeHtml(p.label || 'Teléfono')}</span>
          </div>`;
      });
      bodyHtml += `</div>`;
    }

    // Emails
    if (contact.emails && contact.emails.length > 0) {
      bodyHtml += `<div class="info-section">
        <div class="info-section-title">Correos Electrónicos</div>`;
      contact.emails.forEach(e => {
        bodyHtml += `
          <div class="info-item">
            <span>${escapeHtml(e.email)}</span>
            <span class="tag-badge">${escapeHtml(e.label || 'Email')}</span>
          </div>`;
      });
      bodyHtml += `</div>`;
    }

    // Organization
    if (contact.organization && (contact.organization.company || contact.organization.jobPosition)) {
      bodyHtml += `<div class="info-section">
        <div class="info-section-title">Organización</div>
        <div class="info-item">
          <span>Empresa: <strong>${escapeHtml(contact.organization.company || '--')}</strong></span>
        </div>
        <div class="info-item">
          <span>Cargo: <strong>${escapeHtml(contact.organization.jobPosition || '--')}</strong></span>
        </div>
      </div>`;
    }

    // Addresses
    if (contact.addresses && contact.addresses.length > 0) {
      bodyHtml += `<div class="info-section">
        <div class="info-section-title">Direcciones</div>`;
      contact.addresses.forEach(a => {
        bodyHtml += `
          <div class="info-item">
            <span>${escapeHtml(a.value || a.street || '--')}</span>
            <span class="tag-badge">${escapeHtml(a.label || 'Dirección')}</span>
          </div>`;
      });
      bodyHtml += `</div>`;
    }

    // Notes
    if (contact.notes) {
      bodyHtml += `<div class="info-section">
        <div class="info-section-title">Notas</div>
        <div style="font-size:14px; color:var(--text-main); background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
          ${escapeHtml(contact.notes)}
        </div>
      </div>`;
    }

    // Groups
    if (contact.groups && contact.groups.length > 0) {
      bodyHtml += `<div class="info-section">
        <div class="info-section-title">Grupos / Categorías</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${contact.groups.map(g => `<span class="tag-badge" style="background:#e0e7ff; color:#3730a3;">${escapeHtml(g)}</span>`).join('')}
        </div>
      </div>`;
    }

    modalContactBody.innerHTML = bodyHtml;
    contactModal.classList.add('active');
  };

  modalCloseBtn.addEventListener('click', () => {
    contactModal.classList.remove('active');
  });

  contactModal.addEventListener('click', (e) => {
    if (e.target === contactModal) {
      contactModal.classList.remove('active');
    }
  });

  window.copyText = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copiado al portapapeles: ${text}`);
    }).catch(err => {
      console.error('Error al copiar text: ', err);
    });
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  loadDeviceContacts(defaultDeviceId);
});
