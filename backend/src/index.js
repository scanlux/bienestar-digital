require('dotenv').config();
const express = require('express');
const cors = require('cors');
const appLogger = require('./utils/appLogger');
const db = require('./config/db');
const domiQueue = require('./services/domiQueue');
require('./services/fcmService');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('./config/redis');

const app = express();
const port = process.env.PORT || 4000;

// Trust reverse proxy headers (e.g. Nginx)
app.set('trust proxy', 1);

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Global response sanitization (prevents error message leaking in production)
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (obj) {
    if (obj && obj.error && process.env.NODE_ENV === 'production') {
      const errorMsg = String(obj.error).toLowerCase();
      // If the error message contains database or system internal keywords, sanitize it
      if (
        errorMsg.includes('sql') ||
        errorMsg.includes('database') ||
        errorMsg.includes('mariadb') ||
        errorMsg.includes('connection') ||
        errorMsg.includes('pool') ||
        errorMsg.includes('redis') ||
        errorMsg.includes('fs') ||
        errorMsg.includes('enoent') ||
        errorMsg.includes('stack') ||
        errorMsg.includes('uid') ||
        errorMsg.includes('api_key') ||
        errorMsg.includes('secret_key') ||
        errorMsg.includes('private_key') ||
        errorMsg.includes('password') ||
        errorMsg.includes('token') ||
        errorMsg.includes('secret') ||
        errorMsg.includes('hash') ||
        errorMsg.includes('cipher')
      ) {
        obj.error = 'Ocurrió un error interno en el servidor. Por favor contacte al soporte.';
      }
    }
    return originalJson.call(this, obj);
  };
  next();
});

