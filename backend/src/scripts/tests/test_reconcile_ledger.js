const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../config/db');
const redisClient = require('../config/redis');
const cashService = require('../domains/cash/cash.service');
const domiEngine = require('../services/domiEngine');
const domiService = require('../domains/domi/domi.service');

async function run() {
  console.log('=== PROBANDO CONCILIACION BANCARIA Y VERIFICACION DE LEDGER ===');
  const conn = await db.getConnection();

  try {
    // 1. Obtener una wallet de prueba (usuario aleatorio para evitar historial corrupto)
    const testUserId = Math.floor(100000 + Math.random() * 900000);
    const wallet = await domiEngine.getOrCreateUserWallet(conn, testUserId);
    console.log(`Billetera de prueba: ID=${wallet.id}, OwnerId=${testUserId}, Balance=${wallet.balance_custody}`);

    // 2. Crear una consignacion bancaria pendiente en la DB
    const amountCop = 100000; // 100k COP
    const [result] = await conn.query(`
      INSERT INTO bank_deposits (
        amount_cop, destination_wallet_id, evidence_url, status, created_by, deposit_date, created_at
      ) VALUES (?, ?, 'http://evidence.url/test.png', 'pending', 1, NOW(), NOW())
    `, [amountCop, wallet.id]);

    const depositId = result.insertId;
    console.log(`Creada consignacion de prueba ID: ${depositId}`);

    // 3. Reconciliar/Aprobar la consignacion
    const reconcileResult = await cashService.reconcileBankDeposit(
      { id: 1, role: 'admin' }, // operator user context
      depositId,
      { action: 'approve', notes: 'Aprobación de prueba de integracion' },
      { ip: '127.0.0.1' } // request object mockup
    );

    console.log('Resultado de conciliacion:', reconcileResult);

    // 4. Ejecutar la verificacion del Ledger para esta billetera
    const verification = await domiService.verifyLedgerChain(wallet.id);
    console.log('Resultado de verificacion del Ledger:', verification);

    if (verification.isValid) {
      console.log('✅ LEDGER VERIFICADO CORRECTAMENTE - CADENA VALIDA');
    } else {
      console.error('❌ CADENA DE LEDGER CORRUPTA O INVALIDA:', verification.issues);
    }

  } catch (error) {
    console.error('Error durante la prueba:', error);
  } finally {
    conn.release();
    await db.end();
    await redisClient.disconnect();
    console.log('Conexiones cerradas.');
  }
}

run();
