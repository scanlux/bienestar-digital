const db = require('../../config/db');

class DeliveryCompanyRepository {
  async findDriversByCompanyId(deliveryCompanyId) {
    const [rows] = await db.query(`
      SELECT u.id, p.nombres, p.apellidos, p.cedula, p.telefono, u.repartidor_activo
      FROM users u
      JOIN profiles p ON p.usuario_id = u.id
      WHERE p.delivery_company_id = ? AND u.es_repartidor = 1
    `, [deliveryCompanyId]);
    return rows;
  }

  async findDriverByCedula(cedula) {
    const [rows] = await db.query(`
      SELECT u.id, u.es_repartidor, p.delivery_company_id, p.nombres, p.apellidos
      FROM users u
      JOIN profiles p ON p.usuario_id = u.id
      WHERE p.cedula = ?
    `, [cedula]);
    return rows[0] || null;
  }

  async updateDriverCompany(userId, deliveryCompanyId) {
    await db.query(
      'UPDATE profiles SET delivery_company_id = ? WHERE usuario_id = ?',
      [deliveryCompanyId, userId]
    );
  }

  async findDriverProfile(userId) {
    const [rows] = await db.query(
      'SELECT delivery_company_id FROM profiles WHERE usuario_id = ?',
      [userId]
    );
    return rows[0] || null;
  }
}

module.exports = new DeliveryCompanyRepository();
