const db = require('../../config/db');
const adminRepository = require('./admin.repository');
const { BusinessError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const bcrypt = require('bcryptjs');
const emailService = require('../../services/emailService');
const userRepository = require('../user/user.repository');
const appLogger = require('../../utils/appLogger');
const jwt = require('jsonwebtoken');

class AdminService {
  async getRegistrationRequests(status) {
    return await adminRepository.findRegistrationRequests(status);
  }

  async rejectRegistrationRequest(user, id, notes_system, req) {
    const request = await adminRepository.findRequestById(id);
    if (!request) {
      throw new NotFoundError('Solicitud no encontrada.');
    }
    if (request.estado !== 'pendiente') {
      throw new BusinessError(`La solicitud no se puede rechazar porque su estado es: ${request.estado}`);
    }

    await adminRepository.updateRequestStatus(id, 'rechazado', notes_system);

    // Enviar correo de rechazo de forma asíncrona
    emailService.sendMail({
      to: request.email_contacto,
      subject: 'Resultado de tu Solicitud de Afiliación - Bienestar Digital',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 30px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Estado de Afiliación</h1>
            </div>
            <div style="padding: 40px;">
              <p style="font-size: 16px; line-height: 24px; margin-bottom: 20px;">Estimado(a) <strong>${request.nombres_contacto} ${request.apellidos_contacto}</strong>,</p>
              <p style="font-size: 16px; line-height: 24px; margin-bottom: 20px;">Agradecemos tu interés en unirte a la red de <strong>Bienestar Digital</strong>.</p>
              <p style="font-size: 16px; line-height: 24px; margin-bottom: 20px;">Lamentablemente, tras revisar los documentos y datos de <strong>${request.razon_social}</strong> (NIT: ${request.nit}), tu solicitud no ha podido ser aprobada en esta oportunidad.</p>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 4px; margin: 30px 0;">
                <h3 style="margin-top: 0; margin-bottom: 8px; color: #991b1b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Observaciones del Auditor:</h3>
                <p style="margin: 0; font-size: 15px; line-height: 22px; color: #7f1d1d;">${notes_system || 'Los documentos presentados no cumplen con los requisitos mínimos del protocolo.'}</p>
              </div>
              
              <p style="font-size: 15px; line-height: 24px; color: #64748b; margin-top: 30px;">Si deseas volver a postularte con la información corregida o tienes alguna duda, puedes responder a este correo.</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;">
              © ${new Date().getFullYear()} Bienestar Digital S.A.S. Todos los derechos reservados.
            </div>
          </div>
        </div>
      `,
      text: `Estimado(a) ${request.nombres_contacto} ${request.apellidos_contacto},\n\nTu solicitud de afiliación para ${request.razon_social} ha sido rechazada por el siguiente motivo:\n\n${notes_system || 'Los documentos presentados no cumplen con los requisitos.'}\n\nAtentamente,\nEquipo de Bienestar Digital`
    }).catch(async (err) => {
      console.error('[EMAIL ERROR] Failed to send rejection email:', err.message);
      try {
        await logSecurityEvent(
          user.id,
          'EMAIL_DELIVERY_FAILURE',
          'HIGH',
          req,
          { error: err.message, recipient: request.email_contacto, emailType: 'rejection' },
          'request',
          parseInt(id)
        );
      } catch (logErr) {
        console.error('Failed to log email delivery failure event:', logErr.message);
      }
    });

    await logSecurityEvent(
      user.id,
      'REJECT_REGISTRATION_REQUEST',
      'MEDIUM',
      req,
      { requestId: id, notas_system: notes_system },
      'request',
      parseInt(id)
    );

    return { success: true, message: 'Solicitud rechazada con exito.' };
  }

  async approveRegistrationRequest(user, id, notes_system, req) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const request = await adminRepository.findRequestById(id, connection);
      if (!request) {
        throw new NotFoundError('Solicitud no encontrada.');
      }
      if (request.estado !== 'pendiente') {
        throw new BusinessError(`La solicitud ya no esta pendiente. Estado actual: ${request.estado}`);
      }

      const emailExists = await adminRepository.checkUserExistsByEmail(request.email_contacto, connection);
      if (emailExists) {
        throw new BusinessError('El correo electronico del contacto ya se encuentra registrado.');
      }

      const crypto = require('crypto');
      const plainPassword = crypto.randomBytes(6).toString('hex'); // 12 chars hex
      const defaultPasswordHash = await bcrypt.hash(plainPassword, 10);
      const newUserId = await adminRepository.createUser(request.email_contacto, defaultPasswordHash, connection);

      await adminRepository.createProfile(newUserId, request, connection);

      if (request.tipo_solicitud === 'commerce') {
        await adminRepository.createCommerce(
          newUserId, 
          request.razon_social, 
          request.nit, 
          request.email_contacto,
          request.nit_dv,
          request.telefono,
          request.ciudad,
          request.direccion,
          request.descripcion,
          request.logo_url,
          request.nombres_contacto,
          request.apellidos_contacto,
          connection
        );
      } else if (request.tipo_solicitud === 'delivery_company') {
        await adminRepository.createDeliveryCompany(newUserId, request.nit, request.razon_social, connection);
      }

      await adminRepository.updateRequestStatus(id, 'aprobado', notes_system, connection);

      await connection.commit();

      // Enviar correo de bienvenida y acceso de forma asíncrona
      emailService.sendMail({
        to: request.email_contacto,
        subject: '¡Felicidades! Tu Solicitud de Afiliación ha sido Aprobada - Bienestar Digital',
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;">
              <div style="background: linear-gradient(135deg, #10b981, #047857); padding: 30px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">¡Bienvenido al Ecosistema!</h1>
              </div>
              <div style="padding: 40px;">
                <p style="font-size: 16px; line-height: 24px; margin-bottom: 20px;">Estimado(a) <strong>${request.nombres_contacto} ${request.apellidos_contacto}</strong>,</p>
                <p style="font-size: 16px; line-height: 24px; margin-bottom: 20px;">Nos complace informarte que la solicitud de afiliación para <strong>${request.razon_social}</strong> (NIT: ${request.nit}) ha sido **aprobada** con éxito.</p>
                <p style="font-size: 16px; line-height: 24px; margin-bottom: 20px;">Se ha creado una cuenta administrativa en nuestro sistema y una **Wallet corporativa inmutable** asociada para que comiences a operar inmediatamente.</p>
                
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 25px; border-radius: 8px; margin: 30px 0;">
                  <h3 style="margin-top: 0; margin-bottom: 15px; color: #166534; font-size: 15px; font-weight: 700;">Tus Credenciales de Acceso:</h3>
                  <table style="width: 100%; font-size: 15px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; color: #475569; width: 140px;"><strong>Usuario / Correo:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a;"><code>${request.email_contacto}</code></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #475569;"><strong>Clave Temporal:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a;"><code style="background-color: #dcfce7; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: #15803d;">${plainPassword}</code></td>
                    </tr>
                  </table>
                </div>
                
                <div style="text-align: center; margin: 35px 0 25px 0;">
                  <a href="https://trendy.sytes.net/auth/login" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Iniciar Sesión</a>
                </div>
                
                <p style="font-size: 14px; line-height: 22px; color: #64748b; text-align: center;">Por tu seguridad, te recomendamos cambiar la contraseña temporal tan pronto ingreses por primera vez al panel de control.</p>
              </div>
              <div style="background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Bienestar Digital S.A.S. Todos los derechos reservados.
              </div>
            </div>
          </div>
        `,
        text: `¡Felicidades! Tu solicitud de afiliación para ${request.razon_social} ha sido aprobada.\n\nUsuario: ${request.email_contacto}\nClave Temporal: ${plainPassword}\n\nInicia sesión aquí: https://trendy.sytes.net/auth/login\n\nAtentamente,\nEquipo de Bienestar Digital`
      }).catch(async (err) => {
        console.error('[EMAIL ERROR] Failed to send approval email:', err.message);
        try {
          // Bloquear al usuario para evitar accesos con credenciales no recibidas/verificadas
          await db.query("UPDATE users SET estado = 'inactivo' WHERE id = ?", [newUserId]);
          
          await logSecurityEvent(
            user.id,
            'EMAIL_DELIVERY_FAILURE',
            'HIGH',
            req,
            { 
              error: err.message, 
              recipient: request.email_contacto, 
              emailType: 'approval',
              actionTaken: 'User locked due to email delivery failure',
              lockedUserId: newUserId
            },
            'request',
            parseInt(id)
          );
        } catch (logErr) {
          console.error('Failed to lock user or log email failure event:', logErr.message);
        }
      });

      await logSecurityEvent(
        user.id,
        'APPROVE_REGISTRATION_REQUEST',
        'HIGH',
        req,
        { requestId: id, tipo: request.tipo_solicitud, razon_social: request.razon_social },
        'request',
        parseInt(id)
      );

      return { success: true, message: 'Solicitud aprobada y negocio creado exitosamente.', temporaryPassword: plainPassword };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async sendInvitation(user, invitationData, req) {
    const { email, razon_social } = invitationData;
    if (!email || !razon_social) {
      throw new BusinessError('El correo y la razón social son requeridos para enviar una invitación.');
    }

    const emailExists = await adminRepository.checkUserExistsByEmail(email);
    if (emailExists) {
      throw new BusinessError('El correo electrónico del contacto ya se encuentra registrado.');
    }

    // Cargar plantilla desde DB (con fallback al template hardcodeado)
    let emailSubject = 'Invitacion Especial de Afiliacion - Bienestar Digital';
    let emailHtml;
    try {
      const template = await adminRepository.getEmailTemplateByName('invitation');
      if (template) {
        const registroUrl = `${process.env.FRONTEND_URL || 'https://trendy.sytes.net'}/registro-solicitud`;
        emailSubject = template.subject;
        emailHtml = template.html_body
          .replace(/\{\{razon_social\}\}/g, razon_social)
          .replace(/\{\{registro_url\}\}/g, registroUrl)
          .replace(/\{\{year\}\}/g, new Date().getFullYear());
      }
    } catch (tplErr) {
      appLogger.warn(`[EMAIL] No se pudo cargar plantilla de DB, usando fallback: ${tplErr.message}`);
    }

    if (!emailHtml) {
      const registroUrl = `${process.env.FRONTEND_URL || 'https://trendy.sytes.net'}/registro-solicitud`;
      emailHtml = `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;"><div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; text-align: center; color: #ffffff;"><h1 style="margin: 0; font-size: 24px; font-weight: 700;">Invitacion de Registro</h1></div><div style="padding: 40px;"><p>Estimados representantes de <strong>${razon_social}</strong>,</p><p>Te invitamos a unirte a Bienestar Digital.</p><div style="text-align: center; margin: 35px 0;"><a href="${registroUrl}" style="background-color: #6366f1; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700;">Completar Registro</a></div></div></div></div>`;
    }

    await emailService.sendMail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
      text: `Estimados representantes de ${razon_social},\n\nTe invitamos formalmente a unirte a Bienestar Digital. Completa tu registro aqui: ${process.env.FRONTEND_URL || 'https://trendy.sytes.net'}/registro-solicitud\n\nAtentamente,\nEquipo de Bienestar Digital`
    });

    await logSecurityEvent(
      user.id,
      'SEND_INVITATION_EMAIL',
      'LOW',
      req,
      { email, razon_social },
      'system',
      0
    );

    return { success: true, message: 'Invitación enviada con éxito por correo.' };
  }

  async getInvitations() {
    const logs = await adminRepository.findSecurityLogs({ eventType: 'SEND_INVITATION_EMAIL' }, 100, 0);
    return logs.map(log => {
      let email = '';
      let razon_social = '';
      try {
        const payload = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        email = payload?.email || '';
        razon_social = payload?.razon_social || '';
      } catch (err) {
        // Ignorar
      }
      return {
        id: log.id,
        email,
        razon_social,
        created_at: log.created_at
      };
    });
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

    // Conteo de severidades omitiendo el filtro de severidad activo para los KPIs
    const statsFilters = { ...filters };
    delete statsFilters.severity;
    const severityStats = await adminRepository.getSeverityStats(statsFilters);

    return { logs, total, severityStats };
  }

  async getGlobalStats() {
    return await adminRepository.findGlobalStats();
  }

  async getFinancialFlags() {
    return await adminRepository.getFinancialFlags();
  }

  async updateFinancialFlag(user, key, enabled, req) {
    if (enabled === undefined) {
      throw new BusinessError('El estado "enabled" es obligatorio.');
    }
    
    if (key === 'withdrawals_enabled') {
      const isRoot = user.actorType === 'system_user' && user.rol === 'root';
      const hasPerm = isRoot || await userRepository.checkUserPermission(user.actorType, user.id, 'suspend_withdrawals');
      if (!hasPerm) {
        throw new ForbiddenError('No tienes autorización para suspender o habilitar los retiros globales.');
      }
    }

    await adminRepository.updateFinancialFlag(key, enabled, user.id);
    
    await logSecurityEvent(
      user.id,
      'UPDATE_FINANCIAL_FLAG',
      'HIGH',
      req,
      { flagKey: key, enabled: !!enabled },
      user.actorType || 'system_user',
      0
    );
    
    return { success: true, message: `Interruptor ${key} actualizado a ${enabled ? 'activo' : 'inactivo'}` };
  }

  async updatePermissionUIMode(user, id, mode, req) {
    if (!['ghost', 'hidden', 'disabled'].includes(mode)) {
      throw new BusinessError('Modo de restricción inválido. Debe ser: ghost, hidden, o disabled.');
    }
    await adminRepository.updatePermissionUIMode(id, mode);

    await logSecurityEvent(
      user.id,
      'UPDATE_PERMISSION_UI_MODE',
      'MEDIUM',
      req,
      { permissionId: id, uiMode: mode },
      user.actorType || 'system_user',
      0
    );

    return { success: true, message: `Modo de restriccion de permiso actualizado a ${mode}` };
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

  async getInfoRequestPreview(user, id, { missingFields }) {
    const request = await adminRepository.findRequestById(id);
    if (!request) throw new NotFoundError('Solicitud no encontrada.');
    if (request.estado !== 'pendiente' && request.estado !== 'espera_informacion') {
      throw new BusinessError('La solicitud no se encuentra en estado pendiente.');
    }

    const fieldLabels = {
      razon_social: 'Razón Social / Nombre Comercial',
      nit: 'NIT o Documento de Identificación',
      nit_dv: 'Dígito de Verificación (DV)',
      email_contacto: 'Correo Electrónico Corporativo',
      nombres_contacto: 'Nombres del Representante Legal',
      apellidos_contacto: 'Apellidos del Representante Legal',
      celular_contacto: 'Celular del Representante',
      telefono: 'Teléfono del Comercio',
      ciudad: 'Ciudad',
      direccion: 'Dirección Principal',
      descripcion: 'Descripción / Actividad Comercial',
      logo: 'Logo del Comercio (Foto/Imagen)',
      camara: 'Cámara de Comercio (Documento PDF)',
      rut: 'Registro Único Tributario (RUT - PDF)',
      cedula: 'Cédula del Representante Legal (Frente y Reverso)'
    };

    const missingListHtml = missingFields
      .map(field => `<li style="margin-bottom: 6px;"><strong>${fieldLabels[field] || field}</strong>: Requiere corrección o carga de soporte válido.</li>`)
      .join('');

    const token = jwt.sign(
      { requestId: request.id, missingFields },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://trendy.sytes.net';
    const enlaceFormulario = `${frontendUrl}/registro-solicitud?token=${token}`;

    let subject = 'Se requiere informacion adicional para tu solicitud de afiliacion - Bienestar Digital';
    let htmlBody = '';

    try {
      const template = await adminRepository.getEmailTemplateByName('request_more_info');
      if (template) {
        subject = template.subject;
        htmlBody = template.html_body
          .replace(/\{\{razon_social\}\}/g, request.razon_social)
          .replace(/\{\{missing_details_list\}\}/g, missingListHtml)
          .replace(/\{\{enlace_formulario\}\}/g, enlaceFormulario)
          .replace(/\{\{year\}\}/g, new Date().getFullYear());
      }
    } catch (err) {
      htmlBody = `<p>Estimado representante de ${request.razon_social},</p><p>Requerimos corregir los siguientes campos: ${missingFields.join(', ')}</p><a href="${enlaceFormulario}">Corregir formulario</a>`;
    }

    return { subject, html_body: htmlBody };
  }

  async sendInfoRequest(user, id, { missingFields, notas_system }, req) {
    const request = await adminRepository.findRequestById(id);
    if (!request) throw new NotFoundError('Solicitud no encontrada.');
    if (request.estado !== 'pendiente' && request.estado !== 'espera_informacion') {
      throw new BusinessError('La solicitud no se encuentra en estado pendiente o en espera de informacion.');
    }

    const preview = await this.getInfoRequestPreview(user, id, { missingFields });

    try {
      await emailService.sendMail({
        to: request.email_contacto,
        subject: preview.subject,
        html: preview.html_body,
        text: `Estimado representante de ${request.razon_social},\n\nRequerimos que corrijas algunos datos en tu solicitud de registro.\n\nPor favor ingresa al enlace para corregirlos:\n${process.env.FRONTEND_URL || 'https://trendy.sytes.net'}/registro-solicitud`
      });
    } catch (err) {
      console.error('[EMAIL ERROR] Failed to send info request email:', err.message);
      try {
        await logSecurityEvent(
          user.id,
          'EMAIL_DELIVERY_FAILURE',
          'HIGH',
          req,
          { error: err.message, recipient: request.email_contacto, emailType: 'request_more_info' },
          'request',
          parseInt(id)
        );
      } catch (logErr) {
        console.error('Failed to log email delivery failure event:', logErr.message);
      }
      throw err;
    }

    const notesText = notas_system
      ? `${notas_system}\n(Campos pendientes: ${missingFields.join(', ')})`
      : `Solicitud de correcciones enviada. Campos pendientes: ${missingFields.join(', ')}`;

    await adminRepository.updateRequestStatus(id, 'espera_informacion', notesText);

    await logSecurityEvent(
      user.id,
      'REQUEST_MORE_INFORMATION',
      'MEDIUM',
      req,
      { requestId: id, missingFields, email: request.email_contacto, notas_system: notas_system || '' },
      'request',
      parseInt(id)
    );

    return { success: true, message: 'Solicitud de corrección enviada con éxito.' };
  }

  async updateRequestVerifiedFields(user, id, { fields, documents }, req) {
    const request = await adminRepository.findRequestById(id);
    if (!request) throw new NotFoundError('Solicitud no encontrada.');

    const verifiedFields = { fields, documents };
    await adminRepository.updateRequestVerifiedFields(id, verifiedFields);

    await logSecurityEvent(
      user.id,
      'UPDATE_REQUEST_VERIFICATION_PROGRESS',
      'LOW',
      req,
      { requestId: id },
      'request',
      parseInt(id)
    );

    return { success: true, message: 'Progreso de verificación guardado con éxito.' };
  }
  async getRequestHistory(user, id, req) {
    const request = await adminRepository.findRequestById(id);
    if (!request) throw new NotFoundError('Solicitud no encontrada.');

    const logs = await adminRepository.findSecurityLogs({
      resourceType: 'request',
      resourceId: id
    }, 100, 0);

    await logSecurityEvent(
      user.id,
      'VIEW_REQUEST_HISTORY',
      'LOW',
      req,
      { requestId: id },
      'request',
      parseInt(id)
    );

    // Filtrar para retornar exclusivamente hitos del proceso/ciclo de vida de la solicitud,
    // excluyendo logs internos de auditoría del operador (como visualizaciones de historial).
    const requestProcessEvents = [
      'SUBMIT_REGISTRATION_REQUEST',
      'REQUEST_MORE_INFORMATION',
      'SUBMIT_CORRECTIONS',
      'APPROVE_REGISTRATION_REQUEST',
      'REJECT_REGISTRATION_REQUEST',
      'EMAIL_DELIVERY_FAILURE'
    ];

    return logs.filter(log => requestProcessEvents.includes(log.event_type));
  }

  async getSystemParameters() {
    const conn = await db.getConnection();
    try {
      const domiEngine = require('../../services/domiEngine');
      const domiTreasuryEngine = require('../../services/domiTreasuryEngine');

      const rules = await domiEngine.getProtocolRules(conn);
      const token = await domiEngine.getTokenRegistry(conn);
      const treasury = await domiTreasuryEngine.getTreasuryStatus(conn);

      const [sysParams] = await conn.query('SELECT `key`, `value` FROM system_parameters');
      sysParams.forEach(p => {
        rules[p.key] = Number(p.value);
      });

      const [metaRows] = await conn.query('SELECT param_key, label, description, actor, initiator, flow_trigger, applicable_states, payment_methods, formula_hint, impact_note FROM protocol_rules_metadata');
      const metadata = {};
      metaRows.forEach(row => {
        metadata[row.param_key] = {
          label: row.label,
          description: row.description,
          actor: row.actor,
          initiator: row.initiator,
          flow_trigger: row.flow_trigger,
          applicable_states: row.applicable_states,
          payment_methods: row.payment_methods,
          formula_hint: row.formula_hint,
          impact_note: row.impact_note
        };
      });

      return {
        rules,
        token,
        treasury,
        metadata
      };
    } finally {
      conn.release();
    }
  }

  async updateSystemParameters(user, data, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Actualizar system_parameters si vienen en el body
      const systemParamKeys = [
        'free_tier_stores_limit',
        'free_tier_categories_limit',
        'free_tier_products_limit',
        'influencer_reels_limit'
      ];

      for (const key of systemParamKeys) {
        if (data[key] !== undefined) {
          await conn.query(
            'UPDATE system_parameters SET `value` = ? WHERE `key` = ?',
            [String(data[key]), key]
          );
          try {
            const cacheKey = `system_param:${key}`;
            const { getRedisClient } = require('../../config/redis');
            const redisClient = getRedisClient();
            if (redisClient) {
              await redisClient.del(cacheKey);
            }
          } catch (_) {}
        }
      }

      const domiEngine = require('../../services/domiEngine');
      const currentRules = await domiEngine.getProtocolRules(conn);

      const updatableFields = [
        'store_fixed_fee_cop',
        'driver_fixed_fee_cop',
        'cashback_rate_customer',
        'max_balance_cop',
        'min_domi_balance_driver',
        'free_withdrawals_per_month',
        'withdrawal_fee_cop',
        'score_min_for_cashback',
        'score_cashback_win_base',
        'max_monthly_yield_pct',
        'min_collateral_ratio_post_adjust',
        'store_subscription_fee_domi',
        'commerce_subscription_fee_domi',
        'wompi_commission_percent',
        'wompi_commission_fixed_cop',
        'wompi_commission_iva_percent',
        'wompi_min_purchase_cop',
        'score_earned_on_purchase',
        'score_earned_on_domi_purchase',
        'score_penalty_domi_cancel_accepted',
        'score_penalty_domi_cancel_in_transit',
        'score_penalty_domi_cancel_dispatch',
        'score_penalty_cash_cancel_accepted',
        'score_penalty_cash_cancel_in_transit',
        'score_penalty_cash_cancel_dispatch',
        'driver_cancellation_compensation_rate',
        'driver_cancel_pre_pickup_refund_rate',
        'driver_cancel_post_pickup_penalty_rate',
        'customer_cancel_store_refund_prep_rate',
        'customer_cancel_client_refund_prep_rate',
        'customer_cancel_sys_retain_prep_rate',
        'customer_cancel_driver_commission_refund_transit_rate',
        'customer_cancel_store_commission_refund_dispatch_rate',
        'customer_cancel_driver_commission_refund_dispatch_rate',
        'customer_cancel_driver_delivery_pct_dispatch',
        'platform_processing_fee_rate',
        'delivery_base_fare_cop',
        'delivery_base_distance_km',
        'delivery_extra_rate_cop_per_km',
        'delivery_max_distance_km',
        'retention_penalty_rate',
        'refund_standard_rate',
        'rescue_cashback_rate',
        'driver_rescue_commission_refund_rate',
        'driver_rescue_timeout_minutes',
        'driver_rescue_max_attempts',
        'driver_penalty_points_rescue_original',
        'driver_rescue_chain_penalty_points',
        'minimum_delivery_rate',
        'store_solvency_delivery_multiplier',
        'solvency_commission_guarantee_fraction',
        'store_cancel_client_indemnity_domi_amount',
        'store_penalty_points_prep',
        'store_penalty_points_dispatch',
        'driver_penalty_points_prep',
        'driver_penalty_points_dispatch',
        'driver_penalty_points_transit',
        'store_cancel_driver_delivery_pct_rate',
        'store_cancel_client_indemnity_rate',
        'customer_cancel_driver_delivery_pct_dispatch_rate',
        'driver_commission_refund_on_store_cancel_rate'
      ];

      const updates = {};
      const queryParts = [];
      const values = [];

      for (const field of updatableFields) {
        if (data[field] !== undefined) {
          updates[field] = data[field];
          queryParts.push(`\`${field}\` = ?`);
          values.push(data[field]);
        }
      }

      if (queryParts.length === 0) {
        throw new BusinessError('No se especificaron parametros validos para actualizar.');
      }

      // Bypass trigger de seguridad para poder actualizar protocol_rules
      await conn.query('SET @domi_bypass_security = 1');

      values.push(1); // Para el WHERE id = 1
      await conn.query(
        `UPDATE protocol_rules SET ${queryParts.join(', ')} WHERE id = ?`,
        values
      );

      await conn.commit();

      // Registrar auditoria
      await logSecurityEvent(
        user.id,
        'UPDATE_PROTOCOL_PARAMETERS',
        'HIGH',
        req,
        { updates, previous: currentRules },
        'system',
        1
      );

      return { success: true, message: 'Parametros del protocolo actualizados con exito.', updates };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getSystemNavigation(user, req) {
    const items = await adminRepository.getSystemNavigationItems();
    await logSecurityEvent(
      user.id,
      'VIEW_SYSTEM_NAVIGATION',
      'LOW',
      req,
      {},
      'system',
      null
    );
    return items;
  }

  async reorderSystemNavigation(user, items, req) {
    if (!Array.isArray(items)) {
      throw new BusinessError('Debe proveer una lista de items de navegacion.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await adminRepository.bulkUpdateNavigationOrders(items, conn);

      await conn.commit();

      await logSecurityEvent(
        user.id,
        'REORDER_SYSTEM_NAVIGATION',
        'HIGH',
        req,
        { items_count: items.length },
        'system',
        null
      );

      return { success: true, message: 'Orden de navegacion actualizado con exito.' };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async updateSystemNavigationItem(user, id, data, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Buscar si existe el item
      const [rows] = await conn.query('SELECT * FROM system_navigation WHERE id = ?', [id]);
      const current = rows[0];
      if (!current) {
        throw new NotFoundError('Item de navegacion no encontrado.');
      }

      // Si es de sistema y se intentan cambiar restricciones criticas
      if (current.is_system === 1) {
        // Bloquear cambio de layout_scope o de is_system para evitar corrupcion de seguridad
        if (data.layout_scope && data.layout_scope !== current.layout_scope) {
          throw new BusinessError('No se permite alterar el layout_scope de un menu de sistema.');
        }
      }

      await adminRepository.updateSystemNavigationItem(id, data, conn);

      await conn.commit();

      await logSecurityEvent(
        user.id,
        'UPDATE_SYSTEM_NAVIGATION_ITEM',
        'HIGH',
        req,
        { id, updates: data, previous: current },
        'system',
        id
      );

      return { success: true, message: 'Item de navegacion actualizado con exito.' };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

module.exports = new AdminService();
