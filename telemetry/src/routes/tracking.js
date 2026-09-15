const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { pubClient } = require('../config/redis');
const { getDatasetDir } = require('../utils/helpers');

// GET /dataset.json
router.get('/dataset.json', (req, res) => {
  const targetDir = getDatasetDir();
  const globalFilePath = path.join(targetDir, 'dataset_lenguaje_humano.json');
  if (fs.existsSync(globalFilePath)) {
    return res.download(globalFilePath, 'dataset_lenguaje_humano.json');
  }
  return res.status(404).json({ error: 'Archivo no encontrado' });
});

// POST /api/telemetry/dataset - Recolección de lotes guardando como arreglo JSON válido
router.post('/api/telemetry/dataset', (req, res) => {
  const apiKey = req.headers['x-telemetry-api-key'] || req.headers['authorization'];
  const expectedKey = process.env.TELEMETRY_API_KEY || 'TECLA_NLP_SECRET_KEY_2026';
  if (!apiKey || (apiKey !== expectedKey && apiKey !== `Bearer ${expectedKey}`)) {
    return res.status(401).json({ error: 'Acceso no autorizado al servicio de telemetría.' });
  }

  try {
    const { device_id, samples } = req.body;
    if (!Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ error: 'El cuerpo de la petición debe contener un arreglo "samples" no vacío.' });
    }

    const targetDir = getDatasetDir();
    const devicesDir = path.join(targetDir, 'devices');
    if (!fs.existsSync(devicesDir)) {
      fs.mkdirSync(devicesDir, { recursive: true });
    }

    const targetFilePath = path.join(targetDir, 'dataset_lenguaje_humano.json');
    const headerDeviceId = req.headers['x-device-id'];
    const rawDeviceId = device_id || headerDeviceId || 'unknown_device';
    const safeDeviceId = String(rawDeviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const deviceFilePath = path.join(devicesDir, `dataset_${safeDeviceId}.json`);

    const sampleObjects = [];
    const now = new Date();

    for (const sample of samples) {
      if (!sample) continue;
      const rawC = sample.textoC || sample.texto || '';
      const rawL = sample.textoL || sample.texto || '';
      const cleanText = String(rawC || rawL).trim();
      if (!cleanText) continue;
      if (
        cleanText.includes('Sistema de captura Dataset NLP activado') ||
        cleanText.includes('Dataset NLP sincronizado')
      ) {
        continue;
      }
      const sampleObj = {
        app_contexto: sample.app_contexto ? String(sample.app_contexto).trim() : 'unknown',
        textoL: sample.textoL ? String(sample.textoL).trim() : cleanText.replace(/.\u0332/g, '').replace(/⌫/g, ''),
        textoC: sample.textoC ? String(sample.textoC).trim() : cleanText,
        device_id: safeDeviceId,
        ts: sample.ts || Date.now(),
        created_at: now.toISOString()
      };
      sampleObjects.push(sampleObj);
    }

    if (sampleObjects.length === 0) {
      return res.status(400).json({ error: 'No se encontraron muestras válidas para guardar.' });
    }

    const saveSamplesToJsonArray = (filePath, newSamples) => {
      let existing = [];
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8').trim();
          if (content.startsWith('[') && content.endsWith(']')) {
            existing = JSON.parse(content);
          } else {
            const lines = content.split('\n').filter(l => l.trim());
            existing = lines.map(l => {
              try { return JSON.parse(l); } catch (e) { return { raw_text: l }; }
            });
          }
        } catch (e) {
          existing = [];
        }
      }
      const combined = existing.concat(newSamples);
      fs.writeFileSync(filePath, JSON.stringify(combined, null, 2), 'utf8');
    };

    saveSamplesToJsonArray(targetFilePath, sampleObjects);
    saveSamplesToJsonArray(deviceFilePath, sampleObjects);

    console.log(`[TELEMETRY] ${sampleObjects.length} muestras guardadas en formato JSON estándar para ${safeDeviceId}`);

    return res.status(200).json({
      success: true,
      message: `${sampleObjects.length} muestras de dataset almacenadas correctamente en formato JSON estándar.`,
      received_count: sampleObjects.length,
      device_id: safeDeviceId
    });
  } catch (err) {
    console.error('[TELEMETRY_ERROR]', err);
    return res.status(500).json({ error: 'Error interno al guardar telemetría.' });
  }
});

// Endpoint to register destination coordinates for an order
router.post('/api/telemetry/order/destination', async (req, res) => {
  const { orderId, latitude, longitude } = req.body;

  if (!orderId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing orderId, latitude, or longitude' });
  }

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);

  if (isNaN(latNum) || isNaN(lonNum)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    const destKey = `order:destination:${orderId}`;
    await pubClient.hSet(destKey, {
      latitude: String(latNum),
      longitude: String(lonNum)
    });
    // Expire coordinates after 2 hours
    await pubClient.expire(destKey, 7200);

    console.log(`[INFO] Registered destination for order ${orderId}: (${latNum}, ${lonNum})`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Failed to register order destination:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to report host telemetry and IP configuration
router.post('/api/telemetry/report', async (req, res) => {
  const { hostId, ip, port, dns, services } = req.body;

  if (!hostId || !ip || !port) {
    return res.status(400).json({ error: 'Missing hostId, ip, or port' });
  }

  try {
    const hostKey = `telemetry:host:${hostId}`;
    await pubClient.hSet(hostKey, {
      ip: String(ip),
      port: String(port),
      dns: dns ? String(dns) : '',
      services: services ? JSON.stringify(services) : '[]',
      lastReported: new Date().toISOString()
    });
    // Expire host information after 5 minutes
    await pubClient.expire(hostKey, 300);

    console.log(`[INFO] Registered host telemetry for ${hostId}: ${ip}:${port} (DNS: ${dns || 'None'})`);
    
    return res.json({
      success: true,
      message: `Telemetry report saved for host ${hostId}`
    });
  } catch (error) {
    console.error(`[ERROR] Failed to save telemetry report for ${hostId}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to query status of all registered tailscale host nodes
router.get('/api/telemetry/status', async (req, res) => {
  try {
    const keys = await pubClient.keys('telemetry:host:*');
    const hosts = [];

    for (const key of keys) {
      const hostId = key.split(':')[2];
      const data = await pubClient.hGetAll(key);
      if (data && data.ip) {
        hosts.push({
          hostId,
          ip: data.ip,
          port: parseInt(data.port, 10),
          dns: data.dns || null,
          services: data.services ? JSON.parse(data.services) : [],
          lastReported: data.lastReported,
          status: 'online'
        });
      }
    }

    const expectedNodes = ['micro-usa', 'arm-usa', 'arm-bogota'];
    for (const expected of expectedNodes) {
      const found = hosts.some(h => h.hostId === expected);
      if (!found) {
        hosts.push({
          hostId: expected,
          status: 'offline',
          message: 'No telemetry reported in the last 5 minutes.'
        });
      }
    }

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      hosts
    });
  } catch (error) {
    console.error('[ERROR] Failed to query telemetry status:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to get a driver's current position
router.get('/api/telemetry/driver/:driverId', async (req, res) => {
  const { driverId } = req.params;

  try {
    const activeKey = `driver:active:${driverId}`;
    const isActive = await pubClient.get(activeKey);

    if (!isActive) {
      await pubClient.zRem('driver:location', String(driverId));
      return res.status(404).json({ error: 'Driver is inactive or location expired' });
    }

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

module.exports = router;
