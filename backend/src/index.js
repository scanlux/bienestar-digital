require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

// CORS: acepta orígenes desde env var (separados por coma) + localhost:3000 siempre en dev
const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (curl, mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido -> ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'backend'
  });
});

const analyzeRoutes = require('./routes/analyze');
app.use('/api', analyzeRoutes);

const generateRoutes = require('./routes/generate');
app.use('/api/generate', generateRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const homeRoutes = require('./routes/home');
app.use('/api', homeRoutes);

const preguntasRoutes = require('./routes/preguntas');
app.use('/api/preguntas', preguntasRoutes);

const managementRoutes = require('./routes/management');
app.use('/api/manage', managementRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/manage/users', usersRoutes);

const uploadRoutes = require('./routes/upload');
app.use('/api/upload', uploadRoutes);

const publicRoutes = require('./routes/public');
app.use('/api/public', publicRoutes);

const domiRoutes = require('./routes/domi');
app.use('/api/domi', domiRoutes);

const ordersRoutes = require('./routes/orders');
app.use('/api/public/orders', ordersRoutes);

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Backend running on port ${port}`);

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
