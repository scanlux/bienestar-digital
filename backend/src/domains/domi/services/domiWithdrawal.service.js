const db = require('../../../config/db');
const domiRepository = require('../domi.repository');
const { NotFoundError, ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const ProcessWithdrawalRequest = require('../use-cases/ProcessWithdrawalRequest');

class DomiWithdrawalService {
  constructor(domiService) {
    this.domiService = domiService;
  }

  async getWithdrawalRequests(userContext, filters = {}) {
    return await ProcessWithdrawalRequest.getRequests(userContext, filters);
  }

  async processWithdrawalRequest(userContext, requestId, data, req) {
    return await ProcessWithdrawalRequest.processRequest(userContext, requestId, data, req);
  }

  async getWithdrawalAccounts(userContext, req) {
    const ownerType = userContext.actorType === 'system_user' ? 'system' : userContext.commerceId ? 'commerce' : 'user';
    const ownerId = ownerType === 'system' ? null : ownerType === 'commerce' ? userContext.commerceId : userContext.id;
    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError('Billetera no encontrada.');
    }
    return await domiRepository.findWithdrawalAccountsByWalletId(wallet.id);
  }

  async createWithdrawalAccount(userContext, data, req) {
    const ownerType = userContext.actorType === 'system_user' ? 'system' : userContext.commerceId ? 'commerce' : 'user';
    const ownerId = ownerType === 'system' ? null : ownerType === 'commerce' ? userContext.commerceId : userContext.id;
    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError('Billetera no encontrada.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (data.is_default) {
        await domiRepository.unsetAllDefaultWithdrawalAccounts(wallet.id, connection);
      }
      const accountId = await domiRepository.createWithdrawalAccount(wallet.id, data, connection);

      await logSecurityEvent(
        userContext.id,
        'CREATE_WITHDRAWAL_ACCOUNT',
        'MEDIUM',
        req,
        { accountId, metodo: data.metodo, numero_cuenta: data.numero_cuenta },
        'wallet',
        wallet.id
      );

      await connection.commit();
      connection.release();
      return { id: accountId };
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  }

  async deleteWithdrawalAccount(userContext, id, req) {
    const accountId = Number(id);
    const account = await domiRepository.findWithdrawalAccountById(accountId);
    if (!account) {
      throw new NotFoundError('Cuenta de retiro no encontrada.');
    }

    const ownerType = userContext.actorType === 'system_user' ? 'system' : userContext.commerceId ? 'commerce' : 'user';
    const ownerId = ownerType === 'system' ? null : ownerType === 'commerce' ? userContext.commerceId : userContext.id;
    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet || wallet.id !== account.wallet_id) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { accountId, action: 'delete_withdrawal_account' },
        'wallet',
        account.wallet_id
      );
      throw new ForbiddenError('No está autorizado para eliminar esta cuenta de retiro.');
    }

    await domiRepository.deleteWithdrawalAccount(accountId);

    await logSecurityEvent(
      userContext.id,
      'DELETE_WITHDRAWAL_ACCOUNT',
      'MEDIUM',
      req,
      { accountId, metodo: account.metodo },
      'wallet',
      wallet.id
    );

    return { success: true };
  }

  async setDefaultWithdrawalAccount(userContext, id, req) {
    const accountId = Number(id);
    const account = await domiRepository.findWithdrawalAccountById(accountId);
    if (!account) {
      throw new NotFoundError('Cuenta de retiro no encontrada.');
    }

    const ownerType = userContext.actorType === 'system_user' ? 'system' : userContext.commerceId ? 'commerce' : 'user';
    const ownerId = ownerType === 'system' ? null : ownerType === 'commerce' ? userContext.commerceId : userContext.id;
    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet || wallet.id !== account.wallet_id) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { accountId, action: 'set_default_withdrawal_account' },
        'wallet',
        account.wallet_id
      );
      throw new ForbiddenError('No está autorizado para modificar esta cuenta de retiro.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      await domiRepository.unsetAllDefaultWithdrawalAccounts(wallet.id, connection);
      await domiRepository.setDefaultWithdrawalAccount(accountId, connection);

      await logSecurityEvent(
        userContext.id,
        'SET_DEFAULT_WITHDRAWAL_ACCOUNT',
        'LOW',
        req,
        { accountId },
        'wallet',
        wallet.id
      );

      await connection.commit();
      connection.release();
      return { success: true };
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  }
}

module.exports = DomiWithdrawalService;
