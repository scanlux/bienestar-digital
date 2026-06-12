const domiRepository = require('./domi.repository');
const domiEngine = require('../../services/domiEngine');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');

class DomiService {
  async getTokenRegistry() {
    const registry = await domiRepository.findTokenRegistry();
    if (!registry) {
      throw new BusinessError('Token no configurado', 500);
    }
    return registry;
  }

  async getProtocolRules() {
    const rules = await domiRepository.findProtocolRules();
    if (!rules) {
      throw new BusinessError('Reglas no configuradas', 500);
    }
    return rules;
  }

  async calculateOrderCost(totalCop) {
    if (!totalCop || totalCop <= 0) {
      throw new BusinessError('totalCop es requerido y debe ser positivo');
    }
    return await domiEngine.calculateOrderCost(totalCop);
  }

  async getSystemWallet() {
    const wallet = await domiRepository.findSystemWallet();
    if (!wallet) {
      throw new BusinessError('Billetera del sistema no encontrada', 500);
    }
    return wallet;
  }

  async getWallet(userContext, ownerType, ownerId, req) {
    const isSystem = userContext.actorType === 'system_user';

    if (!isSystem) {
      if (ownerType === 'user') {
        if (String(userContext.id) !== String(ownerId)) {
          await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
            reason: 'Intento de ver billetera ajena de tipo usuario',
            targetOwnerType: ownerType,
            targetOwnerId: ownerId
          });
          throw new ForbiddenError('Acceso no autorizado. Sólo puedes consultar tu propia billetera.');
        }
      } else if (ownerType === 'store') {
        const hasAccess = userContext.rol === 'admin' && userContext.storeIds && userContext.storeIds.includes(parseInt(ownerId));
        let isManager = false;
        if (userContext.rol === 'admin' && userContext.commerceId) {
          isManager = await domiRepository.checkStoreExists(ownerId, userContext.commerceId);
        }
        
        if (!hasAccess && !isManager) {
          await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
            reason: 'Intento de ver billetera de sede sin autorizacion',
            targetOwnerType: ownerType,
            targetOwnerId: ownerId
          });
          throw new ForbiddenError('Acceso denegado a la billetera de esta sede.');
        }
      } else {
        await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
          reason: 'Intento de ver billetera de sistema u otra invalida',
          targetOwnerType: ownerType,
          targetOwnerId: ownerId
        });
        throw new ForbiddenError('Acceso denegado.');
      }
    }

    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError('Billetera no encontrada');
    }
    return wallet;
  }

  async mintDomis(userContext, data) {
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

  async getPackages(userContext, storeId, req) {
    const isSystem = userContext.actorType === 'system_user';
    const hasAccess = userContext.rol === 'admin' && userContext.storeIds && userContext.storeIds.includes(parseInt(storeId));
    let isManager = false;
    if (userContext.rol === 'admin' && userContext.commerceId) {
      isManager = await domiRepository.checkStoreExists(storeId, userContext.commerceId);
    }
    
    if (!isSystem && !hasAccess && !isManager) {
      await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: 'Intento de ver historial de paquetes de sede sin autorizacion',
        targetStoreId: storeId
      });
      throw new ForbiddenError('Acceso denegado al historial de paquetes de esta sede.');
    }

    return await domiRepository.findDomiPackagesByStoreId(storeId);
  }

  async getLedger(queryFilters) {
    return await domiRepository.findLedgerEntries(queryFilters);
  }

  async topupStore(userContext, storeId, bodyData) {
    const { amountDomis } = bodyData;
    
    if (!amountDomis || amountDomis <= 0) {
      throw new BusinessError('Monto invalido.');
    }

    const isSystem = userContext.actorType === 'system_user';
    const hasAccess = userContext.rol === 'admin' && userContext.storeIds && userContext.storeIds.includes(parseInt(storeId));
    let isManager = false;
    if (userContext.rol === 'admin' && userContext.commerceId) {
      isManager = await domiRepository.checkStoreExists(storeId, userContext.commerceId);
    }
    if (!isSystem && !hasAccess && !isManager) {
      throw new ForbiddenError('Acceso no autorizado a esta sede.');
    }

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

  async wopiWebhook(body, headers, req) {
    const secret = process.env.WOPI_WEBHOOK_SECRET || 'wopi_secret_key_2026';
    const signature = headers['x-wopi-signature'] || headers['X-Wopi-Signature'];

    if (!signature) {
      await logSecurityEvent(null, 'WOPI_WEBHOOK_MISSING_SIGNATURE', 'HIGH', req, {
        reason: 'Falta la firma digital x-wopi-signature'
      });
      throw new BusinessError('Falta la firma digital.', 401);
    }

    const { ownerType, ownerId, fiatAmount, paymentRef } = body;

    if (!ownerType || !ownerId || !fiatAmount || fiatAmount <= 0) {
      throw new BusinessError('ownerType (store/user), ownerId y fiatAmount son requeridos.');
    }

    if (!['store', 'user'].includes(ownerType)) {
      throw new BusinessError('ownerType debe ser store o user.');
    }

    const crypto = require('crypto');
    const payload = JSON.stringify(body);
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const bufferSignature = Buffer.from(signature, 'utf8');
    const bufferComputed = Buffer.from(computedSignature, 'utf8');

    if (bufferSignature.length !== bufferComputed.length || !crypto.timingSafeEqual(bufferSignature, bufferComputed)) {
      await logSecurityEvent(null, 'WOPI_WEBHOOK_INVALID_SIGNATURE', 'CRITICAL', req, {
        receivedSignature: signature,
        reason: 'Firma digital incorrecta'
      });
      throw new BusinessError('Firma digital inválida.', 401);
    }

    const result = await domiEngine.mintDomis(ownerType, parseInt(ownerId), parseFloat(fiatAmount), paymentRef || 'WOPI_WEBHOOK_AUTO');

    await logSecurityEvent(null, 'WOPI_WEBHOOK_SUCCESSFUL_MINT', 'LOW', req, {
      ownerType,
      ownerId,
      fiatAmount,
      paymentRef,
      domisMinted: result.domis
    });

    return {
      message: `Acuñación exitosa de ${result.domis} DOMIs.`,
      ...result
    };
  }
}

module.exports = new DomiService();
