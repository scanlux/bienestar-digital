const db = require('../../config/db');

class CommerceRepository {
  async findAll(status) {
    let query = 'SELECT * FROM commerces';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY orden ASC';
    const [commerces] = await db.query(query, params);
    return commerces;
  }

  async findById(id) {
    const [commerces] = await db.query('SELECT * FROM commerces WHERE id = ?', [id]);
    return commerces[0] || null;
  }

  async findByUserId(userId, excludeId = null) {
    let query = 'SELECT id FROM commerces WHERE usuario_id = ?';
    const params = [userId];
    
    if (excludeId) {
      query += ' AND id <> ?';
      params.push(excludeId);
    }
    
    const [existing] = await db.query(query, params);
    return existing[0] || null;
  }

  async findByNit(nit, excludeId = null) {
    let query = 'SELECT id FROM commerces WHERE nit = ?';
    const params = [nit];
    
    if (excludeId) {
      query += ' AND id <> ?';
      params.push(excludeId);
    }
    
    const [existing] = await db.query(query, params);
    return existing[0] || null;
  }

  async create(data) {
    const {
      nombre, nit, nit_dv, telefono, ciudad, direccion,
      descripcion, logo_url, type, orden, usuario_id,
      admin_nombres, admin_apellidos
    } = data;
    
    const [result] = await db.query(
      `INSERT INTO commerces 
       (nombre, nit, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, type, orden, usuario_id, admin_nombres, admin_apellidos) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, nit, nit_dv || null, telefono, ciudad, direccion,
        descripcion, logo_url, type || 'horizontal', orden || 0,
        usuario_id || null, admin_nombres || null, admin_apellidos || null
      ]
    );
    
    return result.insertId;
  }

  async update(id, data) {
    const {
      nombre, nit, nit_dv, telefono, ciudad, direccion,
      descripcion, logo_url, type, orden, usuario_id,
      admin_nombres, admin_apellidos
    } = data;
    
    await db.query(
      `UPDATE commerces 
       SET nombre=?, nit=?, nit_dv=?, telefono=?, ciudad=?, direccion=?, descripcion=?, logo_url=?, type=?, orden=?, usuario_id=?, admin_nombres=?, admin_apellidos=? 
       WHERE id=?`,
      [
        nombre, nit, nit_dv || null, telefono, ciudad, direccion,
        descripcion, logo_url, type, orden, usuario_id || null,
        admin_nombres || null, admin_apellidos || null, id
      ]
    );
    
    return true;
  }

  async updateStatus(id, status) {
    await db.query('UPDATE commerces SET status = ? WHERE id = ?', [status, id]);
    return true;
  }
}

module.exports = new CommerceRepository();
