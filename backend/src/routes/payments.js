const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const domiEngine = require('../services/domiEngine');
const { logSecurityEvent } = require('../utils/securityLogger');

// @route   POST /api/payments/wopi-webhook
// @desc    Receive payment notification and mint DOMIs
router.post('/wopi-webhook', async (req, res) => {
  const secret = process.env.WOPI_WEBHOOK_SECRET || 'wopi_secret_key_2026';
  const signature = req.headers['x-wopi-signature'] || req.headers['X-Wopi-Signature'];

  if (!signature) {
    await logSecurityEvent(null, 'WOPI_WEBHOOK_MISSING_SIGNATURE', 'HIGH', req, {
      reason: 'Falta la firma digital x-wopi-signature'
    });
    return res.status(401).json({ error: 'Falta la firma digital.' });
  }

  const { ownerType, ownerId, fiatAmount, paymentRef } = req.body;

  if (!ownerType || !ownerId || !fiatAmount || fiatAmount <= 0) {
    return res.status(400).json({ error: 'ownerType (store/user), ownerId y fiatAmount son requeridos.' });
  }

  if (!['store', 'user'].includes(ownerType)) {
    return res.status(400).json({ error: 'ownerType debe ser store o user.' });
  }

  try {
    // Calcular firma HMAC-SHA256
    const payload = JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Usar secure comparison para evitar timing attacks
    const bufferSignature = Buffer.from(signature, 'utf8');
    const bufferComputed = Buffer.from(computedSignature, 'utf8');

    if (bufferSignature.length !== bufferComputed.length || !crypto.timingSafeEqual(bufferSignature, bufferComputed)) {
      await logSecurityEvent(null, 'WOPI_WEBHOOK_INVALID_SIGNATURE', 'CRITICAL', req, {
        receivedSignature: signature,
        reason: 'Firma digital incorrecta'
      });
      return res.status(401).json({ error: 'Firma digital inválida.' });
    }

    // Firma válida, proceder a acuñar (mint) DOMIs
    const result = await domiEngine.mintDomis(ownerType, parseInt(ownerId), parseFloat(fiatAmount), paymentRef || 'WOPI_WEBHOOK_AUTO');

    await logSecurityEvent(null, 'WOPI_WEBHOOK_SUCCESSFUL_MINT', 'LOW', req, {
      ownerType,
      ownerId,
      fiatAmount,
      paymentRef,
      domisMinted: result.domis
    });

    res.json({
      message: `Acuñación exitosa de ${result.domis} DOMIs.`,
      ...result
    });

  } catch (error) {
    console.error('Wopi webhook error:', error);
    await logSecurityEvent(null, 'WOPI_WEBHOOK_ERROR', 'HIGH', req, {
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
