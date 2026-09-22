const crypto = require('crypto');
const db = require('../../../config/db');
const domiRepository = require('../domi.repository');
const domiEngine = require('../../../services/domiEngine');
const { resolveWallet } = require('../../../services/domi-kernel/wallet-resolver');
const { BusinessError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { assertWalletAccess } = require('../guards/WalletAccessGuard');
const { PURCHASABLE_OWNER_TYPES } = require('../../../services/domi-kernel/owner-type.constants');

class CreateWompiCheckout {
  async execute(userContext, data, req) {
    const { amountDomis, ownerType, ownerId } = data;

    // --- Validacion basica ---
    if (!amountDomis || amountDomis <= 0) {
      throw new BusinessError('El monto de compra debe ser mayor a cero.');
    }
    if (!PURCHASABLE_OWNER_TYPES.includes(ownerType)) {
      throw new BusinessError('ownerType invalido.');
    }

    // --- Verificacion BOLA (anti-fraude) ---
    await assertWalletAccess(userContext, ownerType, ownerId, 'iniciar checkout', req);

    // --- Calculos financieros ---
    const tokenRegistry = await domiRepository.findTokenRegistryFiatPeg();
    const fiatPeg = tokenRegistry ? parseFloat(tokenRegistry.fiat_peg_cop) : 1000.00;
    
    // Obtener reglas de comisiones de Wompi de la BD
    const rules = await domiEngine.getProtocolRules();
    const wompiPercent = rules.wompi_commission_percent !== undefined ? parseFloat(rules.wompi_commission_percent) : 2.65;
    const wompiFixed = rules.wompi_commission_fixed_cop !== undefined ? parseFloat(rules.wompi_commission_fixed_cop) : 700.00;
    const wompiIvaPercent = rules.wompi_commission_iva_percent !== undefined ? parseFloat(rules.wompi_commission_iva_percent) : 19.00;

    const netAmount = amountDomis * fiatPeg;

    // Formula de despeje para que el comercio reciba exactamente netAmount neto despues de comisiones e IVA de Wompi:
    // G = (N + F * (1 + I/100)) / (1 - (P/100 * (1 + I/100)))
    const ivaMultiplier = 1 + (wompiIvaPercent / 100);
    const numerator = netAmount + (wompiFixed * ivaMultiplier);
    const denominator = 1 - ((wompiPercent / 100) * ivaMultiplier);

    const grossAmount = numerator / denominator;

    // Validar el mínimo bruto de la pasarela desde los parámetros de la BD
    const wompiMinPurchase = rules.wompi_min_purchase_cop !== undefined ? parseInt(rules.wompi_min_purchase_cop) : 1500;
    if (grossAmount < wompiMinPurchase) {
      throw new BusinessError(`El valor total bruto a pagar (${Math.round(grossAmount)} COP) es inferior al mínimo de pasarela aceptado (${wompiMinPurchase} COP).`);
    }

    const amountInCents = Math.round(grossAmount * 100);
    const wompiFee = Math.max(0, grossAmount - netAmount);

    // --- Generacion de referencia unica ---
    const reference = `DOMI-MINT-${ownerType}-${ownerId}-${Date.now()}`;

    // --- Firma de integridad SHA256 (segun documentacion oficial Wompi) ---
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    if (!integritySecret) {
      throw new Error('[CRITICAL] WOMPI_INTEGRITY_SECRET no configurada.');
    }
    const stringToSign = `${reference}${amountInCents}COP${integritySecret}`;
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    // --- Resolver wallet y crear paquete pendiente ---
    const wallet = await resolveWallet(db, ownerType, ownerId);
    await db.query(`
      INSERT INTO domi_packages (
        store_id, wallet_id, owner_entity_type, owner_entity_id, domis_purchased, 
        fiat_paid_cop, exchange_rate, payment_ref, status, is_confirmed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 0)
    `, [
      ownerType === 'store' ? ownerId : null,
      wallet.id,
      ownerType,
      ownerId,
      amountDomis,
      grossAmount,
      fiatPeg,
      reference
    ]);

    // --- Auditoria ---
    await logSecurityEvent(userContext.id, 'WOMPI_CHECKOUT_INITIATED', 'LOW', req, {
      amountDomis, amountInCents, reference, ownerType, ownerId, netAmount, grossAmount, wompiFee, walletId: wallet.id
    });

    // --- Respuesta ---
    const redirectUrl = `${process.env.WOMPI_REDIRECT_BASE_URL}`;
    return {
      publicKey: process.env.WOMPI_PUBLIC_KEY,
      currency: 'COP',
      amountInCents,
      reference,
      signature,
      redirectUrl,
      fiatPeg,
      amountDomis,
      netAmount,
      grossAmount,
      wompiFee
    };
  }
}

module.exports = new CreateWompiCheckout();
