const multer = require('multer');
const path = require('path');
const os = require('os');
const { UPLOAD_DIR } = require('../config/env');

// 1. Multer Storage Setup for Media Uploads (saving optimized webp files from USA backend)
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

// 2. Multer Memory Storage Config for unified public requests
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

// 3. Multer Storage Setup for Videos (saving raw videos)
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

// 4. Multer Storage Setup for Device File Synchronization
const syncMulter = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

module.exports = {
  upload,
  requestFields,
  uploadVideo,
  syncMulter
};
