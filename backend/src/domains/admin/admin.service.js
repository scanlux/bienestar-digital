const db = require('../../config/db');
const adminRepository = require('./admin.repository');
const { BusinessError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const bcrypt = require('bcryptjs');

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

      const defaultPasswordHash = await bcrypt.hash('admin123', 10);
      const newUserId = await adminRepository.createUser(request.email_contacto, defaultPasswordHash, connection);

      await adminRepository.createProfile(newUserId, request, connection);

      if (request.tipo_solicitud === 'commerce') {
        await adminRepository.createCommerce(newUserId, request.razon_social, request.nit, request.email_contacto, connection);
      } else if (request.tipo_solicitud === 'delivery_company') {
        await adminRepository.createDeliveryCompany(newUserId, request.nit, request.razon_social, connection);
      }

      await adminRepository.updateRequestStatus(id, 'aprobado', notes_system, connection);

      await connection.commit();

      await logSecurityEvent(
        user.id,
        'APPROVE_REGISTRATION_REQUEST',
        'HIGH',
        req,
        { requestId: id, tipo: request.tipo_solicitud, razon_social: request.razon_social },
        'request',
        parseInt(id)
      );

      return { success: true, message: 'Solicitud aprobada y negocio creado exitosamente.' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getSecurityLogs(filters, limit = 50, offset = 0) {
    const logs = await adminRepository.findSecurityLogs(filters, Number(limit), Number(offset));
    const total = await adminRepository.countSecurityLogs(filters);
    return { logs, total };
  }

  async getGlobalStats() {
    return await adminRepository.findGlobalStats();
  }
}

module.exports = new AdminService();
