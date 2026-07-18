const publicService = require('./public.service');
const { handleControllerError } = require('../../utils/errors');

class PublicController {
  async getHomeData(req, res) {
    try {
      const result = await publicService.getHomeData();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getCommerces(req, res) {
    try {
      const result = await publicService.getCommerces();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async syncDelta(req, res) {
    try {
      const { since } = req.query;
      const result = await publicService.syncDelta(since);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getStoreDetail(req, res) {
    try {
      const { id } = req.params;
      const result = await publicService.getStoreDetail(id);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getVideosFeed(req, res) {
    try {
      const result = await publicService.getVideosFeed();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async toggleVideoLike(req, res) {
    try {
      const { id } = req.params;
      const result = await publicService.toggleVideoLike(req.user, id);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getVideoComments(req, res) {
    try {
      const { id } = req.params;
      const result = await publicService.getVideoComments(id);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async addVideoComment(req, res) {
    try {
      const { id } = req.params;
      const result = await publicService.addVideoComment(req.user, id, req.body);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createRequest(req, res) {
    try {
      const result = await publicService.createRequest(req.body, req);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async verifyRequestToken(req, res) {
    try {
      const { token } = req.query;
      const result = await publicService.verifyRequestToken(token);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateRequestWithCorrections(req, res) {
    try {
      const { token, requestData } = req.body;
      const result = await publicService.updateRequestWithCorrections(token, requestData, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getMaintenanceStatus(req, res) {
    try {
      const result = await publicService.getMaintenanceStatus();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getMaintenanceBypassRules(req, res) {
    try {
      const result = await publicService.getMaintenanceBypassRules();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new PublicController();
