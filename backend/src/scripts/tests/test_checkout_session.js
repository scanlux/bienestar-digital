require('dotenv').config();
const domiService = require('../domains/domi/domi.service');
const db = require('../config/db');

async function testCheckout() {
  console.log('=== TEST DE CHECKOUT SESSION ===');

  const userContext = {
    id: 10,
    actorType: 'user',
    rol: 'customer'
  };

  const reqSimulated = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Checkout-Test-Agent' }
  };

  try {
    // 1. Escenario exitoso: amountDomis=50, ownerType=user, ownerId=10 (si mismo)
    console.log('Escenario 1: Solicitud valida para si mismo...');
    const result1 = await domiService.createCheckoutSession(
      userContext,
      { amountDomis: 50, ownerType: 'user', ownerId: 10 },
      reqSimulated
    );
    console.log('Resultado 1 (esperado exito):', {
      publicKey: result1.publicKey,
      amountInCents: result1.amountInCents,
      reference: result1.reference,
      signature: result1.signature,
      redirectUrl: result1.redirectUrl
    });

    if (!result1.signature || !result1.reference) {
      throw new Error('Fallo: Referencia o firma ausente.');
    }

    // 2. Escenario fallido (BOLA Check): ownerId=11 (billetera ajena)
    console.log('Escenario 2: Intento de compra para billetera ajena (BOLA)...');
    try {
      await domiService.createCheckoutSession(
        userContext,
        { amountDomis: 50, ownerType: 'user', ownerId: 11 },
        reqSimulated
      );
      throw new Error('Fallo: Debio arrojar ForbiddenError.');
    } catch (err) {
      console.log('Resultado 2 (esperada excepcion Forbidden):', err.message);
      if (err.message !== 'Solo puedes comprar DOMIs para tu propia billetera.') {
        throw err;
      }
    }

    // 3. Escenario fallido: amountDomis < 1
    console.log('Escenario 3: Intento de compra con cantidad < 1...');
    try {
      await domiService.createCheckoutSession(
        userContext,
        { amountDomis: 0.5, ownerType: 'user', ownerId: 10 },
        reqSimulated
      );
      throw new Error('Fallo: Debio arrojar BusinessError por monto minimo.');
    } catch (err) {
      console.log('Resultado 3 (esperada excepcion BusinessError):', err.message);
    }

    console.log('=== TEST DE CHECKOUT EXITOSO ===');
  } catch (error) {
    console.error('Error durante la prueba de checkout:', error);
  } finally {
    await db.end();
  }
}

testCheckout();
