const crypto = require('crypto');
const domiRepository = require('../domi.repository');
const domiEngine = require('../../../services/domiEngine');
const { BusinessError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class ProcessWompiWebhook {
  async execute(body, req) {
    // --- 1. Verificar configuracion ---
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (!eventsSecret) {
      throw new Error('[CRITICAL] WOMPI_EVENTS_SECRET no configurada. Webhook deshabilitado.');
    }

    // --- 2. Extraer componentes de firma del payload de Wompi ---
    const { event, timestamp, signature: wompiSignature } = body;
    if (!wompiSignature?.checksum || !wompiSignature?.properties || !timestamp) {
      await logSecurityEvent(null, 'WOMPI_WEBHOOK_MALFORMED', 'HIGH', req, { reason: 'Payload sin campos de firma' });
      throw new BusinessError('Payload de webhook malformado.', 400);
    }

    // --- 3. Reconstruir la cadena a firmar (algoritmo oficial Wompi) ---
    // Concatenar: valores de los campos en signature.properties (en orden), timestamp, eventsSecret
    const propertyValues = wompiSignature.properties.map(prop => {
      const realPath = prop.startsWith('transaction.') ? `data.${prop}` : prop;
      return realPath.split('.').reduce((obj, key) => obj?.[key], body) ?? '';
    });
    const stringToVerify = [...propertyValues, timestamp, eventsSecret].join('');
    const computedChecksum = crypto.createHash('sha256').update(stringToVerify).digest('hex');

    // --- 4. Comparacion segura contra timing attacks ---
    const bufferReceived = Buffer.from(wompiSignature.checksum, 'utf8');
    const bufferComputed = Buffer.from(computedChecksum, 'utf8');
    const signaturesMatch = bufferReceived.length === bufferComputed.length
      && crypto.timingSafeEqual(bufferReceived, bufferComputed);

    if (!signaturesMatch) {
      await logSecurityEvent(null, 'WOMPI_WEBHOOK_INVALID_SIGNATURE', 'CRITICAL', req, {
        receivedChecksum: wompiSignature.checksum,
        reason: 'Firma SHA256 del evento de Wompi no coincide'
      });
      throw new BusinessError('Firma del webhook invalida.', 401);
    }

    // --- 5. Procesar solo transacciones aprobadas ---
    if (body.event !== 'transaction.updated' || body.data?.transaction?.status !== 'APPROVED') {
      // Evento no relevante, responder 200 OK igualmente
      return { received: true, processed: false };
    }

    const transaction = body.data.transaction;
    const reference = transaction.reference; // 'DOMI-MINT-user-15-1718...'

    // --- 6. Parsear la referencia para extraer ownerType y ownerId ---
    const refParts = reference.split('-');
    // Formato: DOMI-MINT-{ownerType}-{ownerId}-{timestamp}
    if (refParts[0] !== 'DOMI' || refParts[1] !== 'MINT') {
      await logSecurityEvent(null, 'WOMPI_WEBHOOK_INVALID_REFERENCE', 'HIGH', req, { reference });
      return { received: true, processed: false, reason: 'Referencia no pertenece a este sistema' };
    }
    const ownerType = refParts[2];
    const ownerId = parseInt(refParts[3], 10);
    const fiatAmount = transaction.amount_in_cents / 100;
    const transactionId = transaction.id;

    // --- 7. Verificar idempotencia ---
    const existingPackage = await domiRepository.findPackageByPaymentRef(transactionId);
    if (existingPackage) {
      await logSecurityEvent(null, 'WOMPI_WEBHOOK_DUPLICATE', 'LOW', req, {
        transactionId, ownerType, ownerId, reason: 'Evento duplicado ignorado'
      });
      return { received: true, processed: false, reason: 'Transaccion ya procesada' };
    }

    // --- 8. Acuner DOMIs de forma atomica ---
    // La restriccion UNIQUE uq_payment_ref en DB es la segunda barrera de idempotencia
    const result = await domiEngine.mintDomis(ownerType, ownerId, fiatAmount, transactionId);

    // --- 9. Auditoria del exito ---
    await logSecurityEvent(null, 'WOMPI_MINT_SUCCESS', 'LOW', req, {
      transactionId, ownerType, ownerId, fiatAmount,
      domisMinted: result.domis, packageId: result.packageId
    });

    return {
      received: true,
      processed: true,
      domisMinted: result.domis
    };
  }
}

module.exports = new ProcessWompiWebhook();
