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

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend running on port ${port}`);
});
