const commerceService = require('./commerce.service');
const { handleControllerError } = require('../../utils/errors');

class CommerceController {
  async getCommerces(req, res) {
    try {
      const { status } = req.query;
      const result = await commerceService.getCommerces(req.user, status);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getCommerceById(req, res) {
    try {
      const { id } = req.params;
      const result = await commerceService.getCommerceById(req.user, id, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createCommerce(req, res) {
    try {
      const id = await commerceService.createCommerce(req.user, req.body, req);
      res.json({ id, message: 'Comercio creado con éxito' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateCommerce(req, res) {
    try {
      const { id } = req.params;
      await commerceService.updateCommerce(req.user, id, req.body, req);
      res.json({ message: 'Comercio actualizado con éxito' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateCommerceStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await commerceService.updateCommerceStatus(req.user, id, status, req);
      res.json({ message: `Comercio actualizado a estado: ${status}` });
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new CommerceController();
