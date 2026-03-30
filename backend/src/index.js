//C:\Users\Administrador\.gemini\antigravity\scratch\bienestar-digital\backend\src\index.js
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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'backend'
  });
});

const analyzeRoutes = require('./routes/analyze');
app.use('/api', analyzeRoutes);

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend running on port ${port}`);
});
