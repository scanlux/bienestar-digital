require('dotenv').config();
const mysql = require('mysql2/promise');

async function createSecurityLogsTable() {
  console.log('🚀 Iniciando creación de tabla security_audit_logs...');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '100.127.144.125',
      user: 'root',
      password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
      database: process.env.DB_NAME || 'marketplace_db'
    });

    console.log('✅ Conexión establecida como root. Creando tabla...');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          event_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          ip_address VARCHAR(45) NULL,
          user_agent VARCHAR(255) NULL,
          details JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(6),
          CONSTRAINT fk_security_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log('  - Tabla "security_audit_logs" creada o verificada.');

    console.log('  - Otorgando permisos a bienestar_deployer y bienestar_admin_prod...');
    await conn.query("GRANT SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE, DROP ON marketplace_db.security_audit_logs TO 'bienestar_deployer'@'%'");
    await conn.query("GRANT SELECT, INSERT ON marketplace_db.security_audit_logs TO 'bienestar_admin_prod'@'%'");
    await conn.query('FLUSH PRIVILEGES');
    console.log('  - Permisos otorgados con éxito.');

    console.log('✅ Proceso completado.');
  } catch (error) {
    console.error('❌ Error creando tabla:', error.message);
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

createSecurityLogsTable();
