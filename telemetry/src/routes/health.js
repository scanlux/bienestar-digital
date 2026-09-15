const express = require('express');
const router = express.Router();

// GET /health - Monitoreo de salud del servicio de telemetría
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'telemetry' });
});

module.exports = router;
