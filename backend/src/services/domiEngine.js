/**
 * Facade de Compatibilidad hacia atrás para el Motor Financiero DOMI
 * Redirige todas las operaciones al núcleo modular en ./domi-kernel
 */

module.exports = require('./domi-kernel/index');
