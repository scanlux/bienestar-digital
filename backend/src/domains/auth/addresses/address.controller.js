const addressService = require('./address.service');
const { handleControllerError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class AddressController {
  async getAddresses(req, res) {
    try {
      const userId = req.user.id;
      const result = await addressService.getAddresses(userId);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createAddress(req, res) {
    try {
      const userId = req.user.id;
      const result = await addressService.createAddress(userId, req.body);

      // Auditoría de Seguridad
      await logSecurityEvent(userId, 'ADDRESS_CREATED', 'LOW', req, {
        addressId: result.id,
        label: result.label,
        direccion: result.direccion
      });

      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      const result = await addressService.updateAddress(userId, addressId, req.body);

      // Auditoría de Seguridad
      await logSecurityEvent(userId, 'ADDRESS_UPDATED', 'LOW', req, {
        addressId,
        changedFields: Object.keys(req.body)
      });

      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async setDefaultAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      const result = await addressService.setDefaultAddress(userId, addressId);

      // Auditoría de Seguridad (Severidad MEDIUM porque afecta lógica de costos)
      await logSecurityEvent(userId, 'ADDRESS_DEFAULT_CHANGED', 'MEDIUM', req, {
        addressId
      });

      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      const result = await addressService.deleteAddress(userId, addressId);

      // Auditoría de Seguridad
      await logSecurityEvent(userId, 'ADDRESS_DELETED', 'LOW', req, {
        addressId
      });

      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new AddressController();
