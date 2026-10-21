const fs = require('fs');
const path = require('path');
const {
  getDatasetDir,
  readJsonLinesFile,
  isSystemInitEvent,
  getAppDisplayName,
  formatCompactDate,
  sanitizeDeviceId
} = require('../utils/helpers');
const { getAppIcon } = require('../utils/appIcons');

/**
 * Busca un archivo especifico dentro del directorio del dispositivo o de sus alias
 */
function findDeviceFile(deviceId, fileName) {
  const safeId = sanitizeDeviceId(deviceId);
  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');

  if (!fs.existsSync(devicesDir)) return null;

  // 1. Busqueda directa en carpeta exacta
  const directPath = path.join(devicesDir, safeId, fileName);
  if (fs.existsSync(directPath)) return directPath;

  // 2. Busqueda en carpetas alias
  try {
    const items = fs.readdirSync(devicesDir);
    for (const item of items) {
      if (item !== safeId && (item.endsWith(safeId) || safeId.endsWith(item))) {
        const aliasPath = path.join(devicesDir, item, fileName);
        if (fs.existsSync(aliasPath)) return aliasPath;
      }
    }
  } catch (e) {
    console.error('[DEVICE_DATA] Error buscando alias en devicesDir:', e);
  }

  return null;
}

/**
 * Localiza el archivo de dataset NLP JSON/JSONL del dispositivo
 */
function findDeviceDatasetFile(deviceId) {
  const safeId = sanitizeDeviceId(deviceId);
  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');

  // Candidatos comunes
  const candidates = [
    path.join(devicesDir, `dataset_${safeId}.json`),
    path.join(devicesDir, `${safeId}.json`),
    path.join(devicesDir, safeId, `dataset_${safeId}.json`),
    path.join(devicesDir, safeId, 'dataset.json'),
    path.join(targetDir, `dataset_${safeId}.json`),
    path.join(targetDir, 'dataset_lenguaje_humano.json')
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }

  // Buscar por coincidencia parcial en devicesDir
  if (fs.existsSync(devicesDir)) {
    try {
      const items = fs.readdirSync(devicesDir);
      for (const item of items) {
        if (item.includes(safeId) && item.endsWith('.json')) {
          return path.join(devicesDir, item);
        }
      }
    } catch (e) {
      console.error('[DEVICE_DATA] Error buscando dataset file:', e);
    }
  }

  return null;
}

/**
 * Normaliza un numero de telefono a clave de busqueda
 */
function normalizePhoneKey(num) {
  if (!num) return '';
  let str = String(num).replace(/[^0-9]/g, '');
  if (str.length > 10 && str.startsWith('57')) {
    str = str.substring(2);
  }
  return str;
}

/**
 * Formatea segundos a duracion legible (ej: 2m 15s)
 */
