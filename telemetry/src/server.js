// Trigger deploy to production ARM-Bogota (UFW-Docker integration applied)
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const axios = require('axios');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');


const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!JWT_SECRET) {
  console.error('[CRITICAL] JWT_SECRET is not set in environment variables');
  process.exit(1);
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

// Ensure uploads directory structure exists
const ensureUploadDirs = () => {
  const types = ['stores', 'commerces', 'products', 'videos', 'requests'];
  types.forEach(t => {
    const dir = path.join(UPLOAD_DIR, t);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};
ensureUploadDirs();

// Helper to calculate geographical distance between two coordinates in meters (Haversine formula)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// 1. Initialize Express and HTTP Server
const app = express();

// Configure CORS for Express HTTP routes
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'http://localhost:3000',
      'https://trendy.sytes.net'
    ];
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:') || origin.startsWith('http://192.168.')) {
      return callback(null, true);
    } else {
      return callback(new Error('Bloqueado por CORS: Origen no permitido'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Serve static files safely with custom security headers for PDFs and images
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Content-Disposition', 'inline');
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      res.setHeader('Content-Security-Policy', "default-src 'none'");
    }
  }
}));

// Healthcheck endpoint for telemetry instance monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'telemetry' });
});

const httpServer = createServer(app);

// 2. Initialize Redis Clients
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

const initRedis = async () => {
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('[INFO] Redis clients connected successfully');
  } catch (err) {
    console.error('[CRITICAL] Failed to connect to Redis:', err);
    process.exit(1);
  }
};

// Enviar logs de seguridad al backend principal por HTTP
const logTelemetrySecurityEvent = async (userId, eventType, severity, details = null, resourceType = null, resourceId = null) => {
  const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
  try {
    await axios.post(`${backendUrl}/api/public/internal/security-logs`, {
      userId,
      eventType,
      severity,
      details,
      resourceType,
      resourceId
    }, {
      headers: {
        'x-internal-key': process.env.INTERNAL_API_KEY || ''
      }
    });
    console.log(`[SECURITY_FORWARD] Evento ${eventType} enviado correctamente al backend principal.`);
  } catch (err) {
    console.error(`[SECURITY_FORWARD_ERROR] Fallo al reenviar evento ${eventType} al backend:`, err.message);
  }
};

