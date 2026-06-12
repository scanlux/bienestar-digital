const intelligenceService = require('./intelligence.service');
const { handleControllerError } = require('../../utils/errors');

class IntelligenceController {
  async getStopWords(req, res) {
    try {
      const result = await intelligenceService.getStopWords();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createStopWords(req, res) {
    try {
      const { word } = req.body;
      const result = await intelligenceService.createStopWords(req.user, word, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteStopWord(req, res) {
    try {
      const { id } = req.params;
      const result = await intelligenceService.deleteStopWord(req.user, id, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getPopularityRanking(req, res) {
    try {
      const result = await intelligenceService.getPopularityRanking();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async triggerPopularity(req, res) {
    try {
      const result = await intelligenceService.triggerPopularity(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async generateTags(req, res) {
    try {
      const { limit, offset } = req.body;
      const result = await intelligenceService.generateTags(limit, offset);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async generateContent(req, res) {
    try {
      const result = await intelligenceService.generateContent(req.user, req.body);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new IntelligenceController();