// CORS: acepta orígenes desde env var (separados por coma) + localhost:3000 siempre en dev
const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (curl, mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Permitir localhost (cualquier puerto), 127.0.0.1 y el rango de IPs de Tailscale VPN (100.64.0.0 a 100.127.255.255)
    const isLocalhost = origin.startsWith('http://localhost:') || origin === 'http://localhost';
    const isLoopback = origin.startsWith('http://127.0.0.1:') || origin === 'http://127.0.0.1';
    const isTailscale = /^http:\/\/100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d+\.\d+(:\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || isLocalhost || isLoopback || isTailscale) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origen no permitido -> ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Helper factory to create a unique RedisStore instance for each limiter
const createRedisStore = (prefix) => new RedisStore({
  sendCommand: (...args) => redisClient.sendCommand(args),
  prefix: `rl:${prefix}:`,
});

// Global rate limiter: 300 requests per minute to accommodate rich admin dashboard loops and multi-tab use
const globalLimiter = rateLimit({
  store: createRedisStore('global'),
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas peticiones. Por favor, inténtelo de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Specific rate limiters for critical paths
const authLimiter = rateLimit({
  store: createRedisStore('auth'),
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 500 : 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor, espere un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  store: createRedisStore('register'),
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Demasiados intentos de registro. Por favor, espere un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const checkUserLimiter = rateLimit({
  store: createRedisStore('check_user'),
  windowMs: 60 * 1000,
  max: 10, // Max 10 user checks per minute to prevent mass enumeration (VULN-ENUM-01)
  message: { error: 'Demasiadas comprobaciones de usuario. Por favor, espere un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const calculateLimiter = rateLimit({
  store: createRedisStore('calculate'),
  windowMs: 60 * 1000,
  max: 30, // Max 30 calculations per minute
  message: { error: 'Demasiados cálculos solicitados. Por favor, espere un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply specific rate limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/mobile/register', registerLimiter);
app.use('/api/auth/mobile/register-full', registerLimiter);
app.use('/api/auth/mobile/token-sync', authLimiter);
app.use('/api/auth/mobile/check-user', checkUserLimiter);
app.use('/api/domi/calculate', calculateLimiter);

// Limit JSON payload to 1MB to prevent memory exhaustion DoS
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'backend'
  });
});

// Guardián global del modo mantenimiento
const maintenanceGuard = require('./middleware/maintenanceGuard');
app.use(maintenanceGuard);

const generateDomainRouter = require('./domains/intelligence/generate.router');
app.use('/api/generate', generateDomainRouter);

const authDomainRouter = require('./domains/auth/auth.router');
app.use('/api/auth', authDomainRouter);

const publicHomeRouter = require('./domains/public/public.home.router');
app.use('/api', publicHomeRouter);


const roleDomainRouter = require('./domains/role/role.router');
app.use('/api/manage', roleDomainRouter);

// Routers Modulares por Capas (Fase 1-4)
const commerceDomainRouter = require('./domains/commerce/commerce.router');
app.use('/api/manage/commerces', commerceDomainRouter);

const storeDomainRouter = require('./domains/store/store.router');
app.use('/api/manage', storeDomainRouter);

const upgradesDomainRouter = require('./domains/upgrades/upgrades.router');
app.use('/api/manage/upgrades', upgradesDomainRouter);

const catalogDomainRouter = require('./domains/catalog/catalog.router');
app.use('/api/manage', catalogDomainRouter);

const userDomainRouter = require('./domains/user/user.router');
app.use('/api/manage', userDomainRouter);

const notificationRouter = require('./domains/notification/notification.router');
app.use('/api/notifications', notificationRouter);

const cashDomainRouter = require('./domains/cash/cash.routes');
app.use('/api/cash', cashDomainRouter);

const orderDomainRouter = require('./domains/order/order.router');
app.use('/api/manage', orderDomainRouter);

const intelligenceDomainRouter = require('./domains/intelligence/intelligence.router');
app.use('/api/manage', intelligenceDomainRouter);

const adminDomainRouter = require('./domains/admin/admin.router');
app.use('/api/manage', adminDomainRouter);

const uploadDomainRouter = require('./domains/upload/upload.router');
app.use('/api/upload', uploadDomainRouter);

const publicDomainRouter = require('./domains/public/public.router');
app.use('/api/public', publicDomainRouter);

const domiDomainRouter = require('./domains/domi/domi.router');
app.use('/api/domi', domiDomainRouter);

const domiTreasuryRouter = require('./domains/domi/domi.treasury.router');
app.use('/api/domi/treasury', domiTreasuryRouter);

const orderPublicRouter = require('./domains/order/order.public.router');
app.use('/api/public/orders', orderPublicRouter);

const domiPaymentRouter = require('./domains/domi/domi.payment.router');
app.use('/api/payments', domiPaymentRouter);

const deliveryCompanyDomainRouter = require('./domains/delivery-company/delivery-company.router');
app.use('/api/delivery-company', deliveryCompanyDomainRouter);

const { onStartup } = require('./startup/secureStartup');

const http = require('http');
const { initSocketIO } = require('./config/socketio');

const server = http.createServer(app);

initSocketIO(server).catch(err =>
  appLogger.error(`[SOCKETIO_INIT_ERROR] ${err.message}`)
);

server.listen(port, () => {
  appLogger.info(`Backend running on port ${port} (HTTP + WebSockets)`);

  // Ejecutar inicialización de arranque seguro
  onStartup().catch(err => appLogger.error(`[STARTUP_ERROR] Fallo en onStartup: ${err.message}`));

  // Verificar integridad del token DOMI al arrancar (no-bloqueante)
  const domiEngine = require('./services/domiEngine');
  domiEngine.verifyIntegrity()
    .then(() => appLogger.info('[DOMI] Motor financiero listo.'))
    .catch(err => appLogger.warn(`[DOMI] Verificacion de integridad pendiente: ${err.message}`));

  // Iniciar worker de Redis de forma asíncrona pero persistente
  domiQueue.startWorker().catch(err => appLogger.error(`[WORKER_FATAL_ERROR] El worker falló y salió del loop: ${err.message}`));

  // Iniciar checker de periodo de gracia para grupos de órdenes
  const gracePeriodChecker = require('./domains/order/services/OrderGroupGracePeriodChecker');
  gracePeriodChecker.startChecker();
});

// Manejo de Graceful Shutdown (SIGTERM/SIGINT) para evitar 'zombie workers'
const gracefulShutdown = () => {
  appLogger.info('[SERVER] Señal de apagado recibida. Iniciando cierre ordenado...');
  
  // 1. Detener el Worker de Redis para que no tome más trabajos
  domiQueue.stopWorker();

  // 2. Cerrar el servidor HTTP (deja de aceptar nuevas peticiones)
  server.close(async () => {
    appLogger.info('[SERVER] HTTP server cerrado. Cerrando conexiones...');
    try {
      if (redisClient.isOpen) {
         await redisClient.quit();
         appLogger.info('[REDIS] Conexión cerrada limpiamente.');
      }
      
      if (db) {
         await db.end();
         appLogger.info('[MARIADB] Pool de conexiones cerrado.');
      }
      
      appLogger.info('[SERVER] Cierre completado. Saliendo...');
      process.exit(0);
    } catch (err) {
      appLogger.error(`[SHUTDOWN_ERROR] Fallo al cerrar conexiones: ${err.message}`);
      process.exit(1);
    }
  });
  
  // Failsafe timeout: Forzar salida si el cierre ordenado tarda mucho
  setTimeout(() => {
     appLogger.error('[SHUTDOWN_TIMEOUT] Forzando cierre del proceso...');
     process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
