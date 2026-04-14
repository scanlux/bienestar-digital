const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
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
