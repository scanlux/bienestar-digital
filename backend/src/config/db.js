const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Monkeypatch getConnection to make connection.rollback() safe against closed sockets
const originalGetConnection = pool.getConnection;
pool.getConnection = async function(...args) {
  const conn = await originalGetConnection.apply(this, args);
  const originalRollback = conn.rollback;
  conn.rollback = async function(...rArgs) {
    try {
      return await originalRollback.apply(this, rArgs);
    } catch (err) {
      console.warn('[DB WARNING] Rollback failed (connection likely closed):', err.message);
    }
  };
  return conn;
};

module.exports = pool;
