const db = require('../../../config/db');
const domiRepository = require('../domi.repository');
const domiEngine = require('../../../services/domiEngine');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { assertWalletAccess } = require('../guards/WalletAccessGuard');

class MintDomis {
  async execute(userContext, data) {
    const { ownerType, ownerId, fiatAmount, paymentRef } = data;

    if (!ownerType || !ownerId || !fiatAmount || fiatAmount <= 0) {
      throw new BusinessError('ownerType (store/user), ownerId y fiatAmount son requeridos.');
    }
    if (!['store', 'user'].includes(ownerType)) {
      throw new BusinessError('ownerType debe ser store o user.');
    }

    const result = await domiEngine.mintDomis(ownerType, ownerId, fiatAmount, paymentRef);
    return {
      message: `Paquete de ${result.domis} DOMI acunado para ${ownerType} #${ownerId}`,
      ...result
    };
  }

  async topupStore(userContext, storeId, bodyData, req) {
    const { amountDomis } = bodyData;
    
    if (!amountDomis || amountDomis <= 0) {
      throw new BusinessError('Monto invalido.');
    }

    await assertWalletAccess(userContext, 'store', storeId, 'recargar sede', req);

    const tokenRegistry = await domiRepository.findTokenRegistryFiatPeg();
    const fiatPeg = tokenRegistry ? parseFloat(tokenRegistry.fiat_peg_cop) : 1000.00;
    
    const fiatAmount = amountDomis * fiatPeg;
    const paymentRef = `SIM-${Date.now()}`;
    
    const result = await domiEngine.mintDomis('store', parseInt(storeId), fiatAmount, paymentRef);
    
    return { 
      success: true, 
      message: `Recarga simulada exitosa de ${amountDomis} DOMIs.`,
      domis: result.domis,
      fiatAmount: result.fiatAmount,
      packageId: result.packageId
    };
  }

  async mintManual(userContext, data, req) {
    const { ownerType, ownerId, amountDomis } = data;

    if (!ownerType || !ownerId || !amountDomis || amountDomis <= 0) {
      throw new BusinessError('ownerType, ownerId y amountDomis son requeridos y deben ser positivos.');
    }

    if (!['store', 'user', 'commerce'].includes(ownerType)) {
      throw new BusinessError('ownerType debe ser store, user o commerce.');
    }

    const tokenRegistry = await domiRepository.findTokenRegistryFiatPeg();
    const fiatPeg = tokenRegistry ? parseFloat(tokenRegistry.fiat_peg_cop) : 1000.00;
    const fiatAmount = amountDomis * fiatPeg;

    const paymentRef = `MANUAL-MINT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await domiEngine.mintDomis(ownerType, parseInt(ownerId), fiatAmount, paymentRef);

    await logSecurityEvent(userContext.id, 'MANUAL_MINT', 'MEDIUM', req, {
      operatorId: userContext.id,
      targetOwnerType: ownerType,
      targetOwnerId: ownerId,
      amountDomis,
      paymentRef,
      packageId: result.packageId
    });

    return {
      success: true,
      message: `Acuñación manual de ${amountDomis} DOMIs exitosa para ${ownerType} #${ownerId}`,
      ...result
    };
  }

  async mintCash(userContext, data, req) {
    if (userContext.actorType !== 'system_user') {
      throw new ForbiddenError('Acceso denegado: Solo usuarios de sistema pueden realizar acuñación por efectivo.');
    }

    const { ownerType, ownerId, amountDomis } = data;

    if (!ownerType || !ownerId || !amountDomis || amountDomis <= 0) {
      throw new BusinessError('ownerType, ownerId y amountDomis son requeridos y deben ser positivos.');
    }

    const tokenRegistry = await domiRepository.findTokenRegistryFiatPeg();
    const fiatPeg = tokenRegistry ? parseFloat(tokenRegistry.fiat_peg_cop) : 1.0;
    const fiatAmount = amountDomis * fiatPeg;

    const paymentRef = `CASH-MINT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Llamamos a mintDomis con isConfirmed = false
    const result = await domiEngine.mintDomis(ownerType, parseInt(ownerId), fiatAmount, paymentRef, false, null);

    // Registrar evento de seguridad de auditoría
    await logSecurityEvent(userContext.id, 'DOMI_CASH_MINT', 'HIGH', req, {
      operatorId: userContext.id,
      targetOwnerType: ownerType,
      targetOwnerId: ownerId,
      amountDomis,
      paymentRef,
      packageId: result.packageId
    });

    return {
      success: true,
      message: `Acuñación transitoria de ${amountDomis} DOMIs registrada por efectivo. Pendiente confirmación bancaria.`,
      ...result
    };
  }

  async confirmCashMint(userContext, packageId, req) {
    if (userContext.actorType !== 'system_user') {
      throw new ForbiddenError('Acceso denegado: Solo usuarios de sistema pueden confirmar depósitos de reserva.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [packages] = await conn.query('SELECT * FROM domi_packages WHERE id = ?', [packageId]);
      if (packages.length === 0) {
        throw new NotFoundError(`Paquete de acuñación #${packageId} no encontrado.`);
      }
      const pkg = packages[0];

      if (pkg.is_confirmed === 1) {
        throw new BusinessError(`El paquete de acuñación #${packageId} ya ha sido confirmado previamente.`, 400);
      }

      // Marcar el paquete como confirmado en banco
      await conn.query(
        "UPDATE domi_packages SET is_confirmed = 1, confirmed_at = NOW(), confirmed_by = ?, status = 'confirmado' WHERE id = ?",
        [userContext.id, packageId]
      );

      // Registrar evento de seguridad de auditoría
      await logSecurityEvent(userContext.id, 'DOMI_RESERVE_CONFIRMED', 'HIGH', req, {
        operatorId: userContext.id,
        packageId,
        amountDomis: pkg.domis_purchased,
        fiatAmountCop: pkg.fiat_paid_cop
      });

      await conn.commit();
      return {
        success: true,
        message: `Depósito de reserva para el paquete #${packageId} confirmado con éxito en banco.`,
        packageId
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new MintDomis();
