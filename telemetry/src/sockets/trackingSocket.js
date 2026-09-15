const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { pubClient } = require('../config/redis');
const { getHaversineDistance } = require('../utils/geo');
const { logTelemetrySecurityEvent } = require('../services/auditService');

const setupTrackingSocket = (io) => {
  const trackingNamespace = io.of('/tracking');

  trackingNamespace.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token is required'));
    }

    try {
      // Verify JWT locally using shared secret
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded; // Store decoded user payload (id, role, name)
      next();
    } catch (err) {
      console.warn(`[WARN] Auth failed for socket ${socket.id}: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  trackingNamespace.on('connection', (socket) => {
    const { userId, role } = socket.user;
    console.log(`[INFO] Client connected: ${socket.id} (User: ${userId}, Role: ${role})`);

    // Drivers join their own room and update locations
    if (role === 'driver' || role === 'repartidor') {
      socket.join(`driver:${userId}`);

      // Handle location updates from the driver's device
      socket.on('location:update', async (data) => {
        const { latitude, longitude, heading, orderId } = data;

        if (!latitude || !longitude) {
          console.warn(`[WARN] Invalid coordinates received from driver ${userId}`);
          return;
        }

        const latNum = parseFloat(latitude);
        const lonNum = parseFloat(longitude);
        const headNum = heading !== undefined && heading !== null ? parseFloat(heading) : null;

        try {
          const activeKey = `driver:active:${userId}`;
          const geoKey = 'driver:location';

          // A. Detección de Mock Locations (GPS Spoofing)
          if (data.mocked === true || data.mocked === 'true') {
            console.warn(`[SECURITY WARNING] Mock location detected for driver ${userId}`);
            
            // Remover estado activo en Redis preventivamente
            await pubClient.del(activeKey);
            
            await logTelemetrySecurityEvent(
              userId,
              'GPS_SPOOFING_ATTEMPT',
              'HIGH',
              {
                reason: 'Dispositivo móvil reportó flag mocked = true (Simulador GPS detectado)',
                latitude: latNum,
                longitude: lonNum,
                orderId
              },
              'user',
              userId
            );
            return;
          }

          // B. Control de Teletransportación / Velocidad Física (Anti-Jump)
          const telemetryMetaKey = `driver:telemetry:${userId}`;
          const lastTelemetry = await pubClient.hGetAll(telemetryMetaKey);

          if (lastTelemetry && lastTelemetry.latitude && lastTelemetry.longitude && lastTelemetry.timestamp) {
            const lastLat = parseFloat(lastTelemetry.latitude);
            const lastLon = parseFloat(lastTelemetry.longitude);
            const lastTime = parseInt(lastTelemetry.timestamp, 10);
            
            const timeDeltaSeconds = (Date.now() - lastTime) / 1000;
            
            if (timeDeltaSeconds > 1) { // Evitar división por cero
              const distanceMeters = getHaversineDistance(latNum, lonNum, lastLat, lastLon);
              const speedKmh = (distanceMeters / timeDeltaSeconds) * 3.6;
              
              // Velocidad físicamente imposible para un entorno urbano terrestre (> 150 km/h)
              if (speedKmh > 150 && distanceMeters > 100) {
                console.warn(`[SECURITY WARNING] Driver ${userId} jump detected: ${distanceMeters.toFixed(1)}m in ${timeDeltaSeconds.toFixed(1)}s (${speedKmh.toFixed(1)} km/h)`);
                
                await pubClient.del(activeKey);
                
                await logTelemetrySecurityEvent(
                  userId,
                  'GPS_SPOOFING_ATTEMPT',
                  'HIGH',
                  {
                    reason: 'Salto geográfico imposible detectado (Anti-Jump)',
                    latitude: latNum,
                    longitude: lonNum,
                    distanceMeters,
                    timeDeltaSeconds,
                    speedKmh,
                    orderId
                  },
                  'user',
                  userId
                );
                return;
              }
            }
          }

          // Guardar estado actual para siguiente verificación
          await pubClient.hSet(telemetryMetaKey, {
            latitude: String(latNum),
            longitude: String(lonNum),
            timestamp: String(Date.now())
          });
          await pubClient.expire(telemetryMetaKey, 1800); // Expirar en 30 min

          // 1. Save location in Redis GEOSET (Longitude first, then Latitude in Redis)
          await pubClient.geoAdd(geoKey, {
            longitude: lonNum,
            latitude: latNum,
            member: String(userId)
          });

          // 2. Set/refresh the 1-minute TTL active state key
          await pubClient.set(activeKey, '1', { EX: 60 });

          // 3. Broadcast the update to the specific order room (for clients tracking this order)
          if (orderId) {
            trackingNamespace.to(`order:${orderId}`).emit('location:changed', {
              driverId: userId,
              latitude: latNum,
              longitude: lonNum,
              heading: headNum,
              timestamp: Date.now()
            });

            // 4. Calculate distance to destination and trigger proximity alert if within 15 meters
            let destLat = null;
            let destLon = null;

            // Check if destination coordinates were passed in the update payload
            if (data.destLatitude !== undefined && data.destLongitude !== undefined) {
              destLat = parseFloat(data.destLatitude);
              destLon = parseFloat(data.destLongitude);
            } else {
              // Otherwise, attempt to load them from Redis (previously registered by the main backend)
              const destKey = `order:destination:${orderId}`;
              const destData = await pubClient.hGetAll(destKey);
              if (destData && destData.latitude && destData.longitude) {
                destLat = parseFloat(destData.latitude);
                destLon = parseFloat(destData.longitude);
              }
            }

            if (destLat !== null && destLon !== null && !isNaN(destLat) && !isNaN(destLon)) {
              const distanceMeters = getHaversineDistance(latNum, lonNum, destLat, destLon);
              console.log(`[INFO] Proximity check for Order ${orderId}: Driver is ${distanceMeters.toFixed(2)}m away from destination`);

              if (distanceMeters <= 15) {
                const notifiedKey = `order:notified:${orderId}`;
                const alreadyNotified = await pubClient.get(notifiedKey);

                if (!alreadyNotified) {
                  // Mark as notified in Redis with a 5-minute TTL to avoid duplicate alerts
                  await pubClient.set(notifiedKey, '1', { EX: 300 });

                  // Emit proximity alert to client/room
                  console.log(`[TRIGGER] Proximity alert: Driver ${userId} is arriving for Order ${orderId}!`);
                  trackingNamespace.to(`order:${orderId}`).emit('order:proximity', {
                    orderId,
                    driverId: userId,
                    distanceMeters,
                    message: 'Está llegando tu Domi'
                  });
                }
              }
            }
          }

          // Also broadcast to the driver's specific monitors (if any)
          trackingNamespace.to(`driver:${userId}:monitor`).emit('location:changed', {
            driverId: userId,
            latitude: latNum,
            longitude: lonNum,
            timestamp: Date.now()
          });

        } catch (err) {
          console.error(`[ERROR] Failed to save location for driver ${userId}:`, err);
        }
      });
    }

    // Clients/Monitors join specific order rooms to receive tracking updates
    socket.on('order:track', (data) => {
      const { orderId } = data;
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`[INFO] Client ${socket.id} joined tracking for order: ${orderId}`);
      }
    });

    socket.on('order:untrack', (data) => {
      const { orderId } = data;
      if (orderId) {
        socket.leave(`order:${orderId}`);
        console.log(`[INFO] Client ${socket.id} left tracking for order: ${orderId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[INFO] Client disconnected: ${socket.id} (User: ${userId})`);
    });
  });

  return trackingNamespace;
};

module.exports = {
  setupTrackingSocket
};
