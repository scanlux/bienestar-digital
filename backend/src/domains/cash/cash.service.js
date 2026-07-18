const db = require('../../config/db');
const cashRepository = require('./cash.repository');
const domiEngine = require('../../services/domiEngine');
const domiRedis = require('../../services/domiRedis');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');

class CashService {
  async getCashAndBankSummary(userContext) {
    const cashBalance = await cashRepository.getCashBalance();
    const bankTransitBalance = await cashRepository.getBankTransitBalance();
    return {
      cashBalance,
      bankTransitBalance
    };
  }

  async createCashTransaction(userContext, data, req) {
    const { amountCop, txType, notes, referenceType, referenceId } = data;

    if (!amountCop || parseFloat(amountCop) <= 0) {
      throw new BusinessError('El monto en pesos (COP) debe ser un número positivo.');
    }

    if (!['income', 'expense', 'deposit', 'adjustment'].includes(txType)) {
      throw new BusinessError('Tipo de transacción de caja física inválido.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const currentBalance = await cashRepository.getCashBalance();

      // Validación de sobregiro en caja física
      if (['expense', 'deposit'].includes(txType) || (txType === 'adjustment' && parseFloat(amountCop) < 0)) {
        const absoluteAmount = Math.abs(parseFloat(amountCop));
        if (currentBalance < absoluteAmount) {
          throw new BusinessError(`Saldo insuficiente en caja física. Saldo actual: $${currentBalance.toLocaleString('es-CO')} COP.`);
        }
      }

      const txId = await cashRepository.createCashTransaction(
        parseFloat(amountCop),
        txType,
        notes,
        referenceType,
        referenceId,
        userContext.id,
        connection
      );

      // Determinar evento de seguridad
      let eventType = 'CASH_INFLOW_RECORDED';
      let severity = 'LOW';
      if (txType === 'expense' || txType === 'deposit') {
        eventType = 'CASH_OUTFLOW_RECORDED';
        severity = 'MEDIUM';
      } else if (txType === 'adjustment') {
        eventType = 'CASH_AUDIT_ADJUSTMENT';
        severity = 'HIGH';
      }

      await logSecurityEvent(userContext.id, eventType, severity, req, {
        txId,
        amountCop,
        txType,
        notes
      });

      await connection.commit();
      connection.release();

      return { success: true, message: 'Transacción de caja registrada con éxito.', txId };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async createBankDeposit(userContext, data, req) {
    const { amountCop, destinationWalletId, evidenceUrl, depositDate, notes, isFromCash } = data;

    if (!amountCop || parseFloat(amountCop) <= 0) {
      throw new BusinessError('El monto consignado en pesos (COP) debe ser un número positivo.');
    }

    if (!destinationWalletId) {
      throw new BusinessError('La wallet de destino para los DOMIs es requerida.');
    }

    if (!evidenceUrl) {
      throw new BusinessError('El soporte fotográfico o de comprobante de Bancolombia es requerido.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Si el depósito proviene de la Caja Física (es decir, se sacó efectivo físico para ir a depositar al banco)
      if (isFromCash) {
        const currentCashBalance = await cashRepository.getCashBalance();
        if (currentCashBalance < parseFloat(amountCop)) {
          throw new BusinessError(`Saldo en efectivo de caja física insuficiente para realizar este depósito. Saldo actual: $${currentCashBalance.toLocaleString('es-CO')} COP.`);
        }

        // Registrar el egreso por depósito en la caja física
        await cashRepository.createCashTransaction(
          parseFloat(amountCop),
          'deposit',
          `Consignación en Bancolombia. Destino Wallet ID: ${destinationWalletId}. Notas: ${notes || ''}`,
          'manual',
          null,
          userContext.id,
          connection
        );
      }

      const depositId = await cashRepository.createBankDeposit(
        parseFloat(amountCop),
        destinationWalletId,
        evidenceUrl,
        depositDate || new Date(),
        notes,
        userContext.id
      );

      await logSecurityEvent(userContext.id, 'BANK_DEPOSIT_REGISTERED', 'MEDIUM', req, {
        depositId,
        amountCop,
        destinationWalletId,
        isFromCash
      });

      await connection.commit();
      connection.release();

      return { success: true, message: 'Consignación reportada con éxito y en espera de verificación.', depositId };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async getBankDeposits(userContext, status) {
    return await cashRepository.getBankDeposits(status);
  }

  async getCashTransactions(userContext, limit) {
    return await cashRepository.getCashTransactions(limit);
  }

  async getOperatorHistory(userContext, timeframe) {
    return await cashRepository.getOperatorHistory(userContext.id, timeframe);
  }

  async reconcileBankDeposit(userContext, depositId, data, req) {
    const { action, notes } = data;

    if (action !== 'approve' && action !== 'reject') {
      throw new BusinessError('Acción de conciliación inválida. Debe ser approve o reject.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const deposit = await cashRepository.findBankDepositById(depositId);
      if (!deposit) {
        throw new NotFoundError('Consignación bancaria no encontrada.');
      }
      if (deposit.status !== 'pending') {
        throw new BusinessError('Esta consignación ya fue procesada anteriormente.');
      }

      if (action === 'reject') {
        await cashRepository.updateBankDepositStatus(depositId, 'rejected', userContext.id, notes, connection);
        await logSecurityEvent(userContext.id, 'BANK_DEPOSIT_REJECTED', 'HIGH', req, {
          depositId,
          amount_cop: deposit.amount_cop,
          notes
        });
        await connection.commit();
        connection.release();
        return { success: true, message: 'Consignación rechazada y archivada.' };
      }

      // Aprobación y Acuñación
      const tokenRegistry = await domiEngine.getTokenRegistry(connection);
      const protocolRules = await domiEngine.getProtocolRules(connection);

      const fiatPeg = parseFloat(tokenRegistry?.fiat_peg_cop || 1000);
      const amountDomis = parseFloat((deposit.amount_cop / fiatPeg).toFixed(4));

      // 1. Marcar consignación como confirmada
      await cashRepository.updateBankDepositStatus(depositId, 'confirmed', userContext.id, notes, connection);

      // 2. Incrementar el balance en la wallet correspondiente (Mint)
      await connection.query(
        'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
        [amountDomis, deposit.destination_wallet_id]
      );

      // Obtener la información del dueño de la wallet para actualizar Redis
      const [[wallet]] = await connection.query(
        `SELECT 
           CASE 
             WHEN user_id IS NOT NULL THEN 'user'
             WHEN commerce_id IS NOT NULL THEN 'commerce'
             WHEN store_id IS NOT NULL THEN 'store'
             WHEN delivery_company_id IS NOT NULL THEN 'delivery_company'
             WHEN is_system = 1 THEN 'system'
           END as owner_type,
           COALESCE(user_id, commerce_id, store_id, delivery_company_id) as owner_id
         FROM wallets WHERE id = ?`,
        [deposit.destination_wallet_id]
      );

      // 3. Registrar en el domi_ledger
      const txHash = await domiEngine.appendLedger(connection, {
        txType: 'mint',
        fromWalletId: null,
        toWalletId: deposit.destination_wallet_id,
        amountDomis,
        amountFiatCop: deposit.amount_cop,
        referenceType: 'manual',
        referenceId: deposit.id,
        protocolSnapshot: { token: tokenRegistry, rules: protocolRules },
        notes: notes || `Acuñación autorizada por conciliación de Bancolombia. Ref Depósito: ${deposit.id}`
      });

      await logSecurityEvent(userContext.id, 'BANK_DEPOSIT_RECONCILED', 'HIGH', req, {
        depositId,
        amount_cop: deposit.amount_cop,
        amount_domis: amountDomis,
        txHash,
        notes
      });

      await connection.commit();
      connection.release();

      // Sincronizar en Redis
      if (wallet) {
        await domiRedis.incrementBalance(wallet.owner_type, wallet.owner_id, amountDomis);
      }

      return {
        success: true,
        message: `Consignación aprobada. Se acuñaron ${amountDomis.toLocaleString('es-CO')} DOMIs con éxito.`,
        amountDomis,
        txHash
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }
}

module.exports = new CashService();
