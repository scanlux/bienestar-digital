/**
 * Módulo puente retrocompatible para generateExplorerHtml
 * Delega en la arquitectura modular de src/views/explorer/
 */
const { generateExplorerHtml } = require('./explorer');

module.exports = {
  generateExplorerHtml
};
