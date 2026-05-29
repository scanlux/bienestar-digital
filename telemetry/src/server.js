const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!JWT_SECRET) {
  console.error('[CRITICAL] JWT_SECRET is not set in environment variables');
  process.exit(1);
}

// 1. Initialize Express and HTTP Server
const app = express();
app.use(express.json());

// Healthcheck endpoint for telemetry instance monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'telemetry' });
});

const httpServer = createServer(app);

// 2. Initialize Redis Clients
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

const initRedis = async () => {
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('[INFO] Redis clients connected successfully');
  } catch (err) {
    console.error('[CRITICAL] Failed to connect to Redis:', err);
    process.exit(1);
  }
};

// 3. Start Server Setup
const startServer = async () => {
  await initRedis();

  // Initialize Socket.io with Redis Adapter for horizontal scaling
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all origins for mobile clients
      methods: ['GET', 'POST']
    },
    adapter: createAdapter(pubClient, subClient)
  });

  // Authentication Middleware for Socket.io Connections
  io.use((socket, next) => {
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

  // Tracking Namespace (Drivers publishing, clients/monitors listening)
  const trackingNamespace = io.of('/tracking');

  trackingNamespace.on('connection', (socket) => {
    const { userId, role } = socket.user;
    console.log(`[INFO] Client connected: ${socket.id} (User: ${userId}, Role: ${role})`);

    // Drivers join their own room and update locations
    if (role === 'driver' || role === 'repartidor') {
      socket.join(`driver:${userId}`);

      // Handle location updates from the driver's device
      socket.on('location:update', async (data) => {
        const { latitude, longitude, orderId } = data;

        if (!latitude || !longitude) {
          console.warn(`[WARN] Invalid coordinates received from driver ${userId}`);
          return;
        }

        const latNum = parseFloat(latitude);
        const lonNum = parseFloat(longitude);

        try {
          const activeKey = `driver:active:${userId}`;
          const geoKey = 'driver:location';

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
              timestamp: Date.now()
            });
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

  // REST API Endpoints on Telemetry Service
  
  // Endpoint to get a driver's current position (called by the main backend in USA)
  app.get('/api/telemetry/driver/:driverId', async (req, res) => {
    const { driverId } = req.params;

    try {
      const activeKey = `driver:active:${driverId}`;
      const isActive = await pubClient.get(activeKey);

      // If the driver hasn't updated location in 1 minute, consider them inactive
      if (!isActive) {
        // Clean up from GEOSET
        await pubClient.zRem('driver:location', String(driverId));
        return res.status(404).json({ error: 'Driver is inactive or location expired' });
      }

      // Fetch position from Redis (Returns array of {longitude, latitude})
      const pos = await pubClient.geoPos('driver:location', String(driverId));

      if (!pos || pos.length === 0 || !pos[0]) {
        return res.status(404).json({ error: 'Location not found' });
      }

      return res.status(200).json({
        driverId,
        longitude: pos[0].longitude,
        latitude: pos[0].latitude,
        active: true
      });

    } catch (err) {
      console.error(`[ERROR] Failed to retrieve driver location for ${driverId}:`, err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start HTTP Listening
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUCCESS] Telemetry server listening on 0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('[CRITICAL] Server failed to start:', err);
  process.exit(1);
});
