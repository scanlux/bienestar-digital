const path = require('path');
const fs = require('fs');
const { getDatasetDir, sanitizeDeviceId } = require('../utils/helpers');

const setupDeviceSyncSocket = (io, app) => {
  const deviceSyncNamespace = io.of('/device-sync');
  if (app) {
    app.set('deviceSyncNamespace', deviceSyncNamespace);
  }

  deviceSyncNamespace.use((socket, next) => {
    const deviceId = socket.handshake.auth?.deviceId || socket.handshake.query?.deviceId;
    const isWeb = socket.handshake.auth?.isWeb || socket.handshake.query?.isWeb;

    if (deviceId) {
      socket.deviceId = sanitizeDeviceId(deviceId);
      socket.isWeb = isWeb === 'true' || isWeb === true;
      return next();
    }
    return next(new Error('Authentication error: deviceId is required for /device-sync'));
  });

  deviceSyncNamespace.on('connection', (socket) => {
    const deviceId = socket.deviceId;
    if (socket.isWeb) {
      const room = `web:device:${deviceId}`;
      socket.join(room);
      console.log(`[DEVICE_SYNC] Web client connected to room ${room} (Socket: ${socket.id})`);

      // Al conectar cliente web, notificarle el estado actual del dispositivo móvil
      const mobileRoom = deviceSyncNamespace.adapter.rooms.get(`device:${deviceId}`);
      const isMobileOnline = Boolean(mobileRoom && mobileRoom.size > 0);
      socket.emit('device:presence', { online: isMobileOnline, deviceId });
    } else {
      const room = `device:${deviceId}`;
      socket.join(room);
      console.log(`[DEVICE_SYNC] Mobile device connected to room ${room} (Socket: ${socket.id})`);

      // Notificar presencia activa a la sala web
      deviceSyncNamespace.to(`web:device:${deviceId}`).emit('device:presence', { online: true, deviceId });

      // Verificar si el índice de archivos existe en el servidor al conectar el teléfono
      const targetDir = getDatasetDir();
      const indexPath = path.join(targetDir, 'devices', deviceId, 'file_index.json');
      if (!fs.existsSync(indexPath)) {
        console.log(`[DEVICE_SYNC] File index missing on server for ${deviceId}. Requesting scan structure...`);
        socket.emit('sync:scan_structure', { deviceId });
        deviceSyncNamespace.to(`web:device:${deviceId}`).emit('sync:status_scanning', {
          deviceId,
          message: 'Solicitando escaneo de estructura al teléfono...'
        });
      }

      socket.on('device:ping', () => {
        socket.emit('device:pong', { timestamp: Date.now() });
      });

      // Retransmitir eventos de estado del móvil hacia la sala Web
      socket.on('sync:status', (data) => {
        deviceSyncNamespace.to(`web:device:${deviceId}`).emit('sync:status', data);
        console.log(`[DEVICE_SYNC] Forwarded sync:status from mobile to web:device:${deviceId}`);
      });

      socket.on('sync:status_scanning', (data) => {
        deviceSyncNamespace.to(`web:device:${deviceId}`).emit('sync:status_scanning', data);
        console.log(`[DEVICE_SYNC] Forwarded sync:status_scanning from mobile to web:device:${deviceId}`);
      });
    }

    socket.on('disconnect', () => {
      console.log(`[DEVICE_SYNC] Client disconnected: ${socket.id} (DeviceId: ${deviceId})`);
      if (!socket.isWeb) {
        const remainingSockets = deviceSyncNamespace.adapter.rooms.get(`device:${deviceId}`);
        if (!remainingSockets || remainingSockets.size === 0) {
          deviceSyncNamespace.to(`web:device:${deviceId}`).emit('device:presence', { online: false, deviceId });
        }
      }
    });
  });

  return deviceSyncNamespace;
};

module.exports = {
  setupDeviceSyncSocket
};
