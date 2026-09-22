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

// Trust reverse proxy (Nginx) for accurate client IP detection and HTTPS cookies
app.set('trust proxy', 1);

// Disable Express identification header
app.disable('x-powered-by');

// Security Headers Middleware (Defense-in-Depth)
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' wss: https:; frame-ancestors 'none';");
  next();
});

// Global Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

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
