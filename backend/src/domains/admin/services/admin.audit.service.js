const adminRepository = require('../admin.repository');
const { BusinessError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class AdminAuditService {
  constructor(adminService) {
    this.adminService = adminService;
  }

  async getSecurityLogs(user, filters, limit = 50, offset = 0, req) {
    if (user) {
      await logSecurityEvent(
        user.id,
        'VIEW_SECURITY_LOGS',
        'LOW',
        req,
        {
          filters: {
            eventType: filters.eventType,
            actorType: filters.actorType,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo
          }
        },
        user.actorType || 'system_user',
        0
      );
    }

    const logs = await adminRepository.findSecurityLogs(filters, Number(limit), Number(offset));
    const total = await adminRepository.countSecurityLogs(filters);

    const statsFilters = { ...filters };
    delete statsFilters.severity;
    const severityStats = await adminRepository.getSeverityStats(statsFilters);

    return { logs, total, severityStats };
  }

  async getEmailTemplates(user, req) {
    const templates = await adminRepository.getAllEmailTemplates();
    await logSecurityEvent(
      user.id, 'VIEW_EMAIL_TEMPLATES', 'LOW', req, {}, 'system_user', 0
    );
    return templates;
  }

  async getEmailTemplate(user, name, req) {
    const template = await adminRepository.getEmailTemplateByName(name);
    if (!template) throw new BusinessError('Plantilla no encontrada.');
    await logSecurityEvent(
      user.id, 'VIEW_EMAIL_TEMPLATE', 'LOW', req, { name }, 'system_user', 0
    );
    return template;
  }

  async updateEmailTemplate(user, name, { subject, html_body }, req) {
    const existing = await adminRepository.getEmailTemplateByName(name);
    if (!existing) throw new BusinessError('Plantilla no encontrada.');
    await adminRepository.updateEmailTemplate(name, { subject, html_body });
    await logSecurityEvent(
      user.id, 'UPDATE_EMAIL_TEMPLATE', 'MEDIUM', req, { name }, 'system_user', 0
    );
    return { success: true, message: 'Plantilla actualizada correctamente.' };
  }

  async createEmailTemplate(user, data, req) {
    const { name, label, category, subject, html_body, variables } = data;
    if (!name || !label || !category || !subject || !html_body) {
      throw new BusinessError('Nombre, etiqueta, categoria, asunto y cuerpo son requeridos.');
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const existing = await adminRepository.getEmailTemplateByName(slug);
    if (existing) throw new BusinessError('Ya existe una plantilla con ese nombre.');
    const id = await adminRepository.createEmailTemplate({ name: slug, label, category, subject, html_body, variables });
    await logSecurityEvent(
      user.id, 'CREATE_EMAIL_TEMPLATE', 'MEDIUM', req, { name: slug, label }, 'system_user', 0
    );
    return { success: true, id, message: 'Plantilla creada correctamente.' };
  }
}

module.exports = AdminAuditService;
