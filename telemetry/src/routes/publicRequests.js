const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const axios = require('axios');
const { JWT_SECRET, UPLOAD_DIR } = require('../config/env');
const { publicRequestsLimiter } = require('../middleware/rateLimiters');
const { requestFields } = require('../middleware/upload');

// Unified public requests submission endpoint (Bogotá is the entrypoint)
router.post('/api/public/requests', publicRequestsLimiter, (req, res) => {
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

module.exports = router;
