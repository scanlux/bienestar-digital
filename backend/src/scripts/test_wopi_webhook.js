const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function testWopiWebhook() {
  console.log('=== INICIANDO PRUEBA DE WEBHOOK DE PAGOS WOPI (FASE 2) ===');

  const secret = process.env.WOPI_WEBHOOK_SECRET || 'wopi_secret_key_2026';
  const dbConnection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_ROOT_PASSWORD || '',
    database: process.env.DB_NAME || 'marketplace_db',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  });

  try {
    // Obtener la wallet del usuario carlos_commerce (usuario_id = 2) antes del pago
    const targetUserId = 2; // admin_commerce_1
    const [[walletBefore]] = await dbConnection.query(
      'SELECT balance_custody, balance_utility FROM wallets WHERE usuario_id = ?',
      [targetUserId]
    );

    if (!walletBefore) {
      throw new Error(`Billetera no encontrada para usuario_id = ${targetUserId}`);
    }
    console.log(`Balance inicial del usuario: Custodia: ${walletBefore.balance_custody}, Utilidad: ${walletBefore.balance_utility}`);

    // Payload de pago
    const payload = {
      ownerType: 'user',
      ownerId: targetUserId,
      fiatAmount: 100000, // $100,000 COP = 250 DOMIs (peg = 400 COP)
      paymentRef: 'WOP-TEST-WEBHOOK'
    };

    const requestBody = JSON.stringify(payload);

    // Test 1: Petición sin firma
    console.log('\nTest 1: Petición sin firma...');
    const noSigRes = await fetch('http://127.0.0.1:4000/api/payments/wopi-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    });
    if (noSigRes.status === 401) {
      console.log('✔ Rechazado correctamente sin firma (401)');
    } else {
      console.error('❌ ERROR: Debería fallar con 401, status:', noSigRes.status);
    }

    // Test 2: Petición con firma inválida
    console.log('\nTest 2: Petición con firma inválida...');
    const invalidSigRes = await fetch('http://127.0.0.1:4000/api/payments/wopi-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wopi-Signature': 'invalid_signature_hex_1234'
      },
      body: requestBody
    });
    if (invalidSigRes.status === 401) {
      console.log('✔ Rechazado correctamente con firma inválida (401)');
    } else {
      console.error('❌ ERROR: Debería fallar con 401, status:', invalidSigRes.status);
    }

    // Test 3: Petición con firma válida
    console.log('\nTest 3: Petición con firma válida...');
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(requestBody)
      .digest('hex');

    const successRes = await fetch('http://127.0.0.1:4000/api/payments/wopi-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wopi-Signature': computedSignature
      },
      body: requestBody
    });

    const data = await successRes.json();
    if (successRes.status === 200) {
      console.log('✔ Webhook procesado exitosamente por la API! Respuesta:', data);

      // Verificar en base de datos que el saldo de la wallet aumentó
      // $100,000 / 400 COP por DOMI = 250 DOMIs.
      // Se suma al balance_utility
      const [[walletAfter]] = await dbConnection.query(
        'SELECT balance_custody, balance_utility FROM wallets WHERE usuario_id = ?',
        [targetUserId]
      );
      
      const diffCustody = parseFloat(walletAfter.balance_custody) - parseFloat(walletBefore.balance_custody);
      console.log(`Balance posterior: Custodia: ${walletAfter.balance_custody}, Utilidad: ${walletAfter.balance_utility}`);
      console.log(`Diferencia de saldo custodia: +${diffCustody} DOMIs`);

      if (diffCustody === 250.00) {
        console.log('✔ OK: El saldo de la billetera aumentó exactamente 250 DOMIs.');
      } else {
        console.error(`❌ ERROR: El saldo aumentó en ${diffCustody} DOMIs, se esperaba +250.`);
      }
    } else {
      console.error('❌ ERROR: El webhook respondió con código:', successRes.status, 'Body:', data);
    }

  } catch (error) {
    console.error('❌ ERROR CRÍTICO durante el test:', error.message);
  } finally {
    await dbConnection.end();
  }
}

testWopiWebhook();
