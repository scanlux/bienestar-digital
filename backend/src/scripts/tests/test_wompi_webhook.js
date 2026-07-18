require('dotenv').config();
const crypto = require('crypto');
const domiService = require('../domains/domi/domi.service');
const db = require('../config/db');

async function runTest() {
  console.log('=== TEST DE WEBHOOK WOMPI ===');
  
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret) {
    console.error('ERROR: WOMPI_EVENTS_SECRET no configurada en .env');
    process.exit(1);
  }

  // Generamos una referencia aleatoria
  const transactionId = `test-tx-${Date.now()}`;
  const reference = `DOMI-MINT-user-10-${Date.now()}`; // ownerType: user, ownerId: 10
  const amountInCents = 1500000; // 15,000 COP = 15 DOMIs (asumiendo peg 1000)
  const timestamp = Math.floor(Date.now() / 1000);

  // Payload que enviaría Wompi
  const body = {
    event: 'transaction.updated',
    timestamp: timestamp,
    data: {
      transaction: {
        id: transactionId,
        amount_in_cents: amountInCents,
        reference: reference,
        status: 'APPROVED',
        currency: 'COP'
      }
    },
    signature: {
      properties: [
        'transaction.id',
        'transaction.status',
        'transaction.amount_in_cents'
      ]
    }
  };

  // Firmar con el algoritmo de Wompi
  const stringToSign = `${transactionId}APPROVED${amountInCents}${timestamp}${eventsSecret}`;
  const checksum = crypto.createHash('sha256').update(stringToSign).digest('hex');
  body.signature.checksum = checksum;

  console.log('Enviando payload simulado al servicio...');
  const reqSimulated = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Wompi-Test-Agent' }
  };

  try {
    // 1. Ejecutar el webhook (Primera vez)
    const result1 = await domiService.wompiWebhook(body, reqSimulated);
    console.log('Resultado del primer envio (esperado processed: true):', result1);

    if (result1.processed !== true) {
      throw new Error('Fallo: La transaccion debio ser procesada.');
    }

    // 2. Ejecutar el webhook (Segunda vez -> Idempotencia)
    console.log('Enviando el mismo payload por segunda vez para validar idempotencia...');
    const result2 = await domiService.wompiWebhook(body, reqSimulated);
    console.log('Resultado del segundo envio (esperado processed: false, duplicado):', result2);

    if (result2.processed !== false || result2.reason !== 'Transaccion ya procesada') {
      throw new Error('Fallo: La idempotencia no evito el doble procesamiento.');
    }

    console.log('=== TEST EXITOSO ===');
  } catch (error) {
    console.error('Error durante la prueba:', error);
  } finally {
    await db.end();
  }
}

runTest();
