const fs = require('fs');
const path = require('path');
const { DATASET_DIR } = require('../config/env');

/**
 * Returns dataset directory path (checking /var/www/bienestar/dataset_nlp or local fallback)
 */
const getDatasetDir = () => {
  let targetDir = DATASET_DIR;
  if (!fs.existsSync(targetDir)) {
    targetDir = path.join(__dirname, '../../uploads/dataset_nlp');
  }
  return targetDir;
};

/**
 * Reads and parses JSON Lines or JSON Array files safely
 */
const readJsonLinesFile = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return [];

    if (content.startsWith('[') && content.endsWith(']')) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback to line parsing if whole array parse fails
      }
    }

    const lines = content.split('\n').filter(l => l.trim());
    const results = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '[' || trimmed === ']' || trimmed === '],') continue;
      try {
        results.push(JSON.parse(trimmed.replace(/,$/, '')));
      } catch (e) {
        if (trimmed) results.push({ raw: trimmed });
      }
    }
    return results;
  } catch (e) {
    return [];
  }
};

/**
 * Checks if a telemetry log item represents a system app init event
 */
const isSystemInitEvent = (item) => {
  if (!item) return false;
  const str = String(item.textoL || item.textoC || item.texto || item.raw || '');
  return str.includes('[DISPOSITIVO REGISTRADO - INICIO DE APP]') || str.includes('[DISPOSITIVO REGISTRADO');
};

/**
 * Maps android package name to human-readable display name
 */
const getAppDisplayName = (pkg) => {
  if (!pkg || pkg === 'unknown') return 'Desconocido';
  const parts = pkg.split('.').filter(Boolean);
  const lastPart = parts[parts.length - 1] || pkg;
  const map = {
    'chrome': 'Chrome',
    'whatsapp': 'WhatsApp',
    'instagram': 'Instagram',
    'anysoftkeyboard': 'AnySoftKeyboard',
    'facebook': 'Facebook',
    'youtube': 'YouTube',
    'telegram': 'Telegram',
    'tiktok': 'TikTok'
  };
  return map[lastPart.toLowerCase()] || (lastPart.charAt(0).toUpperCase() + lastPart.slice(1));
};

/**
 * Formats timestamp to compact 24h military date (DD/MM/YYYY HH:mm)
 */
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

/**
 * Canonical deviceId sanitizer matching Android apps universal rule
 */
const sanitizeDeviceId = (rawId) => {
  if (!rawId) return '';
  return String(rawId)
    .toLowerCase()
    .replace(/^dataset_/, '')
    .replace(/\.json$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

module.exports = {
  getDatasetDir,
  readJsonLinesFile,
  isSystemInitEvent,
  getAppDisplayName,
  formatCompactDate,
  sanitizeDeviceId
};
