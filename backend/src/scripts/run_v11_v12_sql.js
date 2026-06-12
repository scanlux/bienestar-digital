require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('=== EJECUTANDO DDL DE SEGURIDAD (V11 Y V12) ===');

  const v11Path = path.join(__dirname, 'v11_rbac_role_triggers.sql');
  const v12Path = path.join(__dirname, 'v12_audit_logs_upgrade.sql');

  if (!fs.existsSync(v11Path) || !fs.existsSync(v12Path)) {
    console.error('ERROR: No se encuentran los archivos SQL necesarios en la carpeta de scripts.');
    process.exit(1);
  }

  const v11Sql = fs.readFileSync(v11Path, 'utf8');
  const v12Sql = fs.readFileSync(v12Path, 'utf8');

  console.log(`Conectando como root a: ${process.env.DB_HOST || '100.127.144.125'}`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db',
    multipleStatements: true
  });

  try {
    // 1. Ejecutar v11 (Triggers de Roles)
    console.log('\n--- 1. Aplicando v11_rbac_role_triggers.sql ---');
    
    // Separamos sentencias de triggers usando '//' como delimitador
    const v11Statements = v11Sql
      .split('//')
      .map(s => s.trim())
      .filter(s => {
        if (!s) return false;
        // Excluir comandos DELIMITER
        if (s.toUpperCase().includes('DELIMITER')) return false;
        return true;
      });

    console.log(`Se detectaron ${v11Statements.length} sentencias en v11.`);

    for (let i = 0; i < v11Statements.length; i++) {
      const stmt = v11Statements[i];
      console.log(`Ejecutando sentencia v11 [${i + 1}/${v11Statements.length}]...`);
      try {
        await connection.query(stmt);
      } catch (err) {
        console.error(`Error en sentencia v11:\n${stmt}\n`);
        throw err;
      }
    }
    console.log('Triggers v11 creados exitosamente.');

    // 2. Ejecutar v12 (Upgrade Logs)
    console.log('\n--- 2. Aplicando v12_audit_logs_upgrade.sql ---');

    // Separamos sentencias de actualizacion de tabla usando ';'
    const v12Statements = v12Sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Se detectaron ${v12Statements.length} sentencias en v12.`);

    for (let i = 0; i < v12Statements.length; i++) {
      const stmt = v12Statements[i];
      console.log(`Ejecutando sentencia v12 [${i + 1}/${v12Statements.length}]...`);
      try {
        await connection.query(stmt);
      } catch (err) {
        if (stmt.toUpperCase().includes('GRANT')) {
          console.warn(`[WARN] Ignorando error en GRANT local: ${err.message}`);
        } else if (stmt.toUpperCase().includes('FLUSH PRIVILEGES')) {
          console.warn(`[WARN] Ignorando error en FLUSH PRIVILEGES local: ${err.message}`);
        } else if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.message.includes('Duplicate column')) {
          console.warn(`[WARN] Column/Key already exists, skipping: ${err.message}`);
        } else {
          console.error(`Error en sentencia v12:\n${stmt}\n`);
          throw err;
        }
      }
    }
    console.log('Actualizaciones v12 aplicadas exitosamente.');

    // 3. Verificacion final
    console.log('\n--- 3. Verificando resultados en DB ---');
    
    const [triggers] = await connection.execute(
      "SHOW TRIGGERS WHERE `Table` IN ('roles', 'role_permissions', 'user_roles')"
    );
    console.log(`Triggers de roles verificados: ${triggers.length} de 9.`);

    const [columns] = await connection.execute("SHOW COLUMNS FROM security_audit_logs");
    const columnNames = columns.map(c => c.Field);
    console.log('Columnas de security_audit_logs:', columnNames);

    await connection.end();
    console.log('=== DDL DE SEGURIDAD V11 Y V12 COMPLETADO CON EXITO ===');
  } catch (error) {
    console.error('ERROR CRITICO DURANTE LA EJECUCION DE LOS DDL:', error);
    try {
      await connection.end();
    } catch (_) {}
    process.exit(1);
  }
}

run();
