const maintenanceRepository = require('./maintenance.repository');
const redisClient = require('../../config/redis');
const { BusinessError, ForbiddenError } = require('../../utils/errors');
const appLogger = require('../../utils/appLogger');

class MaintenanceService {
  async syncBypassRulesToRedis() {
    try {
      const rules = await maintenanceRepository.findAllRules();
      
      const apiRules = rules
        .filter(r => r.type === 'api')
        .map(r => r.pattern);
      
      const pageRules = rules
        .filter(r => r.type === 'page')
        .map(r => r.pattern);

      // Guardar en Redis como JSON strings
      await redisClient.set('system:maintenance_bypass_apis', JSON.stringify(apiRules));
      await redisClient.set('system:maintenance_bypass_pages', JSON.stringify(pageRules));
      
      appLogger.info(`[MAINTENANCE] Reglas de bypass sincronizadas a Redis. APIs: ${apiRules.length}, Páginas: ${pageRules.length}`);
    } catch (err) {
      appLogger.error(`[MAINTENANCE] Error al sincronizar reglas de bypass a Redis: ${err.message}`);
      throw err;
    }
  }

  async getBypassRules() {
    return await maintenanceRepository.findAllRules();
  }

  async addBypassRule(pattern, type, description) {
    if (!pattern) {
      throw new BusinessError('El patrón de URL o prefijo es obligatorio.');
    }
    if (!['api', 'page'].includes(type)) {
      throw new BusinessError('Tipo de regla inválido.');
    }

    try {
      const insertId = await maintenanceRepository.createRule(pattern, type, description);
      await this.syncBypassRulesToRedis();
      return { id: insertId, pattern, type, description };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new BusinessError('El patrón ingresado ya existe como excepción.');
      }
      throw err;
    }
  }

  async removeBypassRule(id) {
    if (!id) {
      throw new BusinessError('El ID es obligatorio.');
    }

    // Verificar existencia y si es del sistema antes de intentar borrar
    const rules = await maintenanceRepository.findAllRules();
    const target = rules.find(r => r.id === id);
    if (!target) {
      throw new BusinessError('La regla no existe.');
    }
    if (target.is_system) {
      throw new ForbiddenError('Las reglas críticas del sistema no pueden eliminarse desde el panel.');
    }

    const success = await maintenanceRepository.deleteRule(id);
    if (!success) {
      throw new BusinessError('La regla no pudo ser eliminada.');
    }

    await this.syncBypassRulesToRedis();
    return { success: true };
  }
}

module.exports = new MaintenanceService();
