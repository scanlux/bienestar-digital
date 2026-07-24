const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../../config/db');
const adminRepository = require('../admin.repository');
const emailService = require('../../../services/emailService');
const { BusinessError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const appLogger = require('../../../utils/appLogger');
const assertRequestEditable = require('../helpers/assertRequestEditable');

class AdminRegistrationService {
  constructor(adminService) {
    this.adminService = adminService;
  }

  async getRegistrationRequests(status) {
    return await adminRepository.findRegistrationRequests(status);
  }

  async rejectRegistrationRequest(user, id, notes_system, req) {
    const request = await adminRepository.findRequestById(id);
    assertRequestEditable(request);

    await adminRepository.updateRequestStatus(id, 'rechazado', notes_system);

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
      assertRequestEditable(request);

      const emailExists = await adminRepository.checkUserExistsByEmail(request.email_contacto, connection);
      if (emailExists) {
        throw new BusinessError('El correo electronico del contacto ya se encuentra registrado.');
      }

      const plainPassword = crypto.randomBytes(6).toString('hex');
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
                  <a href="${process.env.FRONTEND_URL || 'https://trendy.sytes.net'}/auth/login" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Iniciar Sesión</a>
                </div>
                
                <p style="font-size: 14px; line-height: 22px; color: #64748b; text-align: center;">Por tu seguridad, te recomendamos cambiar la contraseña temporal tan pronto ingreses por primera vez al panel de control.</p>
              </div>
              <div style="background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Bienestar Digital S.A.S. Todos los derechos reservados.
              </div>
            </div>
          </div>
        `,
        text: `¡Felicidades! Tu solicitud de afiliación para ${request.razon_social} ha sido aprobada.\n\nUsuario: ${request.email_contacto}\nClave Temporal: ${plainPassword}\n\nInicia sesión aquí: ${process.env.FRONTEND_URL || 'https://trendy.sytes.net'}/auth/login\n\nAtentamente,\nEquipo de Bienestar Digital`
      }).catch(async (err) => {
        console.error('[EMAIL ERROR] Failed to send approval email:', err.message);
        try {
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

    let emailSubject = 'Invitacion Especial de Afiliacion - Bienestar Digital';
    let emailHtml;
    try {
      const template = await adminRepository.getEmailTemplateByName('invitation');
      if (template) {
        const registroUrl = `${process.env.FRONTEND_URL || 'https://trendy.sytes.net'}/registro-solicitud`;
        emailSubject = template.subject;
        emailHtml = emailService.renderTemplate(template.html_body, {
          razon_social,
          registro_url: registroUrl,
          year: String(new Date().getFullYear())
        });
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

    await db.query(
      'INSERT INTO invitations (sent_by_user_id, recipient_email, status, details_json) VALUES (?, ?, "pending", ?)',
      [user.id, email, JSON.stringify({ razon_social })]
    );

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
    const [rows] = await db.query(`
      SELECT i.id, i.recipient_email AS email, i.status, i.sent_at AS created_at, i.details_json,
             p.nombres, p.apellidos
      FROM invitations i
      LEFT JOIN profiles p ON p.usuario_id = i.sent_by_user_id
      ORDER BY i.id DESC
      LIMIT 100
    `);
    return rows.map(row => {
      let razon_social = '';
      try {
        const details = typeof row.details_json === 'string' ? JSON.parse(row.details_json) : row.details_json;
        razon_social = details?.razon_social || '';
      } catch (err) {
        // Ignorar
      }
      return {
        id: row.id,
        email: row.email,
        razon_social,
        status: row.status,
        created_at: row.created_at,
        sender_name: `${row.nombres || ''} ${row.apellidos || ''}`.trim() || 'Admin'
      };
    });
  }

  async getInfoRequestPreview(user, id, { missingFields }, req = null) {
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

    await logSecurityEvent(user.id, 'REGISTRATION_JWT_ISSUED', 'MEDIUM', req, {
      requestId: id,
      missingFields
    }, 'request', parseInt(id));

    const frontendUrl = process.env.FRONTEND_URL || 'https://trendy.sytes.net';
    const enlaceFormulario = `${frontendUrl}/registro-solicitud?token=${token}`;

    let subject = 'Se requiere informacion adicional para tu solicitud de afiliacion - Bienestar Digital';
    let htmlBody = '';

    try {
      const template = await adminRepository.getEmailTemplateByName('request_more_info');
      if (template) {
        subject = template.subject;
        htmlBody = emailService.renderTemplate(template.html_body, {
          razon_social: request.razon_social,
          missing_details_list: missingListHtml,
          enlace_formulario: enlaceFormulario,
          year: String(new Date().getFullYear())
        });
      }
    } catch (err) {
      htmlBody = `<p>Estimado representante de ${request.razon_social},</p><p>Requerimos corregir los siguientes campos: ${missingFields.join(', ')}</p><a href="${enlaceFormulario}">Corregir formulario</a>`;
    }

    return { subject, html_body: htmlBody };
  }

  async sendInfoRequest(user, id, { missingFields, notas_system }, req) {
    const request = await adminRepository.findRequestById(id);
    assertRequestEditable(request);

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
    assertRequestEditable(request);

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
}

module.exports = AdminRegistrationService;
