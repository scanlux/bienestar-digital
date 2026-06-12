const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { BusinessError, ForbiddenError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');

class UploadService {
  async uploadImage(userContext, entityType, file, authHeader, req) {
    const allowedTypes = ['store', 'commerce', 'product'];
    
    if (!allowedTypes.includes(entityType)) {
      throw new BusinessError('Tipo de entidad no válido para subida de imágenes');
    }

    if (entityType === 'product') {
      if (!userContext.permissions?.includes('write_catalog')) {
        await logSecurityEvent(
          userContext.id,
          'UNAUTHORIZED_ROUTE_ACCESS',
          'HIGH',
          req,
          { reason: 'Intento de subir imagen de producto sin permiso write_catalog', entityType }
        );
        throw new ForbiddenError('No tienes permisos para modificar el catálogo (write_catalog).');
      }
    } else if (entityType === 'store') {
      if (!userContext.permissions?.includes('edit_store_basic') && !userContext.permissions?.includes('edit_store_advanced')) {
        await logSecurityEvent(
          userContext.id,
          'UNAUTHORIZED_ROUTE_ACCESS',
          'HIGH',
          req,
          { reason: 'Intento de subir imagen de sede sin permisos edit_store_basic o edit_store_advanced', entityType }
        );
        throw new ForbiddenError('No tienes permisos para modificar los datos básicos de la sede (edit_store_basic).');
      }
    } else if (entityType === 'commerce') {
      if (!userContext.permissions?.includes('edit_commerce')) {
        await logSecurityEvent(
          userContext.id,
          'UNAUTHORIZED_ROUTE_ACCESS',
          'HIGH',
          req,
          { reason: 'Intento de subir imagen de comercio sin permiso edit_commerce', entityType }
        );
        throw new ForbiddenError('No tienes permisos para editar el comercio (edit_commerce).');
      }
    }


    if (!file) {
      throw new BusinessError('No se ha seleccionado ninguna imagen');
    }

    const image = sharp(file.buffer);
    const metadata = await image.metadata();

    if (entityType === 'store') {
      if (metadata.width < 1080 || metadata.height < 1080) {
        throw new BusinessError(`La imagen no cumple con las dimensiones mínimas (${metadata.width}x${metadata.height}). Para garantizar la calidad en el diseño de la sede, la foto debe tener al menos 1080x1080 píxeles.`);
      }
    } else {
      if (metadata.width < 300 || metadata.height < 300) {
        throw new BusinessError(`La imagen es demasiado pequeña (${metadata.width}x${metadata.height}). Sube una imagen de mejor calidad (mínimo 300x300).`);
      }
    }

    const folderName = `${entityType}s`;
    const fileName = `${entityType}-${Date.now()}.webp`;
    const uploadDir = path.join(__dirname, '../../uploads', folderName);
    const uploadPath = path.join(uploadDir, fileName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    await image
      .resize({ 
        width: metadata.width > 1920 ? 1920 : metadata.width,
        withoutEnlargement: true 
      })
      .webp({ quality: 85 })
      .toFile(uploadPath);
    
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
            'Authorization': authHeader || ''
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
        throw new Error('Error al sincronizar imagen con el servidor de medios: ' + uploadError.message);
      }
    }

    const relativeUrl = `/uploads/${folderName}/${fileName}`;
    
    await logSecurityEvent(
      userContext.id,
      'UPLOAD_IMAGE',
      'LOW',
      req,
      { entityType, fileName, width: metadata.width, height: metadata.height },
      entityType,
      null
    );

    return {
      success: true,
      url: relativeUrl,
      width: metadata.width,
      height: metadata.height,
      format: 'webp'
    };
  }
}

module.exports = new UploadService();
