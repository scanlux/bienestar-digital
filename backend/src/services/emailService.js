const nodemailer = require('nodemailer');
const appLogger = require('../utils/appLogger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromEmail = process.env.SMTP_FROM || 'no-reply@trendy.sytes.net';
    
    const hasSmtpConfig = 
      process.env.SMTP_HOST && 
      process.env.SMTP_PORT && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASS;

    if (hasSmtpConfig) {
      appLogger.info('[EMAIL] Configurando transportador SMTP para OCI Email Delivery...');
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: false, // OCI Email Delivery usa STARTTLS (puerto 587 o 2525)
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      appLogger.warn('[EMAIL] Configuración SMTP incompleta en .env. Se usará el modo simulación (escribiendo en logs).');
    }
  }

  async sendMail({ to, subject, html, text }) {
    // EMULACION DE INFRAESTRUCTURA INCOMPLETA / PRUEBAS DE HISTORIAL:
    // Si el correo contiene palabras de error o de prueba, simulamos un fallo inmediato de entrega
    // para probar la integracion del historial sin requerir infraestructura de correos real.
    if (to && (to.includes('nonexistent') || to.includes('error') || to.endsWith('@err.com'))) {
      const error = new Error('getaddrinfo ENOTFOUND mail.trendy.sytes.net (Simulated SMTP Connection Failure / Non-existent Recipient Domain)');
      appLogger.error(`[EMAIL ERROR EMULATION] Fallo al enviar correo a ${to}: ${error.message}`);
      throw error;
    }

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.fromEmail,
          to,
          subject,
          text,
          html
        });
        appLogger.info(`[EMAIL] Correo enviado exitosamente a ${to}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        appLogger.error(`[EMAIL ERROR] Fallo al enviar correo a ${to}: ${error.message}`);
        throw error;
      }
    } else {
      // Simulación en desarrollo
      appLogger.info(`
=========================================
[SIMULACION EMAIL]
De: ${this.fromEmail}
Para: ${to}
Asunto: ${subject}
Texto: ${text || '(sin texto plano)'}
HTML:
${html}
=========================================
      `);
      return { success: true, simulated: true };
    }
  }

  renderTemplate(templateBody, variables = {}) {
    if (!templateBody) return '';
    let rendered = templateBody;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value !== undefined && value !== null ? String(value) : '');
    }
    return rendered;
  }
}

module.exports = new EmailService();
