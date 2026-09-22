const db = require('../../../config/db');
const { BusinessError, NotFoundError } = require('../../../utils/errors');

class AddressService {
  async getAddresses(userId) {
    const [rows] = await db.query(
      'SELECT id, label, direccion, latitud, longitud, is_default, created_at, updated_at FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return rows;
  }

  async createAddress(userId, data) {
    const { label = 'Casa', direccion, latitud, longitud, is_default = false } = data;
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Verificar si es la primera dirección del usuario
      const [countRows] = await conn.query(
        'SELECT COUNT(*) as count FROM user_addresses WHERE user_id = ?',
        [userId]
      );
      const isFirst = countRows[0].count === 0;

      // Si es la primera dirección o se solicita como predeterminada
      const shouldBeDefault = isFirst || is_default === true || is_default === 1 || is_default === 'true';

      if (shouldBeDefault) {
        // Desactivar cualquier otra dirección predeterminada
        await conn.query(
          'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
          [userId]
        );
      }

      const [result] = await conn.query(
        'INSERT INTO user_addresses (user_id, label, direccion, latitud, longitud, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, label, direccion, latitud, longitud, shouldBeDefault ? 1 : 0]
      );

      await conn.commit();
      return { id: result.insertId, label, direccion, latitud, longitud, is_default: shouldBeDefault ? 1 : 0 };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async updateAddress(userId, addressId, data) {
    const { label, direccion, latitud, longitud } = data;
    const [check] = await db.query(
      'SELECT id FROM user_addresses WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    if (check.length === 0) {
      throw new NotFoundError('Dirección no encontrada');
    }

    const updates = [];
    const params = [];

    if (label !== undefined) {
      updates.push('label = ?');
      params.push(label);
    }
    if (direccion !== undefined) {
      updates.push('direccion = ?');
      params.push(direccion);
    }
    if (latitud !== undefined) {
      updates.push('latitud = ?');
      params.push(latitud);
    }
    if (longitud !== undefined) {
      updates.push('longitud = ?');
      params.push(longitud);
    }

    if (updates.length === 0) {
      throw new BusinessError('No se especificaron campos para actualizar');
    }

    params.push(addressId, userId);
    await db.query(
      `UPDATE user_addresses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const [updated] = await db.query(
      'SELECT id, label, direccion, latitud, longitud, is_default FROM user_addresses WHERE id = ?',
      [addressId]
    );
    return updated[0];
  }

  async setDefaultAddress(userId, addressId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Verificar existencia de la dirección para este usuario
      const [check] = await conn.query(
        'SELECT id FROM user_addresses WHERE id = ? AND user_id = ?',
        [addressId, userId]
      );

      if (check.length === 0) {
        throw new NotFoundError('Dirección no encontrada');
      }

      // 1. Quitar predeterminado a todas
      await conn.query(
        'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
        [userId]
      );

      // 2. Asignar predeterminado a la elegida
      await conn.query(
        'UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?',
        [addressId, userId]
      );

      await conn.commit();
      return { success: true, message: 'Dirección predeterminada actualizada correctamente' };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async deleteAddress(userId, addressId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Obtener la dirección para verificar si es la predeterminada
      const [check] = await conn.query(
        'SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ?',
        [addressId, userId]
      );

      if (check.length === 0) {
        throw new NotFoundError('Dirección no encontrada');
      }

      const wasDefault = check[0].is_default === 1;

      // 2. Eliminar la dirección
      await conn.query(
        'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
        [addressId, userId]
      );

      // 3. Si era la predeterminada, seleccionar otra como predeterminada (si existe)
      if (wasDefault) {
        const [remaining] = await conn.query(
          'SELECT id FROM user_addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
          [userId]
        );
        if (remaining.length > 0) {
          await conn.query(
            'UPDATE user_addresses SET is_default = 1 WHERE id = ?',
            [remaining[0].id]
          );
        }
      }

      await conn.commit();
      return { success: true, message: 'Dirección eliminada correctamente' };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

module.exports = new AddressService();
