// Trigger deploy to production ARM-USA (UFW-Docker integration applied - Local isolated dev mode)
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
        errorMsg.includes('key')
      ) {
        obj.error = 'Ocurrió un error interno en el servidor. Por favor contacte al soporte.';
      }
    }
    return originalJson.call(this, obj);
  };
  next();
});

// Global rate limiter: 100 requests per minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones. Por favor, inténtelo de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Specific rate limiters for critical paths
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor, espere un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Demasiados intentos de registro. Por favor, espere un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
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

// Apply specific rate limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/mobile/register', registerLimiter);
app.use('/api/auth/mobile/register-full', registerLimiter);

// Limit JSON payload to 1MB to prevent memory exhaustion DoS
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('uploads'));

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

const catalogDomainRouter = require('./domains/catalog/catalog.router');
app.use('/api/manage', catalogDomainRouter);

const userDomainRouter = require('./domains/user/user.router');
app.use('/api/manage', userDomainRouter);

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

const orderPublicRouter = require('./domains/order/order.public.router');
app.use('/api/public/orders', orderPublicRouter);

const domiPaymentRouter = require('./domains/domi/domi.payment.router');
app.use('/api/payments', domiPaymentRouter);

const deliveryCompanyDomainRouter = require('./domains/delivery-company/delivery-company.router');
app.use('/api/delivery-company', deliveryCompanyDomainRouter);

const onStartup = async () => {
  const appLogger = require('./utils/appLogger');
  const redisClient = require('./config/redis');
  const db = require('./config/db');

  appLogger.info('Iniciando arranque seguro del servidor arm-usa...');

  try {
    // 1. Forzar modo mantenimiento
    await redisClient.set('system:maintenance_mode', 'true');
    const details = {
      message: 'El sistema se encuentra en modo mantenimiento por reinicio de servicios.',
      estimated_end: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutos por defecto para desarrollo
      started_at: new Date().toISOString()
    };
    await redisClient.set('system:maintenance_details', JSON.stringify(details));
    appLogger.info('Estado de mantenimiento forzado a: ACTIVO (Bloqueo de Arranque).');

    // 2. Revocación global de sesiones (Epoch en segundos)
    const currentEpoch = Math.floor(Date.now() / 1000);
    await redisClient.set('system:global_revocation_epoch', currentEpoch.toString());
    appLogger.info(`Epoca de revocacion global establecida a: ${currentEpoch} (${new Date(currentEpoch * 1000).toISOString()}). Todos los tokens previos quedan invalidados.`);

    // 3. Loop de diagnóstico de conectividad con la Base de Datos
    let dbConnected = false;
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        appLogger.info(`Verificando conexion a MariaDB (Intento ${attempt}/10)...`);
        const [rows] = await db.query('SELECT 1');
        if (rows) {
          dbConnected = true;
          appLogger.info('Diagnostico MariaDB: CONEXION EXITOSA.');
          break;
        }
      } catch (err) {
        appLogger.warn(`Diagnostico MariaDB fallido: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!dbConnected) {
      appLogger.error('[CRITICAL] No se pudo establecer conexion con MariaDB tras 10 intentos.');
    } else {
      appLogger.info('Chequeo de arranque seguro finalizado con exito. El sistema permanece bloqueado para revision administrativa.');
    }
  } catch (err) {
    appLogger.error(`Error critico en la inicializacion de arranque seguro: ${err.message}`);
  }
};

const server = app.listen(port, () => {
  console.log(`Backend running on port ${port}`);

  // Ejecutar inicialización de arranque seguro
  onStartup().catch(err => console.error('[STARTUP_ERROR] Fallo en onStartup:', err));

  // Verificar integridad del token DOMI al arrancar (no-bloqueante)
  const domiEngine = require('./services/domiEngine');
  domiEngine.verifyIntegrity()
    .then(() => console.log('[DOMI] Motor financiero listo.'))
    .catch(err => console.warn('[DOMI] Verificacion de integridad pendiente:', err.message));

  // Iniciar worker de Redis de forma asíncrona pero persistente
  const domiQueue = require('./services/domiQueue');
  domiQueue.startWorker().catch(err => console.error('[WORKER_FATAL_ERROR] El worker falló y salió del loop:', err));
});

// Manejo de Graceful Shutdown (SIGTERM/SIGINT) para evitar 'zombie workers'
const gracefulShutdown = () => {
  console.log('\n[SERVER] Señal de apagado recibida. Iniciando cierre ordenado...');
  
  // 1. Detener el Worker de Redis para que no tome más trabajos
  const domiQueue = require('./services/domiQueue');
  domiQueue.stopWorker();

  // 2. Cerrar el servidor HTTP (deja de aceptar nuevas peticiones)
  server.close(async () => {
    console.log('[SERVER] HTTP server cerrado. Cerrando conexiones...');
    try {
      const redisClient = require('./config/redis');
      if (redisClient.isOpen) {
         await redisClient.quit();
         console.log('[REDIS] Conexión cerrada limpiamente.');
      }
      
      const pool = require('./config/db');
      if (pool) {
         await pool.end();
         console.log('[MARIADB] Pool de conexiones cerrado.');
      }
      
      console.log('[SERVER] Cierre completado. Saliendo...');
      process.exit(0);
    } catch (err) {
      console.error('[SHUTDOWN_ERROR] Fallo al cerrar conexiones:', err);
      process.exit(1);
    }
  });
  
  // Failsafe timeout: Forzar salida si el cierre ordenado tarda mucho
  setTimeout(() => {
     console.error('[SHUTDOWN_TIMEOUT] Forzando cierre del proceso...');
     process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
