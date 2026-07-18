const domiRepository = require('../domi.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { assertWalletAccess } = require('../guards/WalletAccessGuard');

class ManageWalletAlias {
  async getAliases(userContext, ownerType, ownerId, req) {
    // Validamos acceso (aplica BOLA/IDOR)
    await assertWalletAccess(userContext, ownerType, ownerId, 'ver billetera', req);
    
    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError('Billetera no encontrada');
    }

    return await domiRepository.findAliasesByWalletId(wallet.id);
  }

  async createAlias(userContext, ownerType, ownerId, alias, req) {
    // Validamos acceso (aplica BOLA/IDOR)
    await assertWalletAccess(userContext, ownerType, ownerId, 'ver billetera', req);
    
    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError('Billetera no encontrada');
    }
    
    // Normalizar alias (minúsculas, trim)
    const normalizedAlias = alias.trim().toLowerCase();

    // Validar regex de alias (letras, números, guiones y guiones bajos, longitud 3 a 30)
    const aliasRegex = /^[a-z0-9_-]{3,30}$/;
    if (!aliasRegex.test(normalizedAlias)) {
      throw new BusinessError('El alias sólo puede contener letras minúsculas, números, guiones (-) y guiones bajos (_), con una longitud de 3 a 30 caracteres.');
    }

    // Validar límite de 4 alias por billetera
    const currentCount = await domiRepository.countWalletAliases(wallet.id);
    if (currentCount >= 4) {
      throw new BusinessError('No es posible registrar más de 4 alias Bre-b por billetera.');
    }

    // Verificar disponibilidad del alias
    const existing = await domiRepository.findWalletAliasByString(normalizedAlias);
    if (existing) {
      throw new BusinessError('El alias Bre-b indicado ya se encuentra registrado en el sistema.');
    }

    // Crear en DB
    await domiRepository.createWalletAlias(wallet.id, normalizedAlias);

    // Auditoría
    await logSecurityEvent(userContext.id, 'CREATE_WALLET_ALIAS', 'MEDIUM', req, {
      walletId: wallet.id,
      ownerType,
      ownerId,
      alias: normalizedAlias
    });

    return {
      success: true,
      alias: normalizedAlias
    };
  }

  async deleteAlias(userContext, ownerType, ownerId, aliasId, req) {
    // Validamos acceso (aplica BOLA/IDOR)
    await assertWalletAccess(userContext, ownerType, ownerId, 'ver billetera', req);
    
    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError('Billetera no encontrada');
    }

    // Buscar alias
    const alias = await domiRepository.findWalletAliasById(aliasId);
    if (!alias) {
      throw new NotFoundError('El alias Bre-b especificado no existe.');
    }

    // Verificar propiedad
    if (alias.wallet_id !== wallet.id) {
      throw new ForbiddenError('No tienes permisos para eliminar este alias Bre-b.');
    }

    // Eliminar en DB
    await domiRepository.deleteWalletAlias(aliasId);

    // Auditoría
    await logSecurityEvent(userContext.id, 'DELETE_WALLET_ALIAS', 'MEDIUM', req, {
      walletId: wallet.id,
      ownerType,
      ownerId,
      aliasId,
      alias: alias.alias
    });

    return { success: true };
  }

  async checkAvailability(alias) {
    if (!alias) {
      throw new BusinessError('El alias a verificar es requerido.');
    }
    const normalizedAlias = alias.trim().toLowerCase();
    const aliasRegex = /^[a-z0-9_-]{3,30}$/;
    if (!aliasRegex.test(normalizedAlias)) {
      return { available: false, error: 'Formato inválido. Usar alfanumérico más guiones (3 a 30 caracteres).' };
    }

    const existing = await domiRepository.findWalletAliasByString(normalizedAlias);
    return { available: !existing };
  }

  async suggestAlias(userContext, ownerType, ownerId) {
    const ownerInfo = await domiRepository.findWalletOwnerInfo(ownerType, ownerId);
    
    let initials = 'sys';
    let docDigits = '000';

    if (ownerInfo) {
      if (ownerType === 'user') {
        const nameParts = [ownerInfo.nombres, ownerInfo.apellidos].filter(Boolean).join(' ').split(/\s+/);
        initials = nameParts.map(p => p.charAt(0)).join('').toLowerCase().substring(0, 4);
        if (!initials) initials = 'usr';
        docDigits = ownerInfo.cedula ? ownerInfo.cedula.replace(/\D/g, '').substring(0, 3) : '000';
      } else if (ownerType === 'commerce') {
        const nameParts = ownerInfo.nombre.split(/\s+/);
        initials = nameParts.map(p => p.charAt(0)).join('').toLowerCase().substring(0, 4);
        if (!initials) initials = 'com';
        docDigits = ownerInfo.nit ? ownerInfo.nit.replace(/\D/g, '').substring(0, 3) : '000';
      } else if (ownerType === 'store') {
        const nameToUse = ownerInfo.commerce_nombre || ownerInfo.nombre_sucursal || 'store';
        const nameParts = nameToUse.split(/\s+/);
        initials = nameParts.map(p => p.charAt(0)).join('').toLowerCase().substring(0, 4);
        if (!initials) initials = 'str';
        const docRaw = ownerInfo.nit || ownerInfo.matricula || '000';
        docDigits = docRaw.replace(/\D/g, '').substring(0, 3);
      }
    }

    if (!docDigits) docDigits = '000';
    
    // Normalizar iniciales (limpiar tildes, caracteres especiales)
    initials = initials.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]/g, "");
    if (!initials) initials = 'wallet';

    const baseAlias = `${initials}${docDigits}`;

    // Buscar colisión y agregar número secuencial
    let candidate = baseAlias;
    let counter = 1;
    while (await domiRepository.findWalletAliasByString(candidate)) {
      candidate = `${baseAlias}${counter}`;
      counter++;
    }

    return { alias: candidate };
  }
}

module.exports = new ManageWalletAlias();
