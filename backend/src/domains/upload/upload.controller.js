const uploadService = require('./upload.service');
const { handleControllerError } = require('../../utils/errors');

class UploadController {
  async uploadImage(req, res) {
    try {
      const { entityType } = req.params;
      const authHeader = req.header('Authorization');
      const result = await uploadService.uploadImage(req.user, entityType, req.file, authHeader, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new UploadController();
