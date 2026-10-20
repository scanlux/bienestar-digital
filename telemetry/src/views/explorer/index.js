/**
 * Orquestador Central de Vistas del Explorador de Telemetría
 */
const { getAppIcon } = require('../../utils/appIcons');
const { getAppDisplayName } = require('../../utils/helpers');
const { renderLayout } = require('./layout');

// Subvistas
const { renderDevicesView } = require('./views/devicesView');
const { renderDeviceHubView } = require('./views/deviceHubView');
const { renderContactsView } = require('./views/contactsView');
const { renderNlpAppsView } = require('./views/nlpAppsView');
const { renderNlpRecordsView } = require('./views/nlpRecordsView');
const { renderFilesView } = require('./views/filesView');

// Scripts de Cliente
const { getClientSocketScript } = require('./scripts/clientSocketScript');
const { getFilesClientScript } = require('./scripts/filesClientScript');
const { getContactsClientScript } = require('./scripts/contactsClientScript');
const { getDevicesClientScript } = require('./scripts/devicesClientScript');
const { getNlpClientScript, getNlpAppsClientScript } = require('./scripts/nlpClientScript');

const formatCompactDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const formatFileSize = (bytes) => {
  const n = Number(bytes);
  if (isNaN(n) || n <= 0) return '—';
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
};

const generateExplorerHtml = ({
  title,
  level,
  deviceId,
  appPackage,
  devicesList = [],
  appsList = [],
  items = [],
  downloadUrl,
  currentPath = '/storage/emulated/0',
  allFiles = [],
  downloadedMap = {},
  pendingPaths = new Set(),
  standbyPaths = new Set(),
  completedPaths = new Set(),
  autoSyncFolders = new Set(),
  syncStats = {},
  initialFilter = 'all',
  activeTransferFile = null,
  contactsList = [],
  callLogsList = [],
  metadata = {}
}) => {
  const cleanTitle = (appPackage && level === 3) 
    ? `${getAppDisplayName(appPackage)}` 
    : String(title).replace(/<[^>]*>/g, '').trim();

  // Construir breadcrumbs del navbar superior limitados a los últimos 3 pasos/links
  const allNavSteps = [
    { label: '📱 Dispositivos', href: '/expl' }
  ];
  if (deviceId) {
    allNavSteps.push({ label: deviceId, href: `/expl/devices/${deviceId}` });
  }
  if (level === '3-files' || level === '2-files-hub') {
    allNavSteps.push({ label: '📂 Archivos', href: null });
  }
  if (appPackage) {
    allNavSteps.push({ label: getAppDisplayName(appPackage), href: null });
  }

  const isNavTruncated = allNavSteps.length > 3;
  const visibleNavSteps = isNavTruncated ? allNavSteps.slice(-3) : allNavSteps;

  const topNavBreadcrumbsHtml = (isNavTruncated ? '<span class="separator">...</span> <span class="separator">/</span> ' : '') +
    visibleNavSteps.map((step, idx) => {
      const isLast = idx === visibleNavSteps.length - 1;
      if (isLast || !step.href) {
        return `<span class="current" title="${step.label}">${step.label}</span>`;
      }
      return `<a href="${step.href}" title="${step.label}">${step.label}</a>`;
    }).join(' <span class="separator">/</span> ');

  const headerTitleHtml = (level === 3 && appPackage)
    ? `<span class="app-icon" style="margin-right:10px; display:inline-flex; align-items:center;">${getAppIcon(appPackage)}</span>${getAppDisplayName(appPackage)}`
    : title;

  let headerActionHtml = downloadUrl ? `<a href="${downloadUrl}" download class="btn">⬇ Exportar JSON</a>` : '';

  let contentHtml = '';
  let scriptsHtml = '';

  if (level === 1) {
    contentHtml = renderDevicesView({ devicesList });
    scriptsHtml = getDevicesClientScript({ devicesList });
  } else if (level === 2) {
    contentHtml = renderDeviceHubView({ deviceId });
    scriptsHtml = getClientSocketScript({ deviceId });
  } else if (level === 'contacts' || level === '2-contacts') {
    const contactsResult = renderContactsView({
      contactsList,
      callLogsList,
      metadata,
      formatCompactDate
    });
    contentHtml = contactsResult.html;
    scriptsHtml = getClientSocketScript({ deviceId }) + '\n' + getContactsClientScript({ processedContacts: contactsResult.processedContacts });
  } else if (level === '3-nlp') {
    contentHtml = renderNlpAppsView({ deviceId, appsList, formatCompactDate });
    scriptsHtml = getClientSocketScript({ deviceId }) + '\n' + getNlpAppsClientScript();
  } else if (level === 3) {
    contentHtml = renderNlpRecordsView({ items });
    scriptsHtml = getClientSocketScript({ deviceId }) + '\n' + getNlpClientScript({ items });
  } else if (level === '3-files') {
    contentHtml = renderFilesView({
      deviceId,
      currentPath,
      allFiles,
      downloadedMap,
      pendingPaths,
      standbyPaths,
      syncStats,
      initialFilter,
      activeTransferFile,
      formatCompactDate,
      formatFileSize
    });
    scriptsHtml = getClientSocketScript({ deviceId }) + '\n' + getFilesClientScript({ deviceId, initialFilter });
  }

  return renderLayout({
    title: cleanTitle,
    headerTitleHtml,
    headerActionHtml,
    topNavBreadcrumbsHtml,
    contentHtml,
    scriptsHtml
  });
};

module.exports = {
  generateExplorerHtml
};
