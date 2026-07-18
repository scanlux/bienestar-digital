const publicRepository = require('./public.repository');
const adminRepository = require('../admin/admin.repository');
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const { isStoreCurrentlyOpen } = require('../../utils/timeUtils');
const { BusinessError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');

class PublicService {
  async getHomeData() {
    const commerces = await publicRepository.findActiveCommerces();
    const products = await publicRepository.findActiveProducts();

    return commerces.map(commerce => ({
      ...commerce,
      products: products.filter(p => p.commerce_id === commerce.id).map(p => ({
        id: p.id,
        nombre: p.nombre,
        descripcion_corta: p.descripcion_corta,
        precio_base: p.precio_base,
        image_url: p.image_url
      }))
    }));
  }

  async getCommerces() {
    const stores = await publicRepository.findOperativeStores();
    const results = [];

    for (const store of stores) {
      const schedule = await publicRepository.findStoreSchedule(store.id);
      const productItems = await publicRepository.findStoreFeaturedProducts(store.id);
      
      results.push({
        ...store,
        is_currently_open: isStoreCurrentlyOpen(store.estado, schedule),
        schedule,
        product_images: productItems.map(p => p.image_url),
        product_items: productItems.map(p => ({
          id: p.id,
          image_url: p.image_url,
          nombre: p.nombre,
          precio: p.precio_base,
          updated_at: p.updated_at,
          tags: p.tags,
          categoria_nombre: p.categoria_nombre
        }))
      });
    }

    return results;
  }

  async syncDelta(since) {
    if (!since) {
      throw new BusinessError('Missing since parameter');
    }

    const nowUtc = await publicRepository.findServerTime();
    const serverTime = new Date(nowUtc).toISOString();
    const sinceDateObj = new Date(since);

    const changedStoresQuery = await publicRepository.findChangedStores(sinceDateObj);
    const changedProductsQuery = await publicRepository.findChangedProducts(sinceDateObj);

    const storeIdsToUpdate = new Set();
    changedStoresQuery.forEach(row => storeIdsToUpdate.add(row.id));
    changedProductsQuery.forEach(row => storeIdsToUpdate.add(row.id));

    if (storeIdsToUpdate.size === 0) {
      return { serverTime, changedStores: [] };
    }

    const idsArray = Array.from(storeIdsToUpdate);
    const stores = await publicRepository.findStoresData(idsArray);

    const results = [];
    for (const store of stores) {
      const schedule = await publicRepository.findStoreSchedule(store.id);
      const productItems = await publicRepository.findStoreFeaturedProducts(store.id);
      
      results.push({
        ...store,
        is_currently_open: isStoreCurrentlyOpen(store.estado, schedule),
        schedule,
        product_images: productItems.map(p => p.image_url),
        product_items: productItems.map(p => ({
          id: p.id,
          image_url: p.image_url,
          nombre: p.nombre,
          precio: p.precio_base,
          updated_at: p.updated_at,
          tags: p.tags,
          categoria_nombre: p.categoria_nombre
        }))
      });
    }

    return { serverTime, changedStores: results };
  }

  async getStoreDetail(storeId) {
    const storeData = await publicRepository.findStoreAndCommerceById(storeId);
    if (!storeData) {
      throw new NotFoundError('Sede no encontrada');
    }

    const schedule = await publicRepository.findStoreSchedule(storeId);
    storeData.schedule = schedule;
    storeData.is_currently_open = isStoreCurrentlyOpen(storeData.estado, schedule);

    // Consultar si tiene el upgrade 'estado_empresarial' activo
    const [[activeUpgradeRow]] = await db.query(
      'SELECT COUNT(*) as activeCount FROM commerce_upgrades WHERE commerce_id = ? AND upgrade_type = "estado_empresarial" AND expires_at > NOW()',
      [storeData.commerce_id]
    );
    const hasBusinessStatus = Number(activeUpgradeRow.activeCount) > 0;

    const menus = await publicRepository.findMenusByStoreId(storeId);
    const menuStructure = [];

    for (const menu of menus) {
      const categorias = await publicRepository.findCategoriesByMenuAndStore(menu.id, storeId);
      // Sin estado empresarial, se limita a las 3 primeras categorias
      const limitedCategorias = hasBusinessStatus ? categorias : categorias.slice(0, 3);
      const categoriasConProductos = [];

      for (const cat of limitedCategorias) {
        const products = await publicRepository.findProductsByCategoryAndStore(cat.id, storeId);
        // Sin estado empresarial, se limita a los 5 primeros productos por categoria
        const limitedProducts = hasBusinessStatus ? products : products.slice(0, 5);
        categoriasConProductos.push({
          ...cat,
          products: limitedProducts
        });
      }

      menuStructure.push({
        ...menu,
        categories: categoriasConProductos
      });
    }

    storeData.menus = menuStructure;
    return storeData;
  }

  async getVideosFeed() {
    return await publicRepository.findActiveVideos();
  }

  async toggleVideoLike(userContext, videoId) {
    const userId = userContext.id;

    const videoExists = await publicRepository.checkVideoExists(videoId);
    if (!videoExists) {
      throw new NotFoundError('Video no encontrado o inactivo.');
    }

    const hasLiked = await publicRepository.checkLikeExists(videoId, userId);
    
    if (hasLiked) {
      await publicRepository.deleteLike(videoId, userId);
      return { liked: false, message: 'Me gusta eliminado.' };
    } else {
      await publicRepository.insertLike(videoId, userId);
      return { liked: true, message: 'Me gusta registrado.' };
    }
  }

  async getVideoComments(videoId) {
    return await publicRepository.findVideoComments(videoId);
  }

  async addVideoComment(userContext, videoId, commentData) {
    const { comment } = commentData;
    const userId = userContext.id;

    if (!comment || comment.trim().length === 0) {
      throw new BusinessError('El comentario no puede estar vacío.');
    }

    const videoExists = await publicRepository.checkVideoExists(videoId);
    if (!videoExists) {
      throw new NotFoundError('Video no encontrado o inactivo.');
    }

    const commentId = await publicRepository.insertComment(videoId, userId, comment.trim());

    return {
      success: true,
      commentId,
      message: 'Comentario registrado con éxito.'
    };
  }

  async createRequest(requestData, req = null) {
    const { 
      tipo_solicitud, nit, nit_dv, razon_social, email_contacto, nombres_contacto, 
      apellidos_contacto, celular_contacto, logo_url, documento_camara_comercio, 
      documento_rut, documento_cedula_frente, documento_cedula_dorso,
      telefono, ciudad, direccion, descripcion
    } = requestData;

    if (
      !tipo_solicitud || !nit || !nit_dv || !razon_social || !email_contacto || 
      !nombres_contacto || !apellidos_contacto || !celular_contacto || 
      !logo_url || !documento_camara_comercio || !documento_rut || 
      !documento_cedula_frente || !documento_cedula_dorso ||
      !telefono || !ciudad || !direccion
    ) {
      throw new BusinessError('Todos los campos son obligatorios, incluyendo los documentos adjuntos.');
    }

    if (!['commerce', 'delivery_company'].includes(tipo_solicitud)) {
      throw new BusinessError('Tipo de solicitud inválido.');
    }

    // Validar formato de las URLs del servidor de medios en Bogotá
    const pdfUrlRegex = /^(https?:\/\/)(localhost:4001|127\.0\.0\.1:4001|trendy-telemetry\.sytes\.net)\/uploads\/requests\/req_doc_.*\.(pdf)$/i;
    const imageUrlRegex = /^(https?:\/\/)(localhost:4001|127\.0\.0\.1:4001|trendy-telemetry\.sytes\.net)\/uploads\/requests\/req_doc_.*\.(jpe?g|png|webp)$/i;

    const pdfsToValidate = [documento_camara_comercio, documento_rut];
    for (const url of pdfsToValidate) {
      if (!url || !pdfUrlRegex.test(url)) {
        throw new BusinessError('Formato o procedencia de documento adjunto inválido (se esperaba PDF). Debe provenir del servidor de medios autorizado.');
      }
    }

    const imagesToValidate = [logo_url, documento_cedula_frente, documento_cedula_dorso];
    for (const url of imagesToValidate) {
      if (!url || !imageUrlRegex.test(url)) {
        throw new BusinessError('Formato o procedencia de documento adjunto inválido (se esperaba Imagen). Debe provenir del servidor de medios autorizado.');
      }
    }

    const existingRequest = await publicRepository.findRegistrationRequestByNitOrEmail(nit, email_contacto);
    if (existingRequest.length > 0) {
      const reqState = existingRequest[0].estado;
      if (reqState === 'pendiente' || reqState === 'espera_informacion') {
        throw new BusinessError('Ya existe una solicitud pendiente o en revisión con este NIT o Correo.');
      } else if (reqState === 'aprobado') {
        throw new BusinessError('Este NIT o Correo ya cuenta con una solicitud aprobada y una cuenta de negocio.');
      }
    }

    const existingUser = await publicRepository.findUserByEmail(email_contacto);
    if (existingUser.length > 0) {
      throw new BusinessError('El correo electrónico ya se encuentra registrado en el sistema.');
    }

    const insertId = await publicRepository.insertRegistrationRequest(requestData);

    await logSecurityEvent(
      null,
      'SUBMIT_REGISTRATION_REQUEST',
      'LOW',
      req,
      { email: email_contacto, razon_social },
      'request',
      insertId
    );

    return { success: true, message: 'Solicitud de registro enviada con éxito.' };
  }

  async verifyRequestToken(token) {
    if (!token) throw new BusinessError('Token no provisto.');
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      const { requestId, missingFields } = verified;
      
      const request = await adminRepository.findRequestById(requestId);
      if (!request) throw new NotFoundError('Solicitud de registro asociada al token no encontrada.');
      if (request.estado !== 'espera_informacion') {
        throw new BusinessError('Esta solicitud ya ha sido procesada o no se encuentra en espera de informacion.');
      }

      return { request, missingFields };
    } catch (err) {
      if (err instanceof BusinessError || err instanceof NotFoundError) throw err;
      throw new BusinessError('Token de solicitud invalido o expirado.');
    }
  }

  async updateRequestWithCorrections(token, requestData, req = null) {
    const { request } = await this.verifyRequestToken(token);
    
    const { 
      tipo_solicitud, nit, nit_dv, razon_social, email_contacto, nombres_contacto, 
      apellidos_contacto, celular_contacto, logo_url, documento_camara_comercio, 
      documento_rut, documento_cedula_frente, documento_cedula_dorso,
      telefono, ciudad, direccion, descripcion
    } = requestData;

    if (
      !tipo_solicitud || !nit || !nit_dv || !razon_social || !email_contacto || 
      !nombres_contacto || !apellidos_contacto || !celular_contacto || 
      !logo_url || !documento_camara_comercio || !documento_rut || 
      !documento_cedula_frente || !documento_cedula_dorso ||
      !telefono || !ciudad || !direccion
    ) {
      throw new BusinessError('Todos los campos son obligatorios, incluyendo los documentos adjuntos.');
    }

    const pdfUrlRegex = /^(https?:\/\/)(localhost:4001|127\.0\.0\.1:4001|trendy-telemetry\.sytes\.net)\/uploads\/requests\/req_doc_.*\.(pdf)$/i;
    const imageUrlRegex = /^(https?:\/\/)(localhost:4001|127\.0\.0\.1:4001|trendy-telemetry\.sytes\.net)\/uploads\/requests\/req_doc_.*\.(jpe?g|png|webp)$/i;

    const pdfsToValidate = [documento_camara_comercio, documento_rut];
    for (const url of pdfsToValidate) {
      if (!url || !pdfUrlRegex.test(url)) {
        throw new BusinessError('Formato o procedencia de documento adjunto inválido.');
      }
    }

    const imagesToValidate = [logo_url, documento_cedula_frente, documento_cedula_dorso];
    for (const url of imagesToValidate) {
      if (!url || !imageUrlRegex.test(url)) {
        throw new BusinessError('Formato o procedencia de imagen adjunta inválida.');
      }
    }

    if (email_contacto !== request.email_contacto) {
      const existingUser = await publicRepository.findUserByEmail(email_contacto);
      if (existingUser.length > 0) {
        throw new BusinessError('El nuevo correo electrónico ya se encuentra registrado.');
      }
    }

    await publicRepository.updateRegistrationRequest(request.id, requestData);

    await logSecurityEvent(
      null,
      'SUBMIT_CORRECTIONS',
      'LOW',
      req,
      { email: request.email_contacto, razon_social: request.razon_social },
      'request',
      request.id
    );

    return { success: true, message: 'Solicitud corregida y enviada a revision con exito.' };
  }

  async getMaintenanceStatus() {
    const redisClient = require('../../config/redis');
    const isMaintenance = await redisClient.get('system:maintenance_mode');
    const detailsJson = await redisClient.get('system:maintenance_details');
    const details = detailsJson ? JSON.parse(detailsJson) : null;

    return {
      maintenanceMode: isMaintenance === 'true',
      details
    };
  }

  async getMaintenanceBypassRules() {
    const redisClient = require('../../config/redis');
    const pageRulesJson = await redisClient.get('system:maintenance_bypass_pages');
    const pageRules = pageRulesJson ? JSON.parse(pageRulesJson) : ['/login', '/'];
    return {
      success: true,
      rules: pageRules
    };
  }
}

module.exports = new PublicService();
