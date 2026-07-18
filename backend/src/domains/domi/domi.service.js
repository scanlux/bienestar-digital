const crypto = require('crypto');
const db = require('../../config/db');
const domiRepository = require('./domi.repository');
const domiEngine = require('../../services/domiEngine');
const domiTreasuryEngine = require('../../services/domiTreasuryEngine');
const { BusinessError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const { assertWalletAccess } = require('./guards/WalletAccessGuard');
const domiRedis = require('../../services/domiRedis');
const wallets = require('../../services/domi-kernel/wallets');
const ledger = require('../../services/domi-kernel/ledger');
const protocol = require('../../services/domi-kernel/protocol');

// Use Cases
const CreateWompiCheckout = require('./use-cases/CreateWompiCheckout');
const ProcessWompiWebhook = require('./use-cases/ProcessWompiWebhook');
const TransferDomis = require('./use-cases/TransferDomis');
const MintDomis = require('./use-cases/MintDomis');
const BurnDomisManual = require('./use-cases/BurnDomisManual');
const ProcessWithdrawalRequest = require('./use-cases/ProcessWithdrawalRequest');
const DeclareReserve = require('./use-cases/DeclareReserve');
const ApplyPegAdjustment = require('./use-cases/ApplyPegAdjustment');
const ManageWalletAlias = require('./use-cases/ManageWalletAlias');

class DomiService {
  async getWalletDirect(ownerType, ownerId) {
    if (ownerType === 'system') {
      return await domiRepository.findSystemWallet();
    }
    const wallet = await domiRepository.findWallet(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError(`Billetera de tipo ${ownerType} (id: ${ownerId}) no encontrada en DB.`);
    }
    return wallet;
  }

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

  async calculateOrderCost(totalCop, distanceKm) {
    if (!totalCop || totalCop <= 0) {
      throw new BusinessError('totalCop es requerido y debe ser positivo');
    }
    return await domiEngine.calculateOrderCost(totalCop, distanceKm);
  }

  async getSystemWallet(userContext, req) {
    await logSecurityEvent(userContext.id, 'VIEW_SYSTEM_WALLET_AUDIT', 'LOW', req, {
      actorType: userContext.actorType
    });
    const wallet = await domiRepository.findSystemWallet();
    if (!wallet) {
      throw new BusinessError('Billetera del sistema no encontrada', 500);
    }
    const totalCustodyConsolidated = await domiRepository.calculateTotalCustodyBalance();
    const custodyBreakdown = await domiRepository.calculateCustodyBreakdown();
    return {
      ...wallet,
      total_custody_consolidated: totalCustodyConsolidated,
      custody_breakdown: custodyBreakdown
    };
  }

  async getWallet(userContext, ownerType, ownerId, req) {
    await assertWalletAccess(userContext, ownerType, ownerId, 'ver billetera', req);

    const wallet = await this.getWalletDirect(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError('Billetera no encontrada');
    }

    if (ownerType === 'user') {
      const [[userRows]] = await db.query('SELECT domi_score FROM users WHERE id = ?', [ownerId]);
      wallet.domi_score = userRows ? userRows.domi_score : 0;
      
      const [debtRows] = await db.query(
        'SELECT * FROM domi_order_debts WHERE customer_user_id = ? AND status = "pending"',
        [ownerId]
      );
      wallet.pending_debts = debtRows;

      const [refundRows] = await db.query(
        'SELECT * FROM domi_order_debts WHERE beneficiary_type = "driver" AND beneficiary_id = ? AND status = "pending"',
        [ownerId]
      );
      wallet.contingent_refunds = refundRows;
    } else if (ownerType === 'store' || ownerType === 'commerce') {
      let storeIds = [];
      if (ownerType === 'store') {
        storeIds = [parseInt(ownerId)];
      } else {
        const [stores] = await db.query('SELECT id FROM stores WHERE commerce_id = ?', [ownerId]);
        storeIds = stores.map(s => s.id);
      }

      if (storeIds.length > 0) {
        const [debtRows] = await db.query(
          'SELECT * FROM domi_store_debts WHERE store_id IN (?) AND status = "pending"',
          [storeIds]
        );
        wallet.pending_debts = debtRows;

        const [refundRows] = await db.query(
          'SELECT * FROM domi_order_debts WHERE beneficiary_type = "store" AND beneficiary_id IN (?) AND status = "pending"',
          [storeIds]
        );
        wallet.contingent_refunds = refundRows;
      } else {
        wallet.pending_debts = [];
        wallet.contingent_refunds = [];
      }
    } else {
      wallet.pending_debts = [];
      wallet.contingent_refunds = [];
    }

    return wallet;
  }

  async payStoreDebt(userContext, debtId, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Obtener la deuda
      const [debts] = await conn.query('SELECT * FROM domi_store_debts WHERE id = ? FOR UPDATE', [debtId]);
      if (debts.length === 0) {
        throw new NotFoundError('Deuda de la sede no encontrada.');
      }
      const debt = debts[0];

      if (debt.status !== 'pending') {
        throw new BusinessError('La deuda ya se encuentra pagada o cancelada.', 400);
      }

      // 2. Validar acceso del usuario a la billetera de la tienda
      await assertWalletAccess(userContext, 'store', debt.store_id, 'pagar deudas de sede', req);

      // 3. Obtener billetera de la tienda
      const storeWallet = await wallets.getStoreWallet(conn, debt.store_id);
      
      // Validar saldo suficiente
      const amount = parseFloat(debt.amount_domis);
      if (parseFloat(storeWallet.balance_custody) < amount) {
        throw new BusinessError(`Saldo insuficiente en la billetera de la sede. Disponible: ${storeWallet.balance_custody}, Deuda: ${amount}`, 400);
      }

      // 4. Obtener billetera del beneficiario
      let beneficiaryWallet;
      if (debt.beneficiary_type === 'driver') {
        beneficiaryWallet = await wallets.getUserWallet(conn, debt.beneficiary_id);
      } else if (debt.beneficiary_type === 'system') {
        beneficiaryWallet = await wallets.getSystemWallet(conn);
      } else {
        throw new BusinessError('Tipo de beneficiario no soportado.', 400);
      }

      // 5. Mover dinero
      // Restar a la tienda
      await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [amount, storeWallet.id]);
      await domiRedis.decrementBalance('store', debt.store_id, amount);

      // Sumar al beneficiario
      if (debt.beneficiary_type === 'driver') {
        await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [amount, beneficiaryWallet.id]);
        await domiRedis.incrementBalance('user', debt.beneficiary_id, amount);
      } else if (debt.beneficiary_type === 'system') {
        await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [amount, beneficiaryWallet.id]);
      }

      // 6. Actualizar estado de la deuda
      await conn.query('UPDATE domi_store_debts SET status = "paid", paid_at = NOW(6) WHERE id = ?', [debtId]);

      // 7. Ledger
      const rules = await protocol.getProtocolRules(conn);
      const token = await protocol.getTokenRegistry(conn);

      await ledger.appendLedger(conn, {
        txType: 'transfer', 
        fromWalletId: storeWallet.id, 
        toWalletId: beneficiaryWallet.id,
        amountDomis: amount, 
        referenceType: 'order', 
        referenceId: debt.order_id,
        protocolSnapshot: { token, rules }, 
        notes: `Liquidacion de compensacion por tienda. Deuda #${debt.id}`
      });

      // 8. Log de seguridad
      await logSecurityEvent(userContext.id, 'DOMI_STORE_DEBT_PAID', 'MEDIUM', req, {
        storeId: debt.store_id,
        debtId: debt.id,
        amountDomis: amount,
        beneficiaryType: debt.beneficiary_type,
        beneficiaryId: debt.beneficiary_id
      });

      await conn.commit();
      return { success: true, debtId: debt.id, amountPaid: amount };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async mintDomis(userContext, data) {
    return await MintDomis.execute(userContext, data);
  }

  async getPackages(userContext, storeId, req) {
    await assertWalletAccess(userContext, 'store', storeId, 'ver historial de paquetes', req);
    return await domiRepository.findDomiPackagesByStoreId(storeId);
  }

  async getLedger(userContext, queryFilters, req) {
    await logSecurityEvent(userContext.id, 'VIEW_LEDGER_AUDIT', 'LOW', req, {
      actorType: userContext.actorType,
      filters: queryFilters
    });
    return await domiRepository.findLedgerEntries(queryFilters);
  }

  async topupStore(userContext, storeId, bodyData, req) {
    return await MintDomis.topupStore(userContext, storeId, bodyData, req);
  }

  async createCheckoutSession(userContext, data, req) {
    return await CreateWompiCheckout.execute(userContext, data, req);
  }

  async wompiWebhook(body, req) {
    return await ProcessWompiWebhook.execute(body, req);
  }

  async transferDomis(userContext, data, req) {
    return await TransferDomis.execute(userContext, data, req);
  }

  async getWalletHistory(userContext, ownerType, ownerId, req) {
    await assertWalletAccess(userContext, ownerType, ownerId, 'ver historial de billetera', req);

    const wallet = await this.getWalletDirect(ownerType, ownerId);
    if (!wallet) {
      throw new NotFoundError('Billetera no encontrada.');
    }

    return await domiRepository.findWalletLedgerEntries(wallet.id, req.query.limit || 50);
  }

  async mintManual(userContext, data, req) {
    return await MintDomis.mintManual(userContext, data, req);
  }

  async burnManual(userContext, data, req) {
    return await BurnDomisManual.execute(userContext, data, req);
  }

  // --- SERVICIOS DE ALIAS DE WALLET ("BRE-B") ---
  async getWalletAliases(userContext, ownerType, ownerId, req) {
    return await ManageWalletAlias.getAliases(userContext, ownerType, ownerId, req);
  }

  async createWalletAlias(userContext, ownerType, ownerId, alias, req) {
    return await ManageWalletAlias.createAlias(userContext, ownerType, ownerId, alias, req);
  }

  async deleteWalletAlias(userContext, ownerType, ownerId, aliasId, req) {
    return await ManageWalletAlias.deleteAlias(userContext, ownerType, ownerId, aliasId, req);
  }

  async checkAliasAvailability(alias) {
    return await ManageWalletAlias.checkAvailability(alias);
  }

  async suggestWalletAlias(userContext, ownerType, ownerId) {
    return await ManageWalletAlias.suggestAlias(userContext, ownerType, ownerId);
  }

  // --- SERVICIOS ADMINISTRATIVOS Y DE CONTROL ---
  async getPricingStatus() {
    const conn = await db.getConnection();
    try {
      return await domiTreasuryEngine.getTreasuryStatus(conn);
    } finally {
      conn.release();
    }
  }

  async getPricingHistory() {
    const conn = await db.getConnection();
    try {
      const [history] = await conn.query('SELECT * FROM domi_peg_history ORDER BY id DESC LIMIT 100');
      return history;
    } finally {
      conn.release();
    }
  }

  async getRevenueBreakdown(userContext, from, to) {
    const conn = await db.getConnection();
    try {
      return await domiTreasuryEngine.getRevenueBreakdown(conn, from, to);
    } finally {
      conn.release();
    }
  }

  async getDailyBurnStats(userContext, days) {
    const conn = await db.getConnection();
    try {
      return await domiTreasuryEngine.getDailyBurnStats(conn, parseInt(days || 30, 10));
    } finally {
      conn.release();
    }
  }

  async proposeYieldAdjustment(userContext, data) {
    const { certifiedYieldCop, investedPeriodDays } = data;
    if (certifiedYieldCop === undefined || certifiedYieldCop < 0) {
      throw new BusinessError('certifiedYieldCop es requerido y debe ser mayor o igual a cero.');
    }
    if (!investedPeriodDays || investedPeriodDays <= 0) {
      throw new BusinessError('investedPeriodDays es requerido y debe ser positivo.');
    }
    const conn = await db.getConnection();
    try {
      return await domiTreasuryEngine.evaluateYieldAdjustment(conn, parseFloat(certifiedYieldCop), parseInt(investedPeriodDays, 10));
    } finally {
      conn.release();
    }
  }

  async applyNewPeg(userContext, data, req) {
    return await ApplyPegAdjustment.applyNewPeg(userContext, data, req);
  }

  async applyYieldAdjustment(userContext, data, req) {
    return await ApplyPegAdjustment.applyYieldAdjustment(userContext, data, req);
  }

  async getTierRules() {
    const conn = await db.getConnection();
    try {
      const [rules] = await conn.query('SELECT * FROM domi_tier_rules');
      return rules;
    } finally {
      conn.release();
    }
  }

  async updateTierRules(userContext, tier, data) {
    const {
      max_balance_domi,
      large_withdrawal_threshold_domi,
      cooldown_days,
      free_withdrawals_per_month,
      withdrawal_fee_cop,
      daily_withdrawal_limit_cop
    } = data;

    const conn = await db.getConnection();
    try {
      await conn.query(`
        UPDATE domi_tier_rules 
        SET max_balance_domi = ?, 
            large_withdrawal_threshold_domi = ?, 
            cooldown_days = ?, 
            free_withdrawals_per_month = ?, 
            withdrawal_fee_cop = ?, 
            daily_withdrawal_limit_cop = ?
        WHERE tier = ?
      `, [
        max_balance_domi,
        large_withdrawal_threshold_domi,
        cooldown_days,
        free_withdrawals_per_month,
        withdrawal_fee_cop,
        daily_withdrawal_limit_cop,
        tier
      ]);
      return { success: true, tier };
    } finally {
      conn.release();
    }
  }

  async verifyLedgerChain(walletId) {
    const conn = await db.getConnection();
    try {
      const [txs] = await conn.query(
        'SELECT * FROM domi_ledger WHERE from_wallet_id = ? OR to_wallet_id = ? ORDER BY id ASC',
        [walletId, walletId]
      );

      let prevTxHash = null;
      const issues = [];

      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        
        // 1. Validar prev_tx_hash en cadena
        if (i > 0 && tx.prev_tx_hash !== prevTxHash) {
          issues.push({
            txId: tx.id,
            error: `Discrepancia en cadena forense. Esperado prev_tx_hash: ${prevTxHash}, Encontrado: ${tx.prev_tx_hash}`
          });
        }

        // 2. Reconstruir payload y verificar integridad del hash
        const payload = `${tx.tx_type}|${tx.from_wallet_id || 'null'}|${tx.to_wallet_id || 'null'}|${parseFloat(tx.amount_domis)}|${tx.reference_id}|${tx.nonce}`;
        const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');

        if (tx.tx_hash !== calculatedHash) {
          issues.push({
            txId: tx.id,
            error: `Hash corrupto o modificado. Calculado: ${calculatedHash}, Almacenado: ${tx.tx_hash}`
          });
        }

        prevTxHash = tx.tx_hash;
      }

      return {
        walletId,
        checkedTransactionsCount: txs.length,
        isValid: issues.length === 0,
        issues
      };
    } finally {
      conn.release();
    }
  }

  async getWithdrawalRequests(userContext, filters = {}) {
    return await ProcessWithdrawalRequest.getRequests(userContext, filters);
  }

  async processWithdrawalRequest(userContext, requestId, data, req) {
    return await ProcessWithdrawalRequest.processRequest(userContext, requestId, data, req);
  }

  async approveExcessPurchase(userContext, data) {
    const { walletId } = data;
    const conn = await db.getConnection();
    try {
      await conn.query('UPDATE wallets SET excess_purchase_approved = 1 WHERE id = ?', [walletId]);
      return { success: true, walletId };
    } finally {
      conn.release();
    }
  }

  async mintCash(userContext, data, req) {
    return await MintDomis.mintCash(userContext, data, req);
  }

  async confirmCashMint(userContext, packageId, req) {
    return await MintDomis.confirmCashMint(userContext, packageId, req);
  }

  async declareReserve(userContext, data, req) {
    return await DeclareReserve.execute(userContext, data, req);
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

    // BOLA Check: validar que la billetera de la cuenta pertenece al usuario/comercio
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

    // BOLA Check
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

  async getUserDebts(userId) {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.query(
        'SELECT * FROM domi_order_debts WHERE customer_user_id = ? ORDER BY id DESC',
        [userId]
      );
      return rows;
    } finally {
      conn.release();
    }
  }

  async payDebt(userId, debtId, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Obtener la deuda y bloquear la fila para update
      const [debts] = await conn.query(
        'SELECT * FROM domi_order_debts WHERE id = ? AND customer_user_id = ? FOR UPDATE',
        [debtId, userId]
      );

      if (debts.length === 0) {
        throw new NotFoundError('Deuda no encontrada.');
      }

      const debt = debts[0];
      if (debt.status !== 'pending') {
        throw new BusinessError('La deuda ya no está pendiente o ya fue pagada.');
      }

      // 2. Obtener wallet del cliente
      const fromWallet = await domiEngine.getUserWallet(conn, userId);
      const balance = parseFloat(fromWallet.balance_custody);
      const amountDomis = parseFloat(debt.amount_domis);

      if (balance < amountDomis) {
        throw new BusinessError(`Saldo insuficiente en el monedero. Disponible: ${balance} DOMI, Requerido: ${amountDomis} DOMI.`);
      }

      // 3. Obtener wallet del beneficiario
      let toWallet;
      let storeWallet;
      let driverWallet;
      const isSystemBeneficiary = debt.beneficiary_type === 'system';
      let metadata = null;

      if (isSystemBeneficiary && debt.metadata_json) {
        metadata = typeof debt.metadata_json === 'string' ? JSON.parse(debt.metadata_json) : debt.metadata_json;
        storeWallet = await domiEngine.getStoreWallet(conn, metadata.store_id);
        if (metadata.driver_owner_type === 'delivery_company') {
          driverWallet = await domiEngine.getDeliveryCompanyWallet(conn, metadata.driver_owner_id);
        } else {
          driverWallet = await domiEngine.getUserWallet(conn, metadata.driver_owner_id);
        }
      } else {
        if (debt.beneficiary_type === 'store') {
          toWallet = await domiEngine.getStoreWallet(conn, debt.beneficiary_id);
        } else if (debt.beneficiary_type === 'driver') {
          toWallet = await domiEngine.getUserWallet(conn, debt.beneficiary_id);
        } else {
          throw new Error('Tipo de beneficiario inválido en la deuda.');
        }
      }

      // 4. Obtener wallet del sistema para depositar la comisión recuperada
      const systemWallet = await domiEngine.getSystemWallet(conn);

      // 5. Calcular los valores
      const refundedServiceFee = parseFloat(debt.refunded_service_fee_domis);
      let netPayout = isSystemBeneficiary ? 0 : amountDomis - refundedServiceFee;
      let sysFee = 0;
      let storeNet = 0;
      let driverNet = 0;

      // 6. Obtener reglas y token para snapshot de ledger
      const rules = await domiEngine.getProtocolRules(conn);
      const token = await domiEngine.getTokenRegistry(conn);
      const protocolSnapshot = { token, rules };
      const fiatPeg = parseFloat(token.fiat_peg_cop || 1000.00);

      // Cargar el pedido relacionado para verificar si es cancelación COD
      const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [debt.order_id]);
      const order = orders[0];

      const isCodCancel = order && order.payment_method_customer === 'cash_cod';

      if (isSystemBeneficiary) {
        const sysFeeRate = parseFloat(rules.platform_processing_fee_rate || 0.004);
        const storeAdvanceRemaining = parseFloat(metadata.storeAdvanceRemaining || 0);
        const driverAdvanceRemaining = parseFloat(metadata.driverAdvanceRemaining || 0);
        const totalAdvanceRemaining = parseFloat((storeAdvanceRemaining + driverAdvanceRemaining).toFixed(8));

        const netDistributable = parseFloat((amountDomis - totalAdvanceRemaining).toFixed(8));
        sysFee = parseFloat((netDistributable * sysFeeRate).toFixed(8));
        const netAfterFee = parseFloat((netDistributable - sysFee).toFixed(8));

        const storeShare = parseFloat(metadata.storeShare || 0);
        const deliveryShare = parseFloat(metadata.deliveryShare || 0);
        const totalShares = storeShare + deliveryShare;

        if (totalShares > 0) {
          storeNet = parseFloat((netAfterFee * (storeShare / totalShares)).toFixed(8));
          driverNet = parseFloat((netAfterFee - storeNet).toFixed(8));
        }
      } else if (isCodCancel) {
        const sysFeeRate = parseFloat(rules.platform_processing_fee_rate || 0.004);
        sysFee = parseFloat((amountDomis * sysFeeRate).toFixed(8));
        netPayout = parseFloat((amountDomis - sysFee - refundedServiceFee).toFixed(8));
        if (netPayout < 0) netPayout = 0;
      }

      // 7. Modificar balances de wallets
      // Descontar la deuda completa al cliente
      await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [amountDomis, fromWallet.id]);
      
      if (isSystemBeneficiary) {
        // Depositar el pago neto a la sede
        if (storeNet > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [storeNet, storeWallet.id]);
        }
        // Depositar el pago neto al repartidor/empresa
        if (driverNet > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [driverNet, driverWallet.id]);
        }
        // Depositar la comisión recuperada (en balance_utility) y la tasa de procesamiento (en balance_custody) en la wallet del sistema
        const storeAdvanceRemaining = parseFloat(metadata.storeAdvanceRemaining || 0);
        const driverAdvanceRemaining = parseFloat(metadata.driverAdvanceRemaining || 0);
        const totalAdvanceRemaining = parseFloat((storeAdvanceRemaining + driverAdvanceRemaining).toFixed(8));

        if (totalAdvanceRemaining > 0) {
          await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [totalAdvanceRemaining, systemWallet.id]);
        }
        if (sysFee > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [sysFee, systemWallet.id]);
        }
      } else {
        // Depositar el pago neto al beneficiario
        if (netPayout > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [netPayout, toWallet.id]);
        }
        // Depositar la comisión recuperada y la tasa de procesamiento en la wallet del sistema
        const totalSystemCredit = parseFloat((refundedServiceFee + sysFee).toFixed(8));
        if (totalSystemCredit > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [totalSystemCredit, systemWallet.id]);
        }
      }

      // 8. Escribir transacciones en domi_ledger
      let notes = `Pago de deuda ID #${debt.id} por cancelación de pedido #${debt.order_id}`;
      let txHashUser;

      if (isSystemBeneficiary) {
        notes += ` (Tasa admin: ${sysFee} DOMI, Anticipos recuperados: ${(metadata.storeAdvanceRemaining + metadata.driverAdvanceRemaining)} DOMI)`;
        
        txHashUser = await domiEngine.appendLedger(conn, {
          txType: 'transfer',
          fromWalletId: fromWallet.id,
          toWalletId: systemWallet.id,
          amountDomis: amountDomis,
          amountFiatCop: amountDomis * fiatPeg,
          referenceType: 'order',
          referenceId: debt.order_id,
          protocolSnapshot,
          notes
        });

        if (storeNet > 0) {
          await domiEngine.appendLedger(conn, {
            txType: 'transfer',
            fromWalletId: systemWallet.id,
            toWalletId: storeWallet.id,
            amountDomis: storeNet,
            amountFiatCop: storeNet * fiatPeg,
            referenceType: 'order',
            referenceId: debt.order_id,
            protocolSnapshot,
            notes: `Pago neto a sede por productos tras pago de deuda unificada #${debt.id}`
          });
        }

        if (driverNet > 0) {
          await domiEngine.appendLedger(conn, {
            txType: 'transfer',
            fromWalletId: systemWallet.id,
            toWalletId: driverWallet.id,
            amountDomis: driverNet,
            amountFiatCop: driverNet * fiatPeg,
            referenceType: 'order',
            referenceId: debt.order_id,
            protocolSnapshot,
            notes: `Pago neto a repartidor por envío tras pago de deuda unificada #${debt.id}`
          });
        }
      } else {
        if (isCodCancel) {
          notes += ` (Tasa admin: ${sysFee} DOMI, Anticipo recuperado: ${refundedServiceFee} DOMI)`;
        }
        txHashUser = await domiEngine.appendLedger(conn, {
          txType: 'transfer',
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          amountDomis,
          amountFiatCop: amountDomis * fiatPeg,
          referenceType: 'order',
          referenceId: debt.order_id,
          protocolSnapshot,
          notes
        });
      }

      // 9. Actualizar el estado de la deuda
      await conn.query(
        'UPDATE domi_order_debts SET status = "paid", paid_at = NOW(6) WHERE id = ?',
        [debtId]
      );

      await conn.commit();

      // 10. Sincronizar Redis cache
      await domiRedis.decrementBalance('user', userId, amountDomis);
      if (isSystemBeneficiary) {
        if (storeNet > 0) {
          await domiRedis.incrementBalance('store', metadata.store_id, storeNet);
        }
        if (driverNet > 0) {
          await domiRedis.incrementBalance(metadata.driver_owner_type, metadata.driver_owner_id, driverNet);
        }
      } else {
        if (netPayout > 0) {
          await domiRedis.incrementBalance(debt.beneficiary_type, debt.beneficiary_id, netPayout);
        }
      }

      // 11. Logear evento de seguridad
      const securityDetails = {
        debtId,
        orderId: debt.order_id,
        amountDomis,
        isSystemBeneficiary,
        txHash: txHashUser
      };
      if (isSystemBeneficiary) {
        securityDetails.storeNet = storeNet;
        securityDetails.driverNet = driverNet;
        securityDetails.sysFee = sysFee;
        securityDetails.advanceRecovered = metadata.storeAdvanceRemaining + metadata.driverAdvanceRemaining;
      } else {
        securityDetails.netPayout = netPayout;
        securityDetails.refundedServiceFee = refundedServiceFee;
      }
      await logSecurityEvent(userId, 'DOMI_DEBT_PAID', 'MEDIUM', req, securityDetails);

      return {
        success: true,
        debtId,
        amountDomis,
        paidAt: new Date()
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new DomiService();
