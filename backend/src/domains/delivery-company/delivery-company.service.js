const deliveryCompanyRepository = require('./delivery-company.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');

class DeliveryCompanyService {
  async getDrivers(userContext, queryData) {
    const isSystem = userContext.actorType === 'system_user';
    const deliveryCompanyId = isSystem ? queryData.deliveryCompanyId : userContext.deliveryCompanyId;

    if (!deliveryCompanyId) {
      throw new BusinessError('deliveryCompanyId es requerido.');
    }

    return await deliveryCompanyRepository.findDriversByCompanyId(deliveryCompanyId);
  }

  async affiliateDriver(userContext, bodyData) {
    const { cedula } = bodyData;
    const isSystem = userContext.actorType === 'system_user';
    const deliveryCompanyId = isSystem ? bodyData.deliveryCompanyId : userContext.deliveryCompanyId;

    if (!cedula) {
      throw new BusinessError('Cédula es requerida.');
    }

    if (!deliveryCompanyId) {
      throw new BusinessError('deliveryCompanyId es requerido.');
    }

    const driver = await deliveryCompanyRepository.findDriverByCedula(cedula);
    if (!driver) {
      throw new NotFoundError('No se encontró ningún repartidor con la cédula provista.');
    }

    if (driver.es_repartidor !== 1) {
      throw new BusinessError('El usuario asociado a esta cédula no tiene habilitado el modo de repartidor.');
    }

    if (driver.delivery_company_id !== null) {
      if (driver.delivery_company_id === parseInt(deliveryCompanyId, 10)) {
        throw new BusinessError('El repartidor ya se encuentra afiliado a tu empresa.');
      }
      throw new BusinessError('El repartidor ya está afiliado a otra empresa de delivery.');
    }

    await deliveryCompanyRepository.updateDriverCompany(driver.id, deliveryCompanyId);

    return `Repartidor ${driver.nombres} ${driver.apellidos} afiliado exitosamente.`;
  }

  async deaffiliateDriver(userContext, userId, queryData) {
    const isSystem = userContext.actorType === 'system_user';
    const deliveryCompanyId = isSystem ? queryData.deliveryCompanyId : userContext.deliveryCompanyId;

    if (!deliveryCompanyId) {
      throw new BusinessError('deliveryCompanyId es requerido.');
    }

    const profile = await deliveryCompanyRepository.findDriverProfile(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de repartidor no encontrado.');
    }

    if (profile.delivery_company_id !== parseInt(deliveryCompanyId, 10) && !isSystem) {
      throw new ForbiddenError('No tienes permiso para desafiliar a este repartidor.');
    }

    await deliveryCompanyRepository.updateDriverCompany(userId, null);

    return 'Repartidor desafiliado exitosamente.';
  }
}

module.exports = new DeliveryCompanyService();
