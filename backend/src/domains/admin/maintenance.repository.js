const db = require('../../config/db');

class MaintenanceRepository {
  async findAllRules() {
    const [rows] = await db.query(
      'SELECT id, pattern, type, description, is_system, created_at FROM maintenance_bypass_rules ORDER BY type ASC, pattern ASC'
    );
    return rows;
  }

  async createRule(pattern, type, description) {
    const [result] = await db.query(
      'INSERT INTO maintenance_bypass_rules (pattern, type, description) VALUES (?, ?, ?)',
      [pattern, type, description]
    );
    return result.insertId;
  }

  async deleteRule(id) {
    const [result] = await db.query(
      'DELETE FROM maintenance_bypass_rules WHERE id = ? AND is_system = 0',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new MaintenanceRepository();
