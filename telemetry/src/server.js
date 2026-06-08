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
require('dotenv').config();

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
  const types = ['stores', 'commerces', 'products', 'videos'];
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
app.use(express.json());

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
        const { latitude, longitude, orderId } = data;

        if (!latitude || !longitude) {
          console.warn(`[WARN] Invalid coordinates received from driver ${userId}`);
          return;
        }

        const latNum = parseFloat(latitude);
        const lonNum = parseFloat(longitude);

        try {
          const activeKey = `driver:active:${userId}`;
          const geoKey = 'driver:location';

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

  // REST API Endpoints on Telemetry Service

  // Endpoint to upload optimized media files (called by the main backend in USA)
  app.post('/api/media/upload/:entityType', apiAuth, apiAdminOnly, (req, res) => {
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

      console.log(`[INFO] Received upload for ${entityType}: ${req.file.filename}`);
      const folderName = `${entityType}s`;
      const absoluteUrl = `https://trendy-telemetry.sytes.net/uploads/${folderName}/${req.file.filename}`;

      return res.status(200).json({
        success: true,
        filename: req.file.filename,
        url: absoluteUrl
      });
    });
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
      return res.status(200).json({ success: true, message: 'Destination registered successfully' });
    } catch (err) {
      console.error(`[ERROR] Failed to save destination for order ${orderId}:`, err);
      return res.status(500).json({ error: 'Internal server error' });
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
