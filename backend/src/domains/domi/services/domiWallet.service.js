const crypto = require('crypto');
const db = require('../../../config/db');
const domiRepository = require('../domi.repository');
const { BusinessError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { assertWalletAccess } = require('../guards/WalletAccessGuard');
const resolveWalletOwner = require('../helpers/resolveWalletOwner');

const CreateWompiCheckout = require('../use-cases/CreateWompiCheckout');
const ProcessWompiWebhook = require('../use-cases/ProcessWompiWebhook');
const TransferDomis = require('../use-cases/TransferDomis');
const MintDomis = require('../use-cases/MintDomis');
const BurnDomisManual = require('../use-cases/BurnDomisManual');
const ManageWalletAlias = require('../use-cases/ManageWalletAlias');

class DomiWalletService {
  constructor(domiService) {
    this.domiService = domiService;
  }

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
    if (!ownerType || ownerType === 'my' || !ownerId || ownerId === 'my') {
      const resolved = resolveWalletOwner(userContext);
      ownerType = resolved.ownerType;
      ownerId = resolved.ownerId;
    }
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

  async mintDomis(userContext, data) {
    return await MintDomis.execute(userContext, data);
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
    if (!ownerType || ownerType === 'my' || !ownerId || ownerId === 'my') {
      const resolved = resolveWalletOwner(userContext);
      ownerType = resolved.ownerType;
      ownerId = resolved.ownerId;
    }
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

  async getWalletAliases(userContext, ownerType, ownerId, req) {
    if (!ownerType || ownerType === 'my' || !ownerId || ownerId === 'my') {
      const resolved = resolveWalletOwner(userContext);
      ownerType = resolved.ownerType;
      ownerId = resolved.ownerId;
    }
    return await ManageWalletAlias.getAliases(userContext, ownerType, ownerId, req);
  }

  async createWalletAlias(userContext, ownerType, ownerId, alias, req) {
    if (!ownerType || ownerType === 'my' || !ownerId || ownerId === 'my') {
      const resolved = resolveWalletOwner(userContext);
      ownerType = resolved.ownerType;
      ownerId = resolved.ownerId;
    }
    return await ManageWalletAlias.createAlias(userContext, ownerType, ownerId, alias, req);
  }

  async deleteWalletAlias(userContext, ownerType, ownerId, aliasId, req) {
    if (!ownerType || ownerType === 'my' || !ownerId || ownerId === 'my') {
      const resolved = resolveWalletOwner(userContext);
      ownerType = resolved.ownerType;
      ownerId = resolved.ownerId;
    }
    return await ManageWalletAlias.deleteAlias(userContext, ownerType, ownerId, aliasId, req);
  }

  async checkAliasAvailability(alias) {
    return await ManageWalletAlias.checkAvailability(alias);
  }

  async suggestWalletAlias(userContext, ownerType, ownerId) {
    return await ManageWalletAlias.suggestAlias(userContext, ownerType, ownerId);
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
        
        if (i > 0 && tx.prev_tx_hash !== prevTxHash) {
          issues.push({
            txId: tx.id,
            error: `Discrepancia en cadena forense. Esperado prev_tx_hash: ${prevTxHash}, Encontrado: ${tx.prev_tx_hash}`
          });
        }

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

  async getLedger(userContext, queryFilters, req) {
    await logSecurityEvent(userContext.id, 'VIEW_LEDGER_AUDIT', 'LOW', req, {
      actorType: userContext.actorType,
      filters: queryFilters
    });
    return await domiRepository.findLedgerEntries(queryFilters);
  }

  async getPackages(userContext, storeId, req) {
    await assertWalletAccess(userContext, 'store', storeId, 'ver historial de paquetes', req);
    return await domiRepository.findDomiPackagesByStoreId(storeId);
  }
}

module.exports = DomiWalletService;
