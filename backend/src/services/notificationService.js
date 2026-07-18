const db = require('../config/db');

class NotificationService {
  async createSystemNotification({ userId, type, title, message, actionUrl = null }, connection = db) {
    const query = `
      INSERT INTO system_notifications (user_id, type, title, message, action_url)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await connection.query(query, [userId, type, title, message, actionUrl]);
    return result.insertId;
  }

  async getUnreadForUser(userId) {
    const query = `
      SELECT id, type, title, message, action_url, is_read, created_at
      FROM system_notifications
      WHERE user_id = ? AND is_read = 0
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(query, [userId]);
    return rows;
  }

  async markAsRead(notificationId, userId) {
    const query = `
      UPDATE system_notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await db.query(query, [notificationId, userId]);
    return result.affectedRows > 0;
  }

  async markAllAsRead(userId) {
    const query = `
      UPDATE system_notifications
      SET is_read = 1
      WHERE user_id = ? AND is_read = 0
    `;
    const [result] = await db.query(query, [userId]);
    return result.affectedRows > 0;
  }
}

module.exports = new NotificationService();
