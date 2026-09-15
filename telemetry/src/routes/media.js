const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../config/env');
const { apiAuth, verifyInternalOrAdminKey, isCommerceManagerOrAdmin } = require('../middleware/auth');
const { upload, uploadVideo } = require('../middleware/upload');
const { enqueueVideoJob } = require('../services/videoTranscodeService');

// Endpoint to upload optimized media files (called by main backend)
router.post('/api/media/upload/:entityType', verifyInternalOrAdminKey, (req, res) => {
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

// Endpoint to delete media files from disk
router.delete('/api/media/delete/:entityType/:fileName', verifyInternalOrAdminKey, (req, res) => {
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

// Endpoint to upload raw commerce videos (called by DomiEmpresa merchant app)
router.post('/api/media/upload/video', apiAuth, isCommerceManagerOrAdmin, (req, res) => {
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
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'videoId y commerceId son requeridos.' });
    }

    console.log(`[INFO] Video received for commerce ${commerceId}, videoId ${videoId}: ${req.file.filename}`);

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

module.exports = router;
