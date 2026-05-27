const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: __dirname + '/../../.env' });

async function wipe() {
  console.log('🔴 INICIANDO PURGA TRANSACCIONAL (MODO BYPASS)...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: 'root', 
    password: 'Kh#azr9b!yvP27_mQ*rT5x',
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('🔓 Activando bypass de seguridad por sesión...');
    await connection.query('SET @domi_bypass_security = 1;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    console.log('🧹 Vaciando tablas transaccionales...');
    const tablesToTruncate = [
      'order_items',
      'orders',
      'product_popularity',
      'domi_ledger',
      'domi_packages',
      'order_incidents',
      'rescue_assignments'
    ];

    for (const table of tablesToTruncate) {
      await connection.query(`TRUNCATE TABLE ${table};`);
      console.log(`  - ${table} vaciada.`);
    }

    console.log('💸 Reiniciando saldos de Billeteras a 0...');
    await connection.query('UPDATE wallets SET balance_custody = 0, balance_utility = 0;');

    console.log('🛡️ Verificando y Restaurando Triggers de Inmutabilidad...');
    const triggersPath = path.join(__dirname, '../../scripts/db_security/04_create_triggers.sql');
    if (fs.existsSync(triggersPath)) {
      const triggersSql = fs.readFileSync(triggersPath, 'utf8');
      const triggerStatements = triggersSql
        .split('//')
        .map(s => {
          const match = s.match(/CREATE\s+OR\s+REPLACE\s+TRIGGER[\s\S]+/i);
          return match ? match[0].trim() : null;
        })
        .filter(s => s !== null);

      for (const stmt of triggerStatements) {
        await connection.query(stmt);
      }
      console.log('  - Triggers restaurados.');
    }

    console.log('🔒 Desactivando bypass y reactivando FK...');
    await connection.query('SET @domi_bypass_security = NULL;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n🔍 VALIDANDO INTEGRIDAD POST-PURGA...');
    
    // 1. Validar Triggers
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = ?
    `, [process.env.DB_NAME]);
    
    console.log(`  - Triggers activos: ${triggers.length} de 6 esperados.`);
    if (triggers.length < 6) {
      console.warn('  ⚠️ ATENCIÓN: Faltan triggers de seguridad. Ejecute scripts/db_security/restore_security.sh');
    }

    // 2. Validar Tablas Vacías
    for (const table of tablesToTruncate) {
      const [[{ count }]] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      if (count > 0) {
        console.error(`  ❌ ERROR: La tabla ${table} no se vació (registros: ${count})`);
      } else {
        console.log(`  - Tabla ${table}: OK (Vacía)`);
      }
    }

    console.log('\n✅ RESULTADO: Purga exitosa y validada. Sistema listo.');

  } catch (err) {
    console.error('❌ FALLO CRÍTICO EN LA PURGA:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

wipe();
