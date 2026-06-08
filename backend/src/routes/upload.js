const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { auth, hasPermission } = require('../middleware/auth');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuración de Multer: Almacenamos en memoria para que Sharp pueda procesarlo antes de guardar a disco
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Límite 15MB para fotos de alta resolución originales
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

/**
 * @route   POST /api/upload/:entityType
 * @desc    Sube y optimiza una imagen (entityType: store, commerce, product)
 * @access  Admin
 */
router.post('/:entityType', auth, upload.single('image'), async (req, res) => {
  try {
    const { entityType } = req.params;
    const allowedTypes = ['store', 'commerce', 'product'];
    
    if (!allowedTypes.includes(entityType)) {
      return res.status(400).json({ error: 'Tipo de entidad no válido para subida de imágenes' });
    }

    // Validar permisos dinámicos según el tipo de entidad
    if (entityType === 'product') {
      if (!req.user.permissions?.includes('write_catalog')) {
        return res.status(403).json({ error: 'No tienes permisos para modificar el catálogo (write_catalog).' });
      }
    } else if (entityType === 'store') {
      if (!req.user.permissions?.includes('edit_store_basic') && !req.user.permissions?.includes('edit_store_advanced')) {
        return res.status(403).json({ error: 'No tienes permisos para modificar los datos básicos de la sede (edit_store_basic).' });
      }
    } else if (entityType === 'commerce') {
      if (!req.user.permissions?.includes('edit_commerce')) {
        return res.status(403).json({ error: 'No tienes permisos para editar el comercio (edit_commerce).' });
      }
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se ha seleccionado ninguna imagen' });
    }

    // 1. Analizar metadata con Sharp para validaciones
    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();

    // Validaciones dependiendo de la entidad
    if (entityType === 'store') {
      // Regla: Resolución mínima 1080x1080 (Para garantizar calidad premium en el diseño de la sede)
      if (metadata.width < 1080 || metadata.height < 1080) {
        return res.status(400).json({ 
          error: `La imagen no cumple con las dimensiones mínimas (${metadata.width}x${metadata.height}). Para garantizar la calidad en el diseño de la sede, la foto debe tener al menos 1080x1080 píxeles.` 
        });
      }
    } else {
      // Reglas más flexibles para commerces y products, pero mínimo de calidad
      if (metadata.width < 300 || metadata.height < 300) {
        return res.status(400).json({ 
          error: `La imagen es demasiado pequeña (${metadata.width}x${metadata.height}). Sube una imagen de mejor calidad (mínimo 300x300).` 
        });
      }
    }

    // 2. Procesamiento y Optimización
    const folderName = `${entityType}s`; // stores, commerces, products
    const fileName = `${entityType}-${Date.now()}.webp`;
    const uploadDir = path.join(__dirname, '../../uploads', folderName);
    const uploadPath = path.join(uploadDir, fileName);

    // Aseguramos que la carpeta exista
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    await image
      .resize({ 
        width: metadata.width > 1920 ? 1920 : metadata.width, // Reducimos si es 4k+ para ahorrar espacio
        withoutEnlargement: true 
      })
      .webp({ quality: 85 }) // Formato Next-Gen ultra ligero
      .toFile(uploadPath);
    
    // --- PRODUCCION: Reenvio de imagen a arm-bogota via API HTTP (Opcion A) ---
    if (process.env.NODE_ENV === 'production') {
      try {
        const fileBuffer = fs.readFileSync(uploadPath);
        const fileBlob = new Blob([fileBuffer], { type: 'image/webp' });
        const formData = new FormData();
        formData.append('image', fileBlob, fileName);

        const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'https://trendy-telemetry.sytes.net';
        console.log(`[MEDIA_UPLOAD] Enviando ${fileName} a ${mediaServerUrl}...`);

        const response = await fetch(`${mediaServerUrl}/api/media/upload/${entityType}`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': req.header('Authorization') || ''
          }
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const resData = await response.json();
        if (!resData.success) {
          throw new Error('Respuesta de éxito falsa desde el servidor de medios');
        }

        console.log(`[MEDIA_UPLOAD] Sincronización exitosa con servidor de medios para ${fileName}`);
      } catch (uploadError) {
        console.error('[MEDIA_UPLOAD_ERROR] Fallo crítico al subir imagen a Bogotá:', uploadError.message);
        return res.status(500).json({ error: 'Error al sincronizar imagen con el servidor de medios: ' + uploadError.message });
      }
    }

    // 3. Responder con la ruta relativa de la imagen (portable y segura)
    const relativeUrl = `/uploads/${folderName}/${fileName}`;
    
    res.json({
      success: true,
      url: relativeUrl,
      width: metadata.width,
      height: metadata.height,
      format: 'webp'
    });

  } catch (error) {
    console.error('Error en procesamiento de imagen:', error);
    res.status(500).json({ error: 'Error interno al procesar la imagen: ' + error.message });
  }
});

module.exports = router;