// 3. Start Server Setup
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

  // Authentication Middleware for Socket.io Connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token is required'));
    }

    try {
      // Verify JWT locally using shared secret
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded; // Store decoded user payload (id, role, name)
      next();
    } catch (err) {
      console.warn(`[WARN] Auth failed for socket ${socket.id}: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // Tracking Namespace (Drivers publishing, clients/monitors listening)
  const trackingNamespace = io.of('/tracking');

  trackingNamespace.on('connection', (socket) => {
    const { userId, role } = socket.user;
    console.log(`[INFO] Client connected: ${socket.id} (User: ${userId}, Role: ${role})`);

    // Drivers join their own room and update locations
    if (role === 'driver' || role === 'repartidor') {
      socket.join(`driver:${userId}`);

      // Handle location updates from the driver's device
      socket.on('location:update', async (data) => {
        const { latitude, longitude, heading, orderId } = data;

        if (!latitude || !longitude) {
          console.warn(`[WARN] Invalid coordinates received from driver ${userId}`);
          return;
        }

        const latNum = parseFloat(latitude);
        const lonNum = parseFloat(longitude);
        const headNum = heading !== undefined && heading !== null ? parseFloat(heading) : null;

        try {
          const activeKey = `driver:active:${userId}`;
          const geoKey = 'driver:location';

          // A. Detección de Mock Locations (GPS Spoofing)
          if (data.mocked === true || data.mocked === 'true') {
            console.warn(`[SECURITY WARNING] Mock location detected for driver ${userId}`);
            
            // Remover estado activo en Redis preventivamente
            await pubClient.del(activeKey);
            
            await logTelemetrySecurityEvent(
              userId,
              'GPS_SPOOFING_ATTEMPT',
              'HIGH',
              {
                reason: 'Dispositivo móvil reportó flag mocked = true (Simulador GPS detectado)',
                latitude: latNum,
                longitude: lonNum,
                orderId
              },
              'user',
              userId
            );
            return;
          }

          // B. Control de Teletransportación / Velocidad Física (Anti-Jump)
          const telemetryMetaKey = `driver:telemetry:${userId}`;
          const lastTelemetry = await pubClient.hGetAll(telemetryMetaKey);

          if (lastTelemetry && lastTelemetry.latitude && lastTelemetry.longitude && lastTelemetry.timestamp) {
            const lastLat = parseFloat(lastTelemetry.latitude);
            const lastLon = parseFloat(lastTelemetry.longitude);
            const lastTime = parseInt(lastTelemetry.timestamp, 10);
            
            const timeDeltaSeconds = (Date.now() - lastTime) / 1000;
            
            if (timeDeltaSeconds > 1) { // Evitar división por cero
              const distanceMeters = getHaversineDistance(latNum, lonNum, lastLat, lastLon);
              const speedKmh = (distanceMeters / timeDeltaSeconds) * 3.6;
              
              // Velocidad físicamente imposible para un entorno urbano terrestre (> 150 km/h)
              if (speedKmh > 150 && distanceMeters > 100) {
                console.warn(`[SECURITY WARNING] Driver ${userId} jump detected: ${distanceMeters.toFixed(1)}m in ${timeDeltaSeconds.toFixed(1)}s (${speedKmh.toFixed(1)} km/h)`);
                
                await pubClient.del(activeKey);
                
                await logTelemetrySecurityEvent(
                  userId,
                  'GPS_SPOOFING_ATTEMPT',
                  'HIGH',
                  {
                    reason: 'Salto geográfico imposible detectado (Anti-Jump)',
                    latitude: latNum,
                    longitude: lonNum,
                    distanceMeters,
                    timeDeltaSeconds,
                    speedKmh,
                    orderId
                  },
                  'user',
                  userId
                );
                return;
              }
            }
          }

          // Guardar estado actual para siguiente verificación
          await pubClient.hSet(telemetryMetaKey, {
            latitude: String(latNum),
            longitude: String(lonNum),
            timestamp: String(Date.now())
          });
          await pubClient.expire(telemetryMetaKey, 1800); // Expirar en 30 min

          // 1. Save location in Redis GEOSET (Longitude first, then Latitude in Redis)
          await pubClient.geoAdd(geoKey, {
            longitude: lonNum,
            latitude: latNum,
            member: String(userId)
          });

          // 2. Set/refresh the 1-minute TTL active state key
          await pubClient.set(activeKey, '1', { EX: 60 });

          // 3. Broadcast the update to the specific order room (for clients tracking this order)
          if (orderId) {
            trackingNamespace.to(`order:${orderId}`).emit('location:changed', {
              driverId: userId,
              latitude: latNum,
              longitude: lonNum,
              heading: headNum,
              timestamp: Date.now()
            });

            // 4. Calculate distance to destination and trigger proximity alert if within 15 meters
            let destLat = null;
            let destLon = null;

            // Check if destination coordinates were passed in the update payload
            if (data.destLatitude !== undefined && data.destLongitude !== undefined) {
              destLat = parseFloat(data.destLatitude);
              destLon = parseFloat(data.destLongitude);
            } else {
              // Otherwise, attempt to load them from Redis (previously registered by the main backend)
              const destKey = `order:destination:${orderId}`;
              const destData = await pubClient.hGetAll(destKey);
              if (destData && destData.latitude && destData.longitude) {
                destLat = parseFloat(destData.latitude);
                destLon = parseFloat(destData.longitude);
              }
            }

            if (destLat !== null && destLon !== null && !isNaN(destLat) && !isNaN(destLon)) {
              const distanceMeters = getHaversineDistance(latNum, lonNum, destLat, destLon);
              console.log(`[INFO] Proximity check for Order ${orderId}: Driver is ${distanceMeters.toFixed(2)}m away from destination`);

              if (distanceMeters <= 15) {
                const notifiedKey = `order:notified:${orderId}`;
                const alreadyNotified = await pubClient.get(notifiedKey);

                if (!alreadyNotified) {
                  // Mark as notified in Redis with a 5-minute TTL to avoid duplicate alerts
                  await pubClient.set(notifiedKey, '1', { EX: 300 });

                  // Emit proximity alert to client/room
                  console.log(`[TRIGGER] Proximity alert: Driver ${userId} is arriving for Order ${orderId}!`);
                  trackingNamespace.to(`order:${orderId}`).emit('order:proximity', {
                    orderId,
                    driverId: userId,
                    distanceMeters,
                    message: 'Está llegando tu Domi'
                  });
                }
              }
            }
          }

          // Also broadcast to the driver's specific monitors (if any)
          trackingNamespace.to(`driver:${userId}:monitor`).emit('location:changed', {
            driverId: userId,
            latitude: latNum,
            longitude: lonNum,
            timestamp: Date.now()
          });

        } catch (err) {
          console.error(`[ERROR] Failed to save location for driver ${userId}:`, err);
        }
      });
    }

    // Clients/Monitors join specific order rooms to receive tracking updates
    socket.on('order:track', (data) => {
      const { orderId } = data;
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`[INFO] Client ${socket.id} joined tracking for order: ${orderId}`);
      }
    });

    socket.on('order:untrack', (data) => {
      const { orderId } = data;
      if (orderId) {
        socket.leave(`order:${orderId}`);
        console.log(`[INFO] Client ${socket.id} left tracking for order: ${orderId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[INFO] Client disconnected: ${socket.id} (User: ${userId})`);
    });
  });

  // Multer Storage Setup for Media Uploads (saving optimized webp files from USA backend)
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const { entityType } = req.params;
      const folderName = `${entityType}s`; // stores, commerces, products
      const dir = path.join(UPLOAD_DIR, folderName);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const { entityType } = req.params;
      const ext = path.extname(file.originalname) || '.webp';
      cb(null, `${entityType}-${Date.now()}${ext}`);
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }
  });

  // REST API Auth Middlewares
  const apiAuth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      req.user = verified;
      next();
    } catch (error) {
      res.status(400).json({ error: 'Token inválido' });
    }
  };

  const apiAdminOnly = (req, res, next) => {
    if (req.user && req.user.rol === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Acceso restringido a administradores' });
    }
  };

  // Internal API Key Verification Middleware
  const verifyInternalOrAdminKey = (req, res, next) => {
    const internalKey = req.header('x-internal-key');
    if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
      return next();
    }
    return apiAuth(req, res, () => {
      apiAdminOnly(req, res, next);
    });
  };

  // Rate Limiter for public registration requests
  const publicRequestsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // limit each IP to 5 requests per windowMs
    message: { error: 'Demasiadas solicitudes de registro desde esta dirección IP. Por favor intente más tarde.' }
  });

  // Multer Memory Storage Config for unified public requests
  const requestMemoryStorage = multer.memoryStorage();
  const uploadRequestFields = multer({
    storage: requestMemoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB per file
    fileFilter: (req, file, cb) => {
      const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExts.includes(ext)) {
        return cb(new Error('Formato de archivo no permitido. Solo PDF e imágenes (JPG, PNG, WebP)'));
      }
      cb(null, true);
    }
  });

  const requestFields = uploadRequestFields.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'camara', maxCount: 1 },
    { name: 'rut', maxCount: 1 },
    { name: 'cedula_frente', maxCount: 1 },
    { name: 'cedula_dorso', maxCount: 1 }
  ]);

  // REST API Endpoints on Telemetry Service

  // Unified public requests submission endpoint (Bogotá is the entrypoint)
  app.post('/api/public/requests', publicRequestsLimiter, (req, res) => {
    requestFields(req, res, async (err) => {
      if (err) {
        console.error('[ERROR] Public unified request upload failed:', err);
        return res.status(400).json({ error: 'Fallo al procesar los archivos: ' + err.message });
      }

      const { 
        tipo_solicitud, nit, nit_dv, razon_social, email_contacto, nombres_contacto, 
        apellidos_contacto, celular_contacto, telefono, ciudad, direccion, descripcion,
        token, logo_url, documento_camara_comercio, documento_rut, documento_cedula_frente, documento_cedula_dorso
      } = req.body;

      if (
        !tipo_solicitud || !nit || !nit_dv || !razon_social || !email_contacto || 
        !nombres_contacto || !apellidos_contacto || !celular_contacto ||
        !telefono || !ciudad || !direccion
      ) {
        return res.status(400).json({ error: 'Todos los campos del formulario son obligatorios.' });
      }

      let missingFields = [];
      let isCorrections = false;
      if (token) {
        try {
          const verified = jwt.verify(token, JWT_SECRET);
          missingFields = verified.missingFields || [];
          isCorrections = true;
        } catch (tokenErr) {
          return res.status(400).json({ error: 'El token de corrección es inválido o ha expirado.' });
        }
      }

      const isFileRequired = (fieldName) => {
        if (!isCorrections) return true;
        if (fieldName === 'cedula_frente' || fieldName === 'cedula_dorso') {
          return missingFields.includes('cedula');
        }
        return missingFields.includes(fieldName);
      };

      const requiredFiles = ['logo', 'camara', 'rut', 'cedula_frente', 'cedula_dorso'];
      for (const field of requiredFiles) {
        if (isFileRequired(field)) {
          if (!req.files || !req.files[field] || !req.files[field][0]) {
            return res.status(400).json({ error: `El archivo ${field} es obligatorio para procesar la solicitud.` });
          }
        }
      }

      const filesUrls = {};
      const requestsDir = path.join(UPLOAD_DIR, 'requests');
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host');

      try {
        if (isFileRequired('logo')) {
          const logoFile = req.files['logo'][0];
          const logoUuid = crypto.randomUUID();
          const logoFileName = `req_doc_${logoUuid}.jpg`;
          const logoPath = path.join(requestsDir, logoFileName);

          console.log(`[SEC_PROCESS] Sanitizando logo con sharp...`);
          await sharp(logoFile.buffer)
            .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(logoPath);

          fs.chmodSync(logoPath, 0o644);
          filesUrls.logo_url = `${protocol}://${host}/uploads/requests/${logoFileName}`;
        } else {
          filesUrls.logo_url = logo_url;
        }

        const pdfFields = [
          { name: 'camara', key: 'documento_camara_comercio', oldUrl: documento_camara_comercio },
          { name: 'rut', key: 'documento_rut', oldUrl: documento_rut }
        ];

        for (const item of pdfFields) {
          if (isFileRequired(item.name)) {
            const pdfFile = req.files[item.name][0];
            const ext = path.extname(pdfFile.originalname).toLowerCase();
            
            if (ext !== '.pdf') {
              throw new Error(`El archivo de ${item.name} debe ser en formato PDF.`);
            }

            if (pdfFile.buffer.length < 4 || pdfFile.buffer.toString('utf8', 0, 4) !== '%PDF') {
              console.warn(`[SECURITY WARN] PDF validation failed for field ${item.name}`);
              throw new Error(`El archivo de ${item.name} no es un documento PDF válido.`);
            }

            const docUuid = crypto.randomUUID();
            const docFileName = `req_doc_${docUuid}.pdf`;
            const docPath = path.join(requestsDir, docFileName);

            fs.writeFileSync(docPath, pdfFile.buffer);
            fs.chmodSync(docPath, 0o644);
            filesUrls[item.key] = `${protocol}://${host}/uploads/requests/${docFileName}`;
          } else {
            filesUrls[item.key] = item.oldUrl;
          }
        }

        const imageFields = [
          { name: 'cedula_frente', key: 'documento_cedula_frente', oldUrl: documento_cedula_frente },
          { name: 'cedula_dorso', key: 'documento_cedula_dorso', oldUrl: documento_cedula_dorso }
        ];

        for (const item of imageFields) {
          if (isFileRequired(item.name)) {
            const file = req.files[item.name][0];
            const ext = path.extname(file.originalname).toLowerCase();
            const docUuid = crypto.randomUUID();

            if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
              const fileName = `req_doc_${docUuid}.jpg`;
              const docPath = path.join(requestsDir, fileName);

              console.log(`[SEC_PROCESS] Sanitizando ${item.name} con sharp...`);
              await sharp(file.buffer)
                .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(docPath);

              fs.chmodSync(docPath, 0o644);
              filesUrls[item.key] = `${protocol}://${host}/uploads/requests/${fileName}`;
            } else {
              throw new Error(`Formato de archivo no permitido para ${item.name}. Debe ser una imagen (JPG, PNG o WebP).`);
            }
          } else {
            filesUrls[item.key] = item.oldUrl;
          }
        }

        const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
        const requestData = {
          tipo_solicitud,
          nit,
          nit_dv,
          razon_social,
          email_contacto,
          nombres_contacto,
          apellidos_contacto,
          celular_contacto,
          telefono,
          ciudad,
          direccion,
          descripcion,
          ...filesUrls
        };

        if (isCorrections) {
          console.log(`[FORWARDING] Enviando actualizacion de solicitud a backend transaccional en ${backendUrl}...`);
          const forwardRes = await axios.put(`${backendUrl}/api/public/requests/update`, {
            token,
            requestData
          }, {
            headers: {
              'x-internal-key': process.env.INTERNAL_API_KEY || ''
            }
          });
          console.log(`[FORWARDING] Solicitud actualizada exitosamente en backend: ${forwardRes.status}`);
          return res.status(200).json(forwardRes.data);
        } else {
          console.log(`[FORWARDING] Enviando nueva solicitud a backend transaccional en ${backendUrl}...`);
          const forwardRes = await axios.post(`${backendUrl}/api/public/internal/requests`, requestData, {
            headers: {
              'x-internal-key': process.env.INTERNAL_API_KEY || ''
            }
          });
          console.log(`[FORWARDING] Solicitud registrada exitosamente en backend: ${forwardRes.status}`);
          return res.status(201).json(forwardRes.data);
        }

      } catch (procErr) {
        console.error('[ERROR] Error processing request documents:', procErr);
        Object.values(filesUrls).forEach(absUrl => {
          if (absUrl && absUrl.startsWith(`${protocol}://${host}`)) {
            const relPath = absUrl.replace(`${protocol}://${host}`, '');
            const fullPath = path.join(UPLOAD_DIR, relPath.replace('/uploads', ''));
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          }
        });
        return res.status(400).json({ error: procErr.message || 'Error al procesar los documentos de la solicitud.' });
      }
    });
  });

  // Endpoint to upload optimized media files (called by the main backend in USA, authenticated via x-internal-key or admin JWT)
  app.post('/api/media/upload/:entityType', verifyInternalOrAdminKey, (req, res) => {
    const { entityType } = req.params;
    const allowedTypes = ['store', 'commerce', 'product'];

    if (!allowedTypes.includes(entityType)) {
      return res.status(400).json({ error: 'Tipo de entidad no válido' });
    }

    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('[ERROR] Multer upload failed:', err);
        return res.status(400).json({ error: 'Fallo al subir el archivo: ' + err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo' });
      }

      // Enforce strict 0644 file permissions on the uploaded file
      try {
        fs.chmodSync(req.file.path, 0o644);
      } catch (chmodErr) {
        console.warn(`[WARN] Failed to set chmod 0644 on uploaded file ${req.file.filename}: ${chmodErr.message}`);
      }

      console.log(`[INFO] Received upload for ${entityType}: ${req.file.filename} (enforced 0644)`);
      const folderName = `${entityType}s`;
      
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host');
      const absoluteUrl = `${protocol}://${host}/uploads/${folderName}/${req.file.filename}`;

      return res.status(200).json({
        success: true,
        filename: req.file.filename,
        url: absoluteUrl
      });
    });
  });

  // Endpoint to delete media files from Bogota disk (called by transactional backend)
  app.delete('/api/media/delete/:entityType/:fileName', verifyInternalOrAdminKey, (req, res) => {
    const { entityType, fileName } = req.params;
    const allowedTypes = ['store', 'commerce', 'product', 'video', 'request'];

    if (!allowedTypes.includes(entityType)) {
      return res.status(400).json({ error: 'Tipo de entidad no válido para borrado.' });
    }

    // Strict regex validation of the filename to prevent Directory Traversal
    const fileNameRegex = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
    if (!fileNameRegex.test(fileName)) {
      return res.status(400).json({ error: 'Nombre de archivo inválido o malicioso.' });
    }

    const folderName = entityType === 'request' ? 'requests' : `${entityType}s`;
    const filePath = path.join(UPLOAD_DIR, folderName, fileName);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[MEDIA_DELETE] Archivo eliminado: ${filePath}`);
        return res.status(200).json({ success: true, message: 'Archivo eliminado con éxito.' });
      } else {
        console.warn(`[MEDIA_DELETE_WARN] Intento de eliminar archivo inexistente: ${filePath}`);
        return res.status(404).json({ error: 'Archivo no encontrado.' });
      }
    } catch (delErr) {
      console.error('[MEDIA_DELETE_ERROR] Fallo al eliminar archivo:', delErr.message);
      return res.status(500).json({ error: 'Error interno al intentar eliminar el archivo.' });
    }
  });

  // Multer Storage Setup for Videos (saving raw videos)
  const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOAD_DIR, 'videos');
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.mp4';
      cb(null, `raw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
    }
  });

  const uploadVideo = multer({
    storage: videoStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // limit to 100MB
  });

  // Helper check for Commerce Manager or Admin (shared with backend logic)
  const isCommerceManagerOrAdmin = (req, res, next) => {
    if (req.user && (req.user.rol === 'admin' || (req.user.rol === 'vendor' && req.user.commerceId))) {
      next();
    } else {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador o Gerente de Comercio.' });
    }
  };

  // Background Video Processing Queue
  const videoQueue = [];
  let activeJobs = 0;
  const MAX_CONCURRENT_JOBS = 2;

  function enqueueVideoJob(job) {
    videoQueue.push(job);
    console.log(`[QUEUE] Job enqueued for video ID ${job.videoId}. Queue length: ${videoQueue.length}`);
    processNextJob();
  }

  function processNextJob() {
    if (activeJobs >= MAX_CONCURRENT_JOBS || videoQueue.length === 0) {
      return;
    }

    const job = videoQueue.shift();
    activeJobs++;

    console.log(`[QUEUE] Starting processing of video ID ${job.videoId}. Active jobs: ${activeJobs}`);
    
    transcodeVideo(job)
      .catch(err => {
        console.error(`[QUEUE ERROR] Job failed for video ID ${job.videoId}:`, err);
      })
      .finally(() => {
        activeJobs--;
        console.log(`[QUEUE] Finished processing of video ID ${job.videoId}. Active jobs: ${activeJobs}`);
        processNextJob();
      });
  }

  async function activateVideoOnBackend(videoId, urls, authHeader) {
    const backendUrl = process.env.BACKEND_URL || 'http://100.127.144.125:4000';
    const url = `${backendUrl}/api/manage/videos/${videoId}/active`;

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(urls)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`[ERROR] Failed to activate video ${videoId} on USA backend:`, err.message);
      throw err;
    }
  }

  async function transcodeVideo(job) {
    const { videoId, commerceId, rawPath, authHeader } = job;
    const videosDir = path.join(UPLOAD_DIR, 'videos');

    const highPath = path.join(videosDir, `high_${videoId}.mp4`);
    const lowPath = path.join(videosDir, `low_${videoId}.mp4`);
    const midPath = path.join(videosDir, `mid_${videoId}.mp4`);

    try {
      // 1. Alta (1080p) - movflags +faststart, scale=1080:-2, threads=1
      console.log(`[QUEUE] High Quality (1080p) transcoding for video ID ${videoId}...`);
      const cmdHigh = `ffmpeg -y -i "${rawPath}" -threads 1 -c:v libx264 -preset fast -crf 23 -vf "scale=1080:-2" -c:a aac -b:a 128k -movflags +faststart "${highPath}"`;
      await execPromise(cmdHigh);
      console.log(`[QUEUE] High Quality transcoding completed for video ID ${videoId}.`);

      const urlHigh = `https://trendy-telemetry.sytes.net/uploads/videos/high_${videoId}.mp4`;
      const urlLow = `https://trendy-telemetry.sytes.net/uploads/videos/low_${videoId}.mp4`;
      const urlMid = `https://trendy-telemetry.sytes.net/uploads/videos/mid_${videoId}.mp4`;

      console.log(`[QUEUE] Sending High Quality activation to backend for video ID ${videoId}...`);
      await activateVideoOnBackend(videoId, { url_high: urlHigh, url_low: '', url_mid: '', commerceId }, authHeader);
      console.log(`[QUEUE] High Quality activation complete for video ID ${videoId}.`);

      // 2. Baja (480p) - scale=480:-2, threads=1
      console.log(`[QUEUE] Low Quality (480p) transcoding for video ID ${videoId}...`);
      const cmdLow = `ffmpeg -y -i "${rawPath}" -threads 1 -c:v libx264 -preset fast -crf 28 -vf "scale=480:-2" -c:a aac -b:a 96k -movflags +faststart "${lowPath}"`;
      await execPromise(cmdLow);
      console.log(`[QUEUE] Low Quality transcoding completed for video ID ${videoId}.`);

      // Update with url_low
      await activateVideoOnBackend(videoId, { url_high: urlHigh, url_low: urlLow, url_mid: '', commerceId }, authHeader);

      // 3. Media (720p) - scale=720:-2, threads=1
      console.log(`[QUEUE] Mid Quality (720p) transcoding for video ID ${videoId}...`);
      const cmdMid = `ffmpeg -y -i "${rawPath}" -threads 1 -c:v libx264 -preset fast -crf 25 -vf "scale=720:-2" -c:a aac -b:a 128k -movflags +faststart "${midPath}"`;
      await execPromise(cmdMid);
      console.log(`[QUEUE] Mid Quality transcoding completed for video ID ${videoId}.`);

      // Update with url_mid
      await activateVideoOnBackend(videoId, { url_high: urlHigh, url_low: urlLow, url_mid: urlMid, commerceId }, authHeader);
      console.log(`[QUEUE] Full progressive transcoding workflow completed for video ID ${videoId}.`);

      // Cleanup raw video file
      if (fs.existsSync(rawPath)) {
        fs.unlinkSync(rawPath);
        console.log(`[QUEUE] Cleaned up raw file for video ID ${videoId}: ${rawPath}`);
      }
    } catch (err) {
      console.error(`[QUEUE ERROR] Failed during transcoding steps for video ID ${videoId}:`, err.message);
      throw err;
    }
  }

  // Endpoint to upload raw commerce videos (called by DomiEmpresa merchant app)
  app.post('/api/media/upload/video', apiAuth, isCommerceManagerOrAdmin, (req, res) => {
    uploadVideo.single('video')(req, res, (err) => {
      if (err) {
        console.error('[ERROR] Video upload failed:', err);
        return res.status(400).json({ error: 'Fallo al subir el video: ' + err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ningun archivo de video.' });
      }

      const { videoId, commerceId } = req.body;
      if (!videoId || !commerceId) {
        // Cleanup file if request is invalid
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'videoId y commerceId son requeridos.' });
      }

      console.log(`[INFO] Video received for commerce ${commerceId}, videoId ${videoId}: ${req.file.filename}`);

      // Enqueue job for background processing
      enqueueVideoJob({
        videoId,
        commerceId,
        rawPath: req.file.path,
        authHeader: req.headers.authorization
      });

      return res.status(202).json({
        success: true,
        message: 'Video recibido y encolado para procesamiento asincrono.'
      });
    });
  });

  // --------------------------------------------------------------------------
  // Dataset NLP Visualizer Web Interface (/dataset, /dataset/devices)
  // --------------------------------------------------------------------------
  const generateDatasetHtml = ({ title, deviceId, items, devicesList = [], downloadUrl }) => {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Telemetría</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    h1 { font-size: 1.35rem; font-weight: 700; color: #38bdf8; margin: 0; display: flex; align-items: center; gap: 10px; }
    .subtitle { color: #94a3b8; font-size: 0.9rem; margin-top: 4px; }
    .controls { display: flex; gap: 16px; align-items: center; background: #1e293b; padding: 14px 20px; border-radius: 10px; margin-bottom: 24px; border: 1px solid #334155; flex-wrap: wrap; }
    .checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 0.95rem; color: #f1f5f9; font-weight: 600; background: #0f172a; padding: 8px 14px; border-radius: 6px; border: 1px solid #475569; }
    .checkbox-label input { width: 18px; height: 18px; cursor: pointer; accent-color: #3b82f6; }
    .badge { background: #0284c7; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
    .search-input { background: #0f172a; border: 1px solid #475569; color: #f8fafc; padding: 8px 14px; border-radius: 6px; font-size: 0.9rem; flex: 1; min-width: 200px; outline: none; }
    .search-input:focus { border-color: #38bdf8; }
    .btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.88rem; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s; }
    .btn:hover { background: #1d4ed8; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    
    #dataset-container { display: flex; flex-direction: column; gap: 12px; }
    .entry-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 14px 18px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.88rem; transition: border-color 0.2s; }
    .entry-card:hover { border-color: #475569; }
    .entry-card.formatted { white-space: pre-wrap; word-break: break-word; color: #34d399; }
    .entry-card.raw { white-space: nowrap; overflow-x: auto; color: #e2e8f0; }
    
    pre { margin: 0; font-family: inherit; white-space: pre-wrap; word-break: break-word; font-size: 0.88rem; line-height: 1.6; color: #34d399; }
    
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-top: 20px; }
    .device-card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px 20px; text-decoration: none; color: inherit; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
    .device-card:hover { border-color: #38bdf8; transform: translateY(-2px); background: #26334d; }
    .device-name { font-weight: 600; color: #f8fafc; font-size: 0.95rem; word-break: break-all; }
    .device-size { color: #94a3b8; font-size: 0.82rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📊 ${title}</h1>
        <div class="subtitle">Servidor de Telemetría y Dataset NLP - KeyboardAndroid</div>
      </div>
      <div>
        ${deviceId ? `<a href="/dataset" class="btn btn-secondary">← Volver a Dispositivos</a>` : ''}
        ${downloadUrl ? `<a href="${downloadUrl}" download class="btn">⬇ Descargar JSON</a>` : ''}
      </div>
    </div>

    ${devicesList.length > 0 ? `
      <h2 style="font-size: 1.1rem; color: #94a3b8; margin-top: 24px;">Dispositivos Registrados (${devicesList.length})</h2>
      <div class="device-list">
        <a href="/dataset" class="device-card" style="border-color: #0284c7;">
          <div>
            <div class="device-name" style="color: #38bdf8;">🌐 Dataset Global Acumulado</div>
            <div class="device-size">Todas las muestras combinadas</div>
          </div>
          <span class="badge">GLOBAL</span>
        </a>
        ${devicesList.map(d => `
          <a href="/dataset/devices/${d.id}" class="device-card">
            <div>
              <div class="device-name">📱 ${d.id}</div>
              <div class="device-size">${d.lineCount} registros • ${(d.size / 1024).toFixed(1)} KB</div>
            </div>
            <span class="btn btn-secondary" style="font-size:0.75rem; padding:4px 8px;">Ver →</span>
          </a>
        `).join('')}
      </div>
    ` : ''}

    ${items ? `
      <div class="controls">
        <label class="checkbox-label">
          <input type="checkbox" id="formatCheck" checked />
          Dar formato al texto (JSON Identado)
        </label>

        <input type="text" id="searchInput" placeholder="Filtrar por texto, app_contexto o timestamp..." class="search-input" />

        <span class="badge" id="recordCount">Total registros: ${items.length}</span>
      </div>

      <div id="dataset-container"></div>
    ` : ''}
  </div>

  ${items ? `
  <script>
    const rawItems = ${JSON.stringify(items)};
    const checkbox = document.getElementById('formatCheck');
    const searchInput = document.getElementById('searchInput');
    const container = document.getElementById('dataset-container');
    const recordCount = document.getElementById('recordCount');

    function render() {
      const isFormatted = checkbox.checked;
      const query = searchInput.value.toLowerCase().trim();
      
      const filtered = rawItems.filter(item => {
        if (!query) return true;
        const str = typeof item === 'string' ? item : JSON.stringify(item);
        return str.toLowerCase().includes(query);
      });

      recordCount.textContent = 'Total registros: ' + filtered.length + (filtered.length !== rawItems.length ? ' (de ' + rawItems.length + ')' : '');
      container.innerHTML = '';

      if (filtered.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; padding:30px; text-align:center; background:#1e293b; border-radius:8px;">No se encontraron registros que coincidan con la búsqueda.</div>';
        return;
      }

      filtered.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'entry-card ' + (isFormatted ? 'formatted' : 'raw');
        
        if (isFormatted) {
          const pre = document.createElement('pre');
          pre.textContent = typeof item === 'object' ? JSON.stringify(item, null, 2) : item;
          card.appendChild(pre);
        } else {
          card.textContent = typeof item === 'object' ? JSON.stringify(item) : item;
        }
        
        container.appendChild(card);
      });
    }

    checkbox.addEventListener('change', render);
    searchInput.addEventListener('input', render);
    render();
  </script>
  ` : ''}
</body>
</html>`;
  };

  const getDatasetDir = () => {
    let targetDir = '/var/www/bienestar/dataset_nlp';
    if (!fs.existsSync(targetDir)) {
      targetDir = path.join(__dirname, '../uploads/dataset_nlp');
    }
    return targetDir;
  };

  const readJsonLinesFile = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (!content) return [];

      if (content.startsWith('[') && content.endsWith(']')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          // Fallback to line parsing if whole array parse fails
        }
      }

      const lines = content.split('\n').filter(l => l.trim());
      const results = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '[' || trimmed === ']' || trimmed === '],') continue;
        try {
          results.push(JSON.parse(trimmed.replace(/,$/, '')));
        } catch (e) {
          if (trimmed) results.push({ raw: trimmed });
        }
      }
      return results;
    } catch (e) {
      return [];
    }
  };

  // Main dataset view or devices list
  app.get(['/dataset', '/dataset/', '/dataset/devices', '/dataset/devices/'], (req, res) => {
    const targetDir = getDatasetDir();
    const devicesDir = path.join(targetDir, 'devices');
    const globalFilePath = path.join(targetDir, 'dataset_lenguaje_humano.json');

    let devicesList = [];
    if (fs.existsSync(devicesDir)) {
      const files = fs.readdirSync(devicesDir).filter(f => f.endsWith('.json'));
      devicesList = files.map(filename => {
        const id = filename.replace(/^dataset_/, '').replace(/\.json$/, '');
        const fullPath = path.join(devicesDir, filename);
        const stat = fs.statSync(fullPath);
        const lines = readJsonLinesFile(fullPath);
        return {
          id,
          filename,
          size: stat.size,
          lineCount: lines.length
        };
      });
    }

    const items = readJsonLinesFile(globalFilePath);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(generateDatasetHtml({
      title: 'Dataset NLP - Global (Todos los dispositivos)',
      items,
      devicesList,
      downloadUrl: fs.existsSync(globalFilePath) ? '/dataset.json' : null
    }));
  });

  // Dataset view for specific device
  app.get(['/dataset/devices/:deviceId', '/dataset/devices/:deviceId/'], (req, res) => {
    const rawId = req.params.deviceId;
    const cleanId = rawId.replace(/^dataset_/, '').replace(/\.json$/, '');
    
    const targetDir = getDatasetDir();
    const devicesDir = path.join(targetDir, 'devices');
    
    let deviceFilePath = path.join(devicesDir, `dataset_${cleanId}.json`);
    if (!fs.existsSync(deviceFilePath)) {
      deviceFilePath = path.join(devicesDir, `${cleanId}.json`);
    }
    if (!fs.existsSync(deviceFilePath)) {
      deviceFilePath = path.join(devicesDir, rawId);
    }

    if (!fs.existsSync(deviceFilePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(generateDatasetHtml({
        title: `Dispositivo no encontrado: ${cleanId}`,
        items: [],
        devicesList: []
      }));
    }

    const items = readJsonLinesFile(deviceFilePath);
    const downloadUrl = `/dataset/raw/devices/${cleanId}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(generateDatasetHtml({
      title: `Dataset NLP - Dispositivo: ${cleanId}`,
      deviceId: cleanId,
      items,
      downloadUrl
    }));
  });


  // --------------------------------------------------------------------------
  // Plataforma Web Explorador Dataset NLP (/expl)
  // --------------------------------------------------------------------------
  const generateExplorerHtml = ({ title, level, deviceId, appPackage, devicesList = [], appsList = [], items = [], downloadUrl }) => {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Explorador NLP</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f3f4f6; line-height: 1.5; padding: 24px; min-height: 100vh; }
    .container { max-width: 1240px; margin: 0 auto; }
    
    .nav-breadcrumbs { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: #9ca3af; margin-bottom: 16px; flex-wrap: wrap; }
    .nav-breadcrumbs a { color: #38bdf8; text-decoration: none; font-weight: 500; }
    .nav-breadcrumbs a:hover { text-decoration: underline; }
    .nav-breadcrumbs .separator { color: #4b5563; }
    .nav-breadcrumbs .current { color: #f3f4f6; font-weight: 600; }
    
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #1f2937; padding-bottom: 20px; flex-wrap: wrap; gap: 16px; }
    .header-title { font-size: 1.5rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 12px; letter-spacing: -0.025em; }
    .header-subtitle { color: #9ca3af; font-size: 0.9rem; margin-top: 4px; }
    
    .search-box { display: flex; gap: 12px; background: #111827; padding: 14px 18px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #1f2937; flex-wrap: wrap; align-items: center; }
    .search-input { background: #0b0f19; border: 1px solid #374151; color: #f3f4f6; padding: 10px 16px; border-radius: 8px; font-size: 0.92rem; flex: 1; min-width: 240px; outline: none; transition: all 0.2s; }
    .search-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
    
    .btn { background: #3b82f6; color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; }
    .btn:hover { background: #2563eb; transform: translateY(-1px); }
    .btn-secondary { background: #1f2937; color: #e5e7eb; border: 1px solid #374151; }
    .btn-secondary:hover { background: #374151; }

    .badge { background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; }
    .badge-purple { background: rgba(168, 85, 247, 0.1); color: #c084fc; border-color: rgba(168, 85, 247, 0.3); }

    /* Level 1 Grid - Devices */
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
    .card-item { background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px; text-decoration: none; color: inherit; transition: all 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; }
    .card-item:hover { border-color: #38bdf8; transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); background: #151d30; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .card-title { font-weight: 700; color: #f9fafb; font-size: 1.05rem; word-break: break-all; }
    .card-meta { color: #9ca3af; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }

    /* Level 3 Records */
    .records-list { display: flex; flex-direction: column; gap: 16px; }
    .record-card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 18px 22px; font-size: 0.92rem; transition: border-color 0.2s; position: relative; }
    .record-card:hover { border-color: #374151; }
    .record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #1f2937; font-size: 0.82rem; color: #9ca3af; }
    .record-content-box { display: flex; flex-direction: column; gap: 10px; }
    .record-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .text-box { background: #0b0f19; border: 1px solid #1f2937; padding: 12px 16px; border-radius: 8px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.9rem; line-height: 1.6; word-break: break-word; white-space: pre-wrap; }
    .text-box.clean { color: #34d399; }
    .text-box.raw { color: #fbbf24; }
    
    .view-toggle { display: flex; background: #0b0f19; padding: 3px; border-radius: 8px; border: 1px solid #374151; }
    .view-toggle button { background: none; border: none; color: #9ca3af; padding: 6px 14px; font-size: 0.82rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
    .view-toggle button.active { background: #3b82f6; color: white; }

    .copy-btn { position: absolute; top: 16px; right: 18px; background: #1f2937; color: #9ca3af; border: 1px solid #374151; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; }
    .copy-btn:hover { background: #374151; color: #f3f4f6; }
  </style>
</head>
<body>
  <div class="container">
    
    <div class="nav-breadcrumbs">
      <a href="/expl">📱 Dispositivos</a>
      ${deviceId ? `<span class="separator">/</span> <a href="/expl/devices/${deviceId}">${deviceId}</a>` : ''}
      ${appPackage ? `<span class="separator">/</span> <span class="current">📦 ${appPackage}</span>` : ''}
    </div>

    <div class="header">
      <div>
        <div class="header-title">${title}</div>
        <div class="header-subtitle">Explorador Dataset NLP — Visualización Jerárquica</div>
      </div>
      <div>
        ${downloadUrl ? `<a href="${downloadUrl}" download class="btn">⬇ Exportar JSON</a>` : ''}
      </div>
    </div>

    ${level === 1 ? `
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="🔍 Buscar dispositivo por ID o modelo..." class="search-input" />
        <span class="badge" id="countBadge">Dispositivos: ${devicesList.length}</span>
      </div>
      
      <div class="grid-cards" id="cardsGrid">
        ${devicesList.map(d => `
          <a href="/expl/devices/${d.id}" class="card-item" data-search="${d.id.toLowerCase()}">
            <div>
              <div class="card-header">
                <div class="card-title">📱 ${d.id}</div>
                <span class="badge">${d.appsCount} Apps</span>
              </div>
              <div class="card-meta">
                <span>Registros totales: <strong>${d.lineCount}</strong></span>
                <span>Tamaño: <strong>${(d.size / 1024).toFixed(1)} KB</strong></span>
              </div>
            </div>
            <div style="margin-top: 16px; display:flex; justify-content:flex-end;">
              <span class="btn btn-secondary" style="font-size:0.8rem; padding:6px 12px;">Explorar Apps →</span>
            </div>
          </a>
        `).join('')}
      </div>
    ` : ''}

    ${level === 2 ? `
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="🔍 Buscar aplicación por nombre o paquete..." class="search-input" />
        <span class="badge badge-purple" id="countBadge">Aplicaciones: ${appsList.length}</span>
      </div>

      <div class="grid-cards" id="cardsGrid">
        ${appsList.map(a => `
          <a href="/expl/devices/${deviceId}/apps/${encodeURIComponent(a.packageName)}" class="card-item" data-search="${a.packageName.toLowerCase()}">
            <div>
              <div class="card-header">
                <div class="card-title">📦 ${a.packageName}</div>
                <span class="badge badge-purple">${a.count} escritos</span>
              </div>
              <div class="card-meta">
                <span>Última actividad: <strong>${a.lastActivity ? new Date(a.lastActivity).toLocaleString('es-CO') : 'Reciente'}</strong></span>
              </div>
            </div>
            <div style="margin-top: 16px; display:flex; justify-content:flex-end;">
              <span class="btn" style="font-size:0.8rem; padding:6px 12px;">Ver Registros →</span>
            </div>
          </a>
        `).join('')}
      </div>
    ` : ''}

    ${level === 3 ? `
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="🔍 Buscar en el texto de los escritos..." class="search-input" />
        
        <div class="view-toggle">
          <button id="toggleBoth" class="active">Ambos</button>
          <button id="toggleClean">Solo Limpio (textoL)</button>
          <button id="toggleRaw">Solo Crudo (textoC)</button>
        </div>

        <span class="badge" id="countBadge">Registros: ${items.length}</span>
      </div>

      <div class="records-list" id="recordsList"></div>
    ` : ''}

  </div>

  <script>
    // Buscador interactivo en vivo
    const searchInput = document.getElementById('searchInput');
    const cardsGrid = document.getElementById('cardsGrid');
    const recordsList = document.getElementById('recordsList');
    const countBadge = document.getElementById('countBadge');

    if (searchInput && cardsGrid) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = cardsGrid.querySelectorAll('.card-item');
        let visibleCount = 0;
        cards.forEach(card => {
          const match = card.getAttribute('data-search').includes(query);
          card.style.display = match ? 'flex' : 'none';
          if (match) visibleCount++;
        });
        if (countBadge) countBadge.textContent = 'Resultados: ' + visibleCount;
      });
    }

    ${level === 3 ? `
      const rawItems = ${JSON.stringify(items)};
      let currentMode = 'both';

      function renderRecords() {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const filtered = rawItems.filter(item => {
          if (!query) return true;
          const tL = item.textoL || item.texto || '';
          const tC = item.textoC || item.texto || '';
          return tL.toLowerCase().includes(query) || tC.toLowerCase().includes(query);
        });

        if (countBadge) countBadge.textContent = 'Registros: ' + filtered.length;
        recordsList.innerHTML = '';

        if (filtered.length === 0) {
          recordsList.innerHTML = '<div style="color:#9ca3af; padding:40px; text-align:center; background:#111827; border-radius:12px; border:1px solid #1f2937;">No se encontraron escritos que coincidan con la búsqueda.</div>';
          return;
        }

        filtered.forEach(item => {
          const card = document.createElement('div');
          card.className = 'record-card';
          
          const textClean = item.textoL || item.texto || '';
          const textRaw = item.textoC || item.texto || '';
          const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('es-CO') : 'Reciente';

          let contentHtml = '<div class="record-content-box">';
          if (currentMode === 'both' || currentMode === 'clean') {
            contentHtml += \`
              <div>
                <div class="record-label">✨ Texto Limpio (Resultado Final):</div>
                <div class="text-box clean">\${escapeHtml(textClean)}</div>
              </div>
            \`;
          }
          if (currentMode === 'both' || currentMode === 'raw') {
            contentHtml += \`
              <div>
                <div class="record-label">📜 Historial Crudo (Con Borrados & Subrayado):</div>
                <div class="text-box raw">\${escapeHtml(textRaw)}</div>
              </div>
            \`;
          }
          contentHtml += '</div>';

          card.innerHTML = \`
            <div class="record-header">
              <span>⏰ \${dateStr}</span>
              <span>ID: \${item.device_id || 'dispositivo'}</span>
            </div>
            \${contentHtml}
            <button class="copy-btn" onclick="copyText('\${escapeHtml(textClean)}')">📋 Copiar</button>
          \`;

          recordsList.appendChild(card);
        });
      }

      function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function copyText(txt) {
        navigator.clipboard.writeText(txt);
        alert('Texto copiado al portapapeles');
      }

      document.getElementById('toggleBoth').addEventListener('click', (e) => { setMode('both', e.target); });
      document.getElementById('toggleClean').addEventListener('click', (e) => { setMode('clean', e.target); });
      document.getElementById('toggleRaw').addEventListener('click', (e) => { setMode('raw', e.target); });

      function setMode(mode, btn) {
        currentMode = mode;
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderRecords();
      }

      if (searchInput) searchInput.addEventListener('input', renderRecords);
      renderRecords();
    ` : ''}
  </script>
</body>
</html>`;
  };

  // --------------------------------------------------------------------------
  // Rutas de la Nueva Plataforma /expl
  // --------------------------------------------------------------------------
  // Nivel 1: Lista de Dispositivos
  app.get(['/expl', '/expl/', '/expl/devices', '/expl/devices/'], (req, res) => {
    const targetDir = getDatasetDir();
    const devicesDir = path.join(targetDir, 'devices');

    let devicesList = [];
    if (fs.existsSync(devicesDir)) {
      const files = fs.readdirSync(devicesDir).filter(f => f.endsWith('.json'));
      devicesList = files.map(filename => {
        const id = filename.replace(/^dataset_/, '').replace(/\.json$/, '');
        const fullPath = path.join(devicesDir, filename);
        const stat = fs.statSync(fullPath);
        const lines = readJsonLinesFile(fullPath);
        
        // Contar apps distintas en el dispositivo
        const appsSet = new Set(lines.map(l => l.app_contexto || 'unknown'));
        
        return {
          id,
          filename,
          size: stat.size,
          lineCount: lines.length,
          appsCount: appsSet.size
        };
      });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(generateExplorerHtml({
      title: '📱 Explorador NLP — Dispositivos',
      level: 1,
      devicesList
    }));
  });

  // Nivel 2: Grupos de Aplicaciones por Dispositivo
  app.get(['/expl/devices/:deviceId', '/expl/devices/:deviceId/'], (req, res) => {
    const rawId = req.params.deviceId;
    const cleanId = rawId.replace(/^dataset_/, '').replace(/\.json$/, '');

    const targetDir = getDatasetDir();
    const devicesDir = path.join(targetDir, 'devices');
    
    let deviceFilePath = path.join(devicesDir, `dataset_${cleanId}.json`);
    if (!fs.existsSync(deviceFilePath)) deviceFilePath = path.join(devicesDir, `${cleanId}.json`);
    if (!fs.existsSync(deviceFilePath)) deviceFilePath = path.join(devicesDir, rawId);

    if (!fs.existsSync(deviceFilePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(generateExplorerHtml({
        title: `Dispositivo No Encontrado: ${cleanId}`,
        level: 1,
        devicesList: []
      }));
    }

    const items = readJsonLinesFile(deviceFilePath);
    
    // Agrupar muestras por app_contexto
    const appsMap = {};
    items.forEach(item => {
      const app = item.app_contexto || 'unknown';
      if (!appsMap[app]) {
        appsMap[app] = { packageName: app, count: 0, lastActivity: null };
      }
      appsMap[app].count++;
      if (item.created_at) {
        appsMap[app].lastActivity = item.created_at;
      }
    });

    const appsList = Object.values(appsMap).sort((a, b) => b.count - a.count);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(generateExplorerHtml({
      title: `📱 ${cleanId} — Aplicaciones`,
      level: 2,
      deviceId: cleanId,
      appsList
    }));
  });

  // Nivel 3: Registros por Aplicación Específica
  app.get('/expl/devices/:deviceId/apps/:appPackage', (req, res) => {
    const rawId = req.params.deviceId;
    const cleanId = rawId.replace(/^dataset_/, '').replace(/\.json$/, '');
    const appPackage = decodeURIComponent(req.params.appPackage);

    const targetDir = getDatasetDir();
    const devicesDir = path.join(targetDir, 'devices');
    
    let deviceFilePath = path.join(devicesDir, `dataset_${cleanId}.json`);
    if (!fs.existsSync(deviceFilePath)) deviceFilePath = path.join(devicesDir, `${cleanId}.json`);
    if (!fs.existsSync(deviceFilePath)) deviceFilePath = path.join(devicesDir, rawId);

    if (!fs.existsSync(deviceFilePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(generateExplorerHtml({
        title: `Dispositivo No Encontrado: ${cleanId}`,
        level: 1,
        devicesList: []
      }));
    }

    const allItems = readJsonLinesFile(deviceFilePath);
    const filteredItems = allItems
      .filter(item => (item.app_contexto || 'unknown') === appPackage)
      .reverse(); // Ordenar del más reciente al más antiguo

    const downloadUrl = `/dataset/raw/devices/${cleanId}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(generateExplorerHtml({
      title: `📦 ${appPackage}`,
      level: 3,
      deviceId: cleanId,
      appPackage,
      items: filteredItems,
      downloadUrl
    }));
  });

  app.get('/dataset.json', (req, res) => {
    const targetDir = getDatasetDir();
    const globalFilePath = path.join(targetDir, 'dataset_lenguaje_humano.json');
    if (fs.existsSync(globalFilePath)) {
      return res.download(globalFilePath, 'dataset_lenguaje_humano.json');
    }
    return res.status(404).json({ error: 'Archivo no encontrado' });
  });

  // POST /api/telemetry/dataset - Recolección de lotes guardando como arreglo JSON válido
  app.post('/api/telemetry/dataset', (req, res) => {
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
          textoL: sample.textoL ? String(sample.textoL).trim() : cleanText.replace(/.\\u0332/g, '').replace(/⌫/g, ''),
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

  // Endpoint to register the destination coordinates for an order (called by the main backend in USA)
  app.post('/api/telemetry/order/destination', async (req, res) => {
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

  // Endpoint to report host telemetry and IP configuration for dynamic RPC peering
  app.post('/api/telemetry/report', async (req, res) => {
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

  // Endpoint to query status of all registered tailscale host nodes (heartbeat registry)
  app.get('/api/telemetry/status', async (req, res) => {
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

      // Hardcoded list of expected infrastructure nodes to report offline state if missing
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

  // Endpoint to get a driver's current position (called by the main backend in USA)
  app.get('/api/telemetry/driver/:driverId', async (req, res) => {
    const { driverId } = req.params;

    try {
      const activeKey = `driver:active:${driverId}`;
      const isActive = await pubClient.get(activeKey);

      // If the driver hasn't updated location in 1 minute, consider them inactive
      if (!isActive) {
        // Clean up from GEOSET
        await pubClient.zRem('driver:location', String(driverId));
        return res.status(404).json({ error: 'Driver is inactive or location expired' });
      }

      // Fetch position from Redis (Returns array of {longitude, latitude})
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

  // Start HTTP Listening
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUCCESS] Telemetry server listening on 0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('[CRITICAL] Server failed to start:', err);
  process.exit(1);
});
