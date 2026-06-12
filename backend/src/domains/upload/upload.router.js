const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadController = require('./upload.controller');
const { auth } = require('../../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|heic/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de imagen (jpg, png, webp, heic)'));
  }
});

router.post('/:entityType', auth, upload.single('image'), uploadController.uploadImage);

module.exports = router;
