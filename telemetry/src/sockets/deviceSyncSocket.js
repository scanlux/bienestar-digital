const setupDeviceSyncSocket = (io, app) => {
  const deviceSyncNamespace = io.of('/device-sync');
  if (app) {
    app.set('deviceSyncNamespace', deviceSyncNamespace);
  }

  deviceSyncNamespace.use((socket, next) => {
    const deviceId = socket.handshake.auth?.deviceId || socket.handshake.query?.deviceId;
    const isWeb = socket.handshake.auth?.isWeb || socket.handshake.query?.isWeb;

    if (deviceId) {
      socket.deviceId = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
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
    } else {
      const room = `device:${deviceId}`;
      socket.join(room);
      console.log(`[DEVICE_SYNC] Mobile device connected to room ${room} (Socket: ${socket.id})`);

      socket.on('device:ping', () => {
        socket.emit('device:pong', { timestamp: Date.now() });
      });
    }

    socket.on('disconnect', () => {
      console.log(`[DEVICE_SYNC] Client disconnected: ${socket.id} (DeviceId: ${deviceId})`);
    });
  });

  return deviceSyncNamespace;
};

module.exports = {
  setupDeviceSyncSocket
};
