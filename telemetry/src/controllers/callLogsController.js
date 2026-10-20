const fs = require('fs');
const path = require('path');
const { getDatasetDir, sanitizeDeviceId } = require('../utils/helpers');

// Helper de persistencia de llamadas
const getCallLogsBackupPath = (safeDeviceId) => {
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeDeviceId);
  if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true });
  return path.join(deviceDir, 'call_logs_backup.json');
};

const getCallLogsStatusPath = (safeDeviceId) => {
  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeDeviceId);
  if (!fs.existsSync(deviceDir)) fs.mkdirSync(deviceDir, { recursive: true });
  return path.join(deviceDir, 'call_logs_status.json');
};

// POST Call Logs Backup
const handleCallLogsBackup = (req, res) => {
  try {
    const headerDeviceId = req.headers['x-device-id'];
    const deviceIdParam = req.params.deviceId;
    const { deviceId, device_id, callLogs, hash, timestamp, deviceModel, callCount } = req.body;
    const rawDeviceId = deviceIdParam || deviceId || device_id || headerDeviceId;

    const records = Array.isArray(callLogs) ? callLogs : (Array.isArray(req.body.records) ? req.body.records : []);

    if (!rawDeviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }

    const safeDeviceId = sanitizeDeviceId(rawDeviceId);
    const backupRecord = {
      deviceId: safeDeviceId,
      rawDeviceId,
      deviceModel: deviceModel || 'Dispositivo Remoto',
      timestamp: timestamp || Date.now(),
      callCount: callCount || records.length,
      hash: hash || '',
      callLogs: records,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(getCallLogsBackupPath(safeDeviceId), JSON.stringify(backupRecord, null, 2), 'utf8');
    fs.writeFileSync(getCallLogsStatusPath(safeDeviceId), JSON.stringify({ status: 'ready', timestamp: Date.now() }, null, 2), 'utf8');

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
              fs.writeFileSync(path.join(aliasDir, 'call_logs_backup.json'), JSON.stringify(backupRecord, null, 2), 'utf8');
              fs.writeFileSync(path.join(aliasDir, 'call_logs_status.json'), JSON.stringify({ status: 'ready', timestamp: Date.now() }, null, 2), 'utf8');
            }
          }
        }
      }
    } catch (e) {}

    console.log(`[CALL_LOGS_BACKUP] Saved ${records.length} call log records for device: ${safeDeviceId}`);
    return res.json({
      success: true,
      message: 'Respaldo de llamadas guardado correctamente',
      deviceId: safeDeviceId,
      callCount: records.length,
      hash: backupRecord.hash
    });
  } catch (err) {
    console.error('Error in handleCallLogsBackup:', err);
    return res.status(500).json({ success: false, error: 'Internal server error processing call logs backup' });
  }
};

// POST Call Logs Status
const handleCallLogsStatus = (req, res) => {
  try {
    const headerDeviceId = req.headers['x-device-id'];
    const deviceIdParam = req.params.deviceId;
    const { deviceId, device_id, status, message } = req.body;
    const rawDeviceId = deviceIdParam || deviceId || device_id || headerDeviceId;

    if (!rawDeviceId) return res.status(400).json({ success: false, error: 'deviceId is required' });
    const safeDeviceId = sanitizeDeviceId(rawDeviceId);

    fs.writeFileSync(getCallLogsStatusPath(safeDeviceId), JSON.stringify({
      status: status || 'syncing',
      message: message || 'Sincronizando registro de llamadas...',
      timestamp: Date.now()
    }, null, 2), 'utf8');

    return res.json({ success: true, status: status || 'syncing' });
  } catch (err) {
    console.error('Error in handleCallLogsStatus:', err);
    return res.status(500).json({ success: false, error: 'Internal server error updating call logs status' });
  }
};

// GET Call Logs Backup
const handleGetCallLogs = (req, res) => {
  try {
    const rawDeviceId = req.params.deviceId || req.query.deviceId || req.headers['x-device-id'];
    if (!rawDeviceId) return res.status(400).json({ success: false, error: 'deviceId is required' });

    const safeDeviceId = sanitizeDeviceId(rawDeviceId);
    const backupPath = getCallLogsBackupPath(safeDeviceId);

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
          const altBackupPath = path.join(devicesDir, item, 'call_logs_backup.json');
          if (fs.existsSync(altBackupPath)) {
            try {
              const backupData = JSON.parse(fs.readFileSync(altBackupPath, 'utf8'));
              return res.json({ success: true, status: 'ready', ...backupData });
            } catch (e) {}
          }
        }
      }
    }

    const statusPath = getCallLogsStatusPath(safeDeviceId);
    if (fs.existsSync(statusPath)) {
      try {
        const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        if (statusData && statusData.status === 'syncing') {
          return res.json({ success: true, status: 'syncing', message: statusData.message });
        }
      } catch (e) {}
    }

    return res.status(404).json({ success: false, status: 'not_found', error: `No call logs found for device ${rawDeviceId}`, deviceId: safeDeviceId });
  } catch (err) {
    console.error('Error in handleGetCallLogs:', err);
    return res.status(500).json({ success: false, error: 'Internal server error reading call logs' });
  }
};

module.exports = {
  handleCallLogsBackup,
  handleCallLogsStatus,
  handleGetCallLogs
};
