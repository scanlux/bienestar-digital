require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('=== APLICANDO DDL DEL SISTEMA RBAC (FASE 1) ===');

  const sqlPath = path.join(__dirname, 'v10_rbac_schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`ERROR: No se encuentra el archivo SQL en ${sqlPath}`);
    process.exit(1);
  }

  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  // Usamos el usuario deployer que tiene permisos DDL (CREATE, DROP, ALTER)
  const dbUser = 'bienestar_deployer';
  const dbPassword = process.env.DB_DEPLOYER_PASSWORD || 'D3pl0y3r_2026_Secure';

  console.log(`Conectando como usuario: ${dbUser} al host: ${process.env.DB_HOST || '100.127.144.125'}`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '100.127.144.125',
    user: dbUser,
    password: dbPassword,
    database: process.env.DB_NAME || 'marketplace_db',
    multipleStatements: true
  });

  try {
    // Para simplificar la ejecución de múltiples sentencias y triggers con DELIMITER en un archivo .sql:
    // Dividimos por punto y coma (excluyendo lo que esté dentro de BEGIN/END del trigger si lo dividimos a mano,
    // o simplemente ejecutamos sentencias una a una).
    // Nota: Como usamos multipleStatements: true, podemos ejecutar bloques más grandes, pero MariaDB/MySQL 
    // a veces se queja de la sintaxis DELIMITER. En el .sql que escribimos, NO usamos DELIMITER sino que escribimos
    // los triggers directamente y usamos ";" como terminador. 
    // Para no tener problemas de parsing en JS, ejecutamos las sentencias divididas por punto y coma de forma segura.
    
    // Un parser de punto y coma rudimentario pero efectivo para DDL y triggers sencillos
    const statements = [];
    let current = '';
    let inTrigger = false;
    
    const lines = rawSql.split('\n');
    for (let line of lines) {
      // Eliminar comentarios de línea completa
      if (line.trim().startsWith('--')) continue;
      
      current += line + '\n';
      
      // Detección simple de inicio/fin de bloque de trigger
      if (line.toUpperCase().includes('CREATE TRIGGER') || line.toUpperCase().includes('CREATE OR REPLACE TRIGGER')) {
        inTrigger = true;
      }
      
      if (inTrigger && line.toUpperCase().trim() === 'END;') {
        statements.push(current.trim());
        current = '';
        inTrigger = false;
        continue;
      }
      
      if (!inTrigger && line.trim().endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    }
    
    if (current.trim().length > 0) {
      statements.push(current.trim());
    }

    console.log(`Se detectaron ${statements.length} sentencias SQL a ejecutar.`);

    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      console.log(`Ejecutando sentencia [${i + 1}/${statements.length}]...`);
      try {
        await connection.query(stmt);
      } catch (err) {
        console.error(`Error en sentencia: \n${stmt}\n`);
        throw err;
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✔ Tablas y triggers creados exitosamente en MariaDB.');

    // Verificación rápida
    console.log('\n--- VERIFICACIÓN DE TABLAS ---');
    const [tables] = await connection.execute("SHOW TABLES LIKE 'permission%'");
    console.log('Tablas "permission":', tables.map(t => Object.values(t)[0]));
    
    const [rolesTables] = await connection.execute("SHOW TABLES LIKE 'role%'");
    console.log('Tablas "role":', rolesTables.map(t => Object.values(t)[0]));

    const [userRolesTable] = await connection.execute("SHOW TABLES LIKE 'user_roles'");
    console.log('Tabla "user_roles":', userRolesTable.map(t => Object.values(t)[0]));

    const [triggers] = await connection.execute("SHOW TRIGGERS WHERE `Table` IN ('profiles','commerces','stores')");
    console.log('Triggers creados:', triggers.map(t => t.Trigger));

    await connection.end();
    console.log('=== FASE 1 COMPLETADA CON ÉXITO ===');
  } catch (error) {
    console.error('✖ ERROR CRÍTICO DURANTE LA EJECUCIÓN DEL DDL:', error);
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
      await connection.end();
    } catch (_) {}
    process.exit(1);
  }
}

run();
