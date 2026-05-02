/**
 * Verificacion rapida de permisos DB post-REVOKE
 */
require('dotenv').config();
const crypto = require('crypto');
const db = require('../config/db');

async function verify() {
  console.log('=== VERIFICACION DE PERMISOS DB ===\n');

  // Test 1: SELECT en token_registry
  console.log('--- Test 1: SELECT en token_registry ---');
  try {
    const [t] = await db.query('SELECT symbol, fiat_peg_cop FROM token_registry');
    console.log('  PASS:', t[0]);
  } catch(e) {
    console.log('  FAIL:', e.message);
  }

  // Test 2: INSERT en token_registry (DEBE fallar)
  console.log('--- Test 2: INSERT en token_registry (debe fallar) ---');
  try {
    await db.query("INSERT INTO token_registry (id, integrity_hash) VALUES (2, 'test')");
    console.log('  FAIL: INSERT permitido! La tabla NO esta protegida.');
  } catch(e) {
    console.log('  PASS: Bloqueado ->', e.message.substring(0, 100));
  }

  // Test 3: UPDATE en protocol_rules (DEBE fallar)
  console.log('--- Test 3: UPDATE en protocol_rules (debe fallar) ---');
  try {
    await db.query("UPDATE protocol_rules SET base_cost_domis = 999 WHERE id = 1");
    console.log('  FAIL: UPDATE permitido! La tabla NO esta protegida.');
  } catch(e) {
    console.log('  PASS: Bloqueado ->', e.message.substring(0, 100));
  }

  // Test 4: DELETE en domi_ledger (DEBE fallar)
  console.log('--- Test 4: DELETE en domi_ledger (debe fallar) ---');
  try {
    await db.query("DELETE FROM domi_ledger WHERE id = 1");
    console.log('  FAIL: DELETE permitido! El ledger NO esta protegido.');
  } catch(e) {
    console.log('  PASS: Bloqueado ->', e.message.substring(0, 100));
  }

  // Test 5: INSERT en domi_ledger (DEBE funcionar)
  console.log('--- Test 5: INSERT en domi_ledger (debe funcionar) ---');
  try {
    const h = crypto.randomBytes(32).toString('hex');
    await db.query(
      "INSERT INTO domi_ledger (tx_hash, tx_type, amount_domis, reference_type, reference_id, protocol_snapshot) VALUES (?, 'mint', 1, 'manual', 999, '{}')",
      [h]
    );
    console.log('  PASS: INSERT permitido correctamente.');
  } catch(e) {
    console.log('  FAIL:', e.message);
  }

  // Test 6: Tablas normales siguen funcionando
  console.log('--- Test 6: SELECT/INSERT en tablas normales ---');
  try {
    const [s] = await db.query('SELECT COUNT(*) as c FROM stores');
    console.log('  PASS: stores accesible (' + s[0].c + ' registros)');
    const [u] = await db.query('SELECT COUNT(*) as c FROM users');
    console.log('  PASS: users accesible (' + u[0].c + ' registros)');
  } catch(e) {
    console.log('  FAIL:', e.message);
  }

  console.log('\n=== VERIFICACION COMPLETA ===');
  await db.end();
}

verify().catch(e => { console.error(e); process.exit(1); });
