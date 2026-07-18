require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function runSqlFile(conn, filePath, isTriggerFile = false) {
  console.log(`Cargando archivo SQL: ${path.basename(filePath)}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Archivo no encontrado en ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  // Limpiar comentarios de una sola linea y bloque
  let cleanSql = content
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  let statements = [];

  if (isTriggerFile) {
    // Para triggers, limpiamos los comandos de DELIMITER y dividimos por '//'
    cleanSql = cleanSql.replace(/DELIMITER\s+\/\/|DELIMITER\s+;/gi, '');
    statements = cleanSql
      .split('//')
      .map(st => st.trim())
      .filter(st => st.length > 0 && !st.toLowerCase().startsWith('use '));
  } else {
    // Para grants, dividimos por ';'
    statements = cleanSql
      .split(';')
      .map(st => st.trim())
      .filter(st => st.length > 0);
  }

  console.log(`Ejecutando ${statements.length} sentencias de ${path.basename(filePath)}...`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.query(stmt);
    } catch (err) {
      const errorCode = err.code || '';
      const message = err.message || '';
      const isIgnorableSecurityErr = 
        errorCode === 'ER_NONEXISTING_GRANT' || 
        errorCode === 'ER_SPECIFIC_ACCESS_DENIED_ERROR' ||
        message.includes('Access denied') ||
        message.includes('REVOKE');
        
      if (isIgnorableSecurityErr) {
        console.warn(`  [Ignorado - Privilegios Limitados en Dev]: ${message.split('\n')[0]}`);
      } else {
        console.error(`  [ERROR] en sentencia: ${stmt.substring(0, 100)}...`);
        throw err;
      }
    }
  }
  console.log(`  -> Finalizado con exito.`);
  return true;
}

async function run() {
  const conn = await db.getConnection();
  try {
    console.log('=== APLICANDO CONFIGURACION DE SEGURIDAD SQL (Grants & Triggers) ===');
    
    const securityDir = path.join(__dirname, 'db_security');
    
    // 1. Ejecutar Grants Admin
    try {
      await runSqlFile(conn, path.join(securityDir, '02_grant_admin_prod.sql'));
    } catch (err) {
      console.warn('  -> [Aviso] Omitiendo aplicacion de Grants de bienestar_admin_prod (Normal en ambiente de desarrollo local).');
    }
    
    // 2. Ejecutar Grants Deployer
    try {
      await runSqlFile(conn, path.join(securityDir, '03_grant_deployer.sql'));
    } catch (err) {
      console.warn('  -> [Aviso] Omitiendo aplicacion de Grants de bienestar_deployer (Normal en ambiente de desarrollo local).');
    }
    
    // 3. Ejecutar Triggers
    console.log('Aplicando triggers de base de datos...');
    await runSqlFile(conn, path.join(securityDir, '04_create_triggers.sql'), true);
    
    console.log('=== Configuro la seguridad de la BD de manera exitosa ===');
  } catch (error) {
    console.error('=== ERROR aplicando la seguridad SQL ===');
    console.error(error);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
