const publicRepository = require('./public.repository');
const { isStoreCurrentlyOpen } = require('../../utils/timeUtils');
const { BusinessError, NotFoundError } = require('../../utils/errors');

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

    const menus = await publicRepository.findMenusByStoreId(storeId);
    const menuStructure = [];

    for (const menu of menus) {
      const categorias = await publicRepository.findCategoriesByMenuAndStore(menu.id, storeId);
      const categoriasConProductos = [];

      for (const cat of categorias) {
        const products = await publicRepository.findProductsByCategoryAndStore(cat.id, storeId);
        categoriasConProductos.push({
          ...cat,
          products
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

  async createRequest(requestData) {
    const { tipo_solicitud, nit, razon_social, email_contacto, nombres_contacto, apellidos_contacto, celular_contacto } = requestData;

    if (!tipo_solicitud || !nit || !razon_social || !email_contacto || !nombres_contacto || !apellidos_contacto || !celular_contacto) {
      throw new BusinessError('Todos los campos son obligatorios.');
    }

    if (!['commerce', 'delivery_company'].includes(tipo_solicitud)) {
      throw new BusinessError('Tipo de solicitud inválido.');
    }

    const existingRequest = await publicRepository.findRegistrationRequestByNitOrEmail(nit, email_contacto);
    if (existingRequest.length > 0) {
      const reqState = existingRequest[0].estado;
      if (reqState === 'pendiente') {
        throw new BusinessError('Ya existe una solicitud pendiente con este NIT o Correo.');
      } else if (reqState === 'aprobado') {
        throw new BusinessError('Este NIT o Correo ya cuenta con una solicitud aprobada y una cuenta de negocio.');
      }
    }

    const existingUser = await publicRepository.findUserByEmail(email_contacto);
    if (existingUser.length > 0) {
      throw new BusinessError('El correo electrónico ya se encuentra registrado en el sistema.');
    }

    await publicRepository.insertRegistrationRequest(requestData);

    return { success: true, message: 'Solicitud de registro enviada con éxito.' };
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
}

module.exports = new PublicService();
