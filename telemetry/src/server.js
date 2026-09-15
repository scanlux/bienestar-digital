// Telemetry Service Main Entrypoint (Refactored Layered Architecture)
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const cors = require('cors');
require('dotenv').config();

// Config & Clients
const { PORT, ensureUploadDirs } = require('./config/env');
const { pubClient, subClient, initRedis } = require('./config/redis');

// Sockets
const { setupDeviceSyncSocket } = require('./sockets/deviceSyncSocket');
const { setupTrackingSocket } = require('./sockets/trackingSocket');

// Routes
const healthRouter = require('./routes/health');
const publicRequestsRouter = require('./routes/publicRequests');
const mediaRouter = require('./routes/media');
const trackingRouter = require('./routes/tracking');
const deviceSyncRouter = require('./routes/deviceSync');
const explorerRouter = require('./routes/explorer');

// Initialize required uploads directories
ensureUploadDirs();

const app = express();

// Global Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.json({ limit: '100mb' }));

const httpServer = createServer(app);

// Mount Routers
app.use('/', healthRouter);
app.use('/', publicRequestsRouter);
app.use('/', mediaRouter);
app.use('/', trackingRouter);
app.use('/', deviceSyncRouter);
app.use('/', explorerRouter);

// Start Server & Redis Connections
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

  // Setup Socket Namespaces
  setupDeviceSyncSocket(io, app);
  setupTrackingSocket(io);

  // Start HTTP Listening
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUCCESS] Telemetry server listening on 0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('[CRITICAL] Server failed to start:', err);
  process.exit(1);
});
