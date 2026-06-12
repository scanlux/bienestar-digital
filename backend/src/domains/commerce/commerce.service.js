const commerceRepository = require('./commerce.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');

class CommerceService {
  async getCommerces(userContext, status) {
    const isSystem = userContext.actorType === 'system_user';
    
    // BOLA Check: si no es sistema, solo puede listar su propio comercio
    if (!isSystem) {
      const myCommerce = await commerceRepository.findById(userContext.commerceId);
      if (!myCommerce) return [];
      
      // Filtrar por status si fue provisto
      if (status && myCommerce.status !== status) {
        return [];
      }
      return [myCommerce];
    }
    
    return await commerceRepository.findAll(status);
  }

  async getCommerceById(userContext, id, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetId = Number(id);
    
    // BOLA Check: si no es sistema, no puede consultar otro comercio
    if (!isSystem && targetId !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { commerceId: targetId, action: 'view_commerce_details' },
        'commerce',
        targetId
      );
      throw new ForbiddenError('No está autorizado para ver los detalles de este comercio.');
    }
    
    const commerce = await commerceRepository.findById(targetId);
    if (!commerce) {
      throw new NotFoundError('Comercio no encontrado.');
    }
    return commerce;
  }

  async createCommerce(userContext, data, req) {
    const { nit, usuario_id } = data;
    
    // Validar si el usuario ya tiene un comercio asignado
    if (usuario_id) {
      const existingUserCommerce = await commerceRepository.findByUserId(usuario_id);
      if (existingUserCommerce) {
        throw new BusinessError('Este usuario ya tiene un comercio asignado.');
      }
    }
    
    // Validar si el NIT ya está registrado
    if (nit) {
      const existingNit = await commerceRepository.findByNit(nit);
      if (existingNit) {
        throw new BusinessError('El NIT provisto ya se encuentra registrado.');
      }
    }
    
    const commerceId = await commerceRepository.create(data);
    
    await logSecurityEvent(
      userContext.id,
      'CREATE_COMMERCE',
      'HIGH',
      req,
      { commerceId, nombre: data.nombre, nit },
      'commerce',
      commerceId
    );
    
    return commerceId;
  }

  async updateCommerce(userContext, id, data, req) {
    const targetId = Number(id);
    const isSystem = userContext.actorType === 'system_user';
    
    // BOLA Check: si no es de sistema, solo puede actualizar su propio comercio
    if (!isSystem && targetId !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { commerceId: targetId, action: 'edit_commerce' },
        'commerce',
        targetId
      );
      throw new ForbiddenError('No está autorizado para modificar este comercio.');
    }
    
    const commerce = await commerceRepository.findById(targetId);
    if (!commerce) {
      throw new NotFoundError('Comercio no encontrado.');
    }
    
    // Validar reasignación de usuario administrador
    if (data.usuario_id) {
      const existingUserCommerce = await commerceRepository.findByUserId(data.usuario_id, targetId);
      if (existingUserCommerce) {
        throw new BusinessError('Este usuario ya tiene otro comercio asignado.');
      }
    }
    
    // Validar cambio de NIT registrado
    if (data.nit) {
      const existingNit = await commerceRepository.findByNit(data.nit, targetId);
      if (existingNit) {
        throw new BusinessError('El NIT provisto ya se encuentra registrado en otro comercio.');
      }
    }
    
    await commerceRepository.update(targetId, data);
    
    await logSecurityEvent(
      userContext.id,
      'EDIT_COMMERCE',
      'MEDIUM',
      req,
      { commerceId: targetId, nombre: data.nombre, nit: data.nit },
      'commerce',
      targetId
    );
    
    return true;
  }

  async updateCommerceStatus(userContext, id, status, req) {
    const targetId = Number(id);
    const commerce = await commerceRepository.findById(targetId);
    if (!commerce) {
      throw new NotFoundError('Comercio no encontrado.');
    }
    
    await commerceRepository.updateStatus(targetId, status);
    
    await logSecurityEvent(
      userContext.id,
      'CHANGE_COMMERCE_STATUS',
      'HIGH',
      req,
      { commerceId: targetId, newStatus: status },
      'commerce',
      targetId
    );
    
    return true;
  }
}

module.exports = new CommerceService();