function formatCallDuration(seconds) {
  const sec = parseInt(seconds, 10);
  if (isNaN(sec) || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/**
 * Obtiene contactos y estadisticas de llamadas cruzadas
 */
function getDeviceContactsAndCallLogs(deviceId) {
  const safeId = sanitizeDeviceId(deviceId);
  const backupPath = findDeviceFile(safeId, 'contacts_backup.json');
  const callLogsBackupPath = findDeviceFile(safeId, 'call_logs_backup.json');
  const contactsStatusPath = findDeviceFile(safeId, 'contacts_status.json');
  const callLogsStatusPath = findDeviceFile(safeId, 'call_logs_status.json');

  let backupData = null;
  if (backupPath) {
    try {
      backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    } catch (e) {
      console.error('[DEVICE_DATA] Error reading contacts_backup.json:', e);
    }
  }

  let callLogsData = null;
  if (callLogsBackupPath) {
    try {
      callLogsData = JSON.parse(fs.readFileSync(callLogsBackupPath, 'utf8'));
    } catch (e) {
      console.error('[DEVICE_DATA] Error reading call_logs_backup.json:', e);
    }
  }

  const rawContacts = backupData?.contacts || [];
  const rawCallLogs = callLogsData?.callLogs || [];

  // Mapear llamadas agrupadas por numero normalizado
  let globalIncoming = 0;
  let globalOutgoing = 0;
  let globalMissed = 0;

  const callLogsMap = new Map();
  rawCallLogs.forEach(log => {
    const rawNum = log.number || log.normalizedNumber || '';
    const norm = normalizePhoneKey(rawNum);
    if (!norm) return;

    if (!callLogsMap.has(norm)) {
      callLogsMap.set(norm, {
        totalCalls: 0,
        incomingCalls: 0,
        outgoingCalls: 0,
        missedCalls: 0,
        totalDurationSec: 0,
        logs: []
      });
    }

    const entry = callLogsMap.get(norm);
    entry.totalCalls++;

    const isInc = log.isIncoming || log.type === 'incoming' || log.type === 1 || log.callType === 1;
    const isOut = log.isOutgoing || log.type === 'outgoing' || log.type === 2 || log.callType === 2;
    const isMis = log.isMissed || log.type === 'missed' || log.type === 'rejected' || log.type === 3 || log.callType === 3 || log.type === 5;

    const dur = parseInt(log.duration || 0, 10) || 0;
    entry.totalDurationSec += dur;

    if (isInc) {
      entry.incomingCalls++;
      globalIncoming++;
    } else if (isOut) {
      entry.outgoingCalls++;
      globalOutgoing++;
    } else if (isMis) {
      entry.missedCalls++;
      globalMissed++;
    } else {
      entry.incomingCalls++;
      globalIncoming++;
    }

    const logDate = log.date || log.timestamp || 0;
    entry.logs.push({
      number: rawNum,
      type: isInc ? 'incoming' : (isOut ? 'outgoing' : 'missed'),
      duration: dur,
      durationFormatted: formatCallDuration(dur),
      date: logDate,
      dateFormatted: formatCompactDate(logDate)
    });
  });

  const consolidatedMap = new Map();
  const processedPhoneKeys = new Set();

  rawContacts.forEach(c => {
    const primaryPhoneObj = (c.phoneNumbers && c.phoneNumbers.length > 0)
      ? (c.phoneNumbers.find(p => p.isPrimary) || c.phoneNumbers[0])
      : null;
    const rawPrimary = primaryPhoneObj ? primaryPhoneObj.number : '';
    const normKey = normalizePhoneKey(rawPrimary);
    const mapKey = normKey || `id_${c.id}`;

    const parts = [c.prefix, c.firstName, c.middleName, c.surname, c.suffix].filter(Boolean);
    const fullName = parts.length > 0 ? parts.join(' ') : (c.name || 'Sin Nombre');

    if (consolidatedMap.has(mapKey)) {
      const existing = consolidatedMap.get(mapKey);
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
    } else {
      consolidatedMap.set(mapKey, {
        id: c.id || mapKey,
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

  const processedContacts = Array.from(consolidatedMap.values()).map(c => {
    let totalCalls = 0;
    let incomingCalls = 0;
    let outgoingCalls = 0;
    let missedCalls = 0;
    let totalDurationSec = 0;
    let logs = [];

    c.phoneNumbers.forEach(p => {
      const norm = normalizePhoneKey(p.number);
      if (norm && callLogsMap.has(norm)) {
        const stats = callLogsMap.get(norm);
        totalCalls += stats.totalCalls;
        incomingCalls += stats.incomingCalls;
        outgoingCalls += stats.outgoingCalls;
        missedCalls += stats.missedCalls;
        totalDurationSec += stats.totalDurationSec;
        logs = logs.concat(stats.logs);
      }
    });

    if (c.normKey && callLogsMap.has(c.normKey) && logs.length === 0) {
      const stats = callLogsMap.get(c.normKey);
      totalCalls += stats.totalCalls;
      incomingCalls += stats.incomingCalls;
      outgoingCalls += stats.outgoingCalls;
      missedCalls += stats.missedCalls;
      totalDurationSec += stats.totalDurationSec;
      logs = logs.concat(stats.logs);
    }

    logs.sort((a, b) => (b.date || 0) - (a.date || 0));

    return {
      ...c,
      totalCalls,
      incomingCalls,
      outgoingCalls,
      missedCalls,
      totalDurationSec,
      durationFormatted: formatCallDuration(totalDurationSec),
      callLogs: logs
    };
  });

  // Agregar numeros del historial de llamadas no agendados previamente
  callLogsMap.forEach((stats, normKey) => {
    if (!processedPhoneKeys.has(normKey)) {
      const sample = stats.logs[0];
      const rawNumber = sample ? sample.number : normKey;

      processedContacts.push({
        id: 'log_' + normKey,
        fullName: `No Guardado (${rawNumber})`,
        alternateNames: [],
        nickname: 'Historial de llamadas',
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
        totalDurationSec: stats.totalDurationSec,
        durationFormatted: formatCallDuration(stats.totalDurationSec),
        callLogs: stats.logs.sort((a, b) => (b.date || 0) - (a.date || 0))
      });
    }
  });

  // Ordenar por llamadas totales descendente y luego alfabetico
  processedContacts.sort((a, b) => {
    if (b.totalCalls !== a.totalCalls) return b.totalCalls - a.totalCalls;
    return a.fullName.localeCompare(b.fullName);
  });

  let contactsStatus = null;
  if (contactsStatusPath) {
    try { contactsStatus = JSON.parse(fs.readFileSync(contactsStatusPath, 'utf8')); } catch (e) {}
  }
  let callLogsStatus = null;
  if (callLogsStatusPath) {
    try { callLogsStatus = JSON.parse(fs.readFileSync(callLogsStatusPath, 'utf8')); } catch (e) {}
  }

  const lastHttpTs = Math.max(
    backupData?.timestamp || 0,
    callLogsData?.timestamp || 0,
    contactsStatus?.timestamp || 0,
    callLogsStatus?.timestamp || 0
  );

  return {
    success: true,
    metadata: {
      totalContacts: processedContacts.length,
      totalCalls: rawCallLogs.length,
      incomingCalls: globalIncoming,
      outgoingCalls: globalOutgoing,
      missedCalls: globalMissed,
      deviceModel: backupData?.deviceModel || callLogsData?.deviceModel || 'Dispositivo Remoto',
      lastSync: lastHttpTs ? new Date(lastHttpTs).toISOString() : null,
      lastSyncFormatted: lastHttpTs ? formatCompactDate(lastHttpTs) : '—'
    },
    contacts: processedContacts
  };
}

/**
 * Obtiene el catalogo de aplicaciones con cantidad de textos NLP y ultima actividad
 */
function getDeviceNlpApps(deviceId) {
  const safeId = sanitizeDeviceId(deviceId);
  const datasetFile = findDeviceDatasetFile(safeId);

  if (!datasetFile || !fs.existsSync(datasetFile)) {
    return {
      success: true,
      totalApps: 0,
      totalEvents: 0,
      apps: []
    };
  }

  const allItems = readJsonLinesFile(datasetFile);
  const userItems = allItems.filter(item => !isSystemInitEvent(item));

  const appsMap = {};
  userItems.forEach(item => {
    const appName = item.app_contexto || 'unknown';
    if (!appsMap[appName]) {
      appsMap[appName] = {
        packageName: appName,
        displayName: getAppDisplayName(appName),
        appIconSvg: getAppIcon(appName),
        count: 0,
        lastActivity: null,
        lastActivityFormatted: 'Reciente'
      };
    }
    appsMap[appName].count++;
    const itemDate = item.created_at || (item.ts ? new Date(item.ts).toISOString() : null);
    if (itemDate && (!appsMap[appName].lastActivity || new Date(itemDate) > new Date(appsMap[appName].lastActivity))) {
      appsMap[appName].lastActivity = itemDate;
      appsMap[appName].lastActivityFormatted = formatCompactDate(itemDate);
    }
  });

  const appsList = Object.values(appsMap).sort((a, b) => {
    const tA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const tB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    if (tB !== tA) return tB - tA;
    return b.count - a.count;
  });

  return {
    success: true,
    totalApps: appsList.length,
    totalEvents: userItems.length,
    apps: appsList
  };
}

/**
 * Obtiene registros paginados y filtrados de textos capturados para una app o todas
 */
function getDeviceNlpRecords(deviceId, appPackage, options = {}) {
  const { q = '', date = '', limit = 50, offset = 0 } = options;
  const safeId = sanitizeDeviceId(deviceId);
  const datasetFile = findDeviceDatasetFile(safeId);

  if (!datasetFile || !fs.existsSync(datasetFile)) {
    return {
      success: true,
      total: 0,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      records: []
    };
  }

  const allItems = readJsonLinesFile(datasetFile);
  const userItems = allItems.filter(item => !isSystemInitEvent(item));

  let filtered = userItems;
  if (appPackage) {
    const cleanPkg = String(appPackage).trim().toLowerCase();
    filtered = filtered.filter(item => String(item.app_contexto || 'unknown').toLowerCase() === cleanPkg);
  }

  if (q) {
    const query = String(q).trim().toLowerCase();
    filtered = filtered.filter(item => {
      const text = String(item.textoL || item.textoC || item.texto || '').toLowerCase();
      const pkg = String(item.app_contexto || '').toLowerCase();
      return text.includes(query) || pkg.includes(query);
    });
  }

  if (date) {
    const dateStr = String(date).trim();
    filtered = filtered.filter(item => {
      const itemDate = item.created_at || (item.ts ? new Date(item.ts).toISOString() : '');
      return itemDate && itemDate.startsWith(dateStr);
    });
  }

  filtered.sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : (a.ts || 0);
    const tB = b.created_at ? new Date(b.created_at).getTime() : (b.ts || 0);
    return tB - tA;
  });

  const total = filtered.length;
  const start = Math.max(0, parseInt(offset, 10) || 0);
  const maxItems = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const paged = filtered.slice(start, start + maxItems);

  const records = paged.map((item, idx) => {
    const ts = item.created_at || (item.ts ? new Date(item.ts).toISOString() : null);
    const text = item.textoL || item.textoC || item.texto || item.raw || '';
    const pkg = item.app_contexto || 'unknown';
    return {
      id: item.id || `rec_${start + idx}_${ts || Date.now()}`,
      text: text,
      appPackage: pkg,
      appName: getAppDisplayName(pkg),
      timestamp: ts,
      formattedDate: formatCompactDate(ts),
      fieldInfo: item.campo || item.field || ''
    };
  });

  return {
    success: true,
    total,
    limit: maxItems,
    offset: start,
    records
  };
}

module.exports = {
  findDeviceFile,
  findDeviceDatasetFile,
  normalizePhoneKey,
  getDeviceContactsAndCallLogs,
  getDeviceNlpApps,
  getDeviceNlpRecords
};
