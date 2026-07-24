const db = require('../../../config/db');
const domiEngine = require('../../../services/domiEngine');
const domiRedis = require('../../../services/domiRedis');
const wallets = require('../../../services/domi-kernel/wallets');
const ledger = require('../../../services/domi-kernel/ledger');
const protocol = require('../../../services/domi-kernel/protocol');
const { BusinessError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { assertWalletAccess } = require('../guards/WalletAccessGuard');

class DomiDebtService {
  constructor(domiService) {
    this.domiService = domiService;
  }

  async getUserDebts(userContext, userId, req = null) {
    await assertWalletAccess(userContext, 'user', userId, 'ver deudas del usuario', req);
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

      const fromWallet = await domiEngine.getUserWallet(conn, userId);
      const balance = parseFloat(fromWallet.balance_custody);
      const amountDomis = parseFloat(debt.amount_domis);

      if (balance < amountDomis) {
        throw new BusinessError(`Saldo insuficiente en el monedero. Disponible: ${balance} DOMI, Requerido: ${amountDomis} DOMI.`);
      }

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

      const systemWallet = await domiEngine.getSystemWallet(conn);
      const refundedServiceFee = parseFloat(debt.refunded_service_fee_domis);
      let netPayout = isSystemBeneficiary ? 0 : amountDomis - refundedServiceFee;
      let sysFee = 0;
      let storeNet = 0;
      let driverNet = 0;

      const rules = await domiEngine.getProtocolRules(conn);
      const token = await domiEngine.getTokenRegistry(conn);
      const protocolSnapshot = { token, rules };
      if (!token || !token.fiat_peg_cop) {
        throw new BusinessError('El peg del token (fiat_peg_cop) no está configurado en el sistema.');
      }
      const fiatPeg = parseFloat(token.fiat_peg_cop);

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

      await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [amountDomis, fromWallet.id]);
      
      if (isSystemBeneficiary) {
        if (storeNet > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [storeNet, storeWallet.id]);
        }
        if (driverNet > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [driverNet, driverWallet.id]);
        }
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
        if (netPayout > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [netPayout, toWallet.id]);
        }
        const totalSystemCredit = parseFloat((refundedServiceFee + sysFee).toFixed(8));
        if (totalSystemCredit > 0) {
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [totalSystemCredit, systemWallet.id]);
        }
      }

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

      await conn.query(
        'UPDATE domi_order_debts SET status = "paid", paid_at = NOW(6) WHERE id = ?',
        [debtId]
      );

      await conn.commit();

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

  async payStoreDebt(userContext, debtId, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [debts] = await conn.query('SELECT * FROM domi_store_debts WHERE id = ? FOR UPDATE', [debtId]);
      if (debts.length === 0) {
        throw new NotFoundError('Deuda de la sede no encontrada.');
      }
      const debt = debts[0];

      if (debt.status !== 'pending') {
        throw new BusinessError('La deuda ya se encuentra pagada o cancelada.', 400);
      }

      await assertWalletAccess(userContext, 'store', debt.store_id, 'pagar deudas de sede', req);

      const storeWallet = await wallets.getStoreWallet(conn, debt.store_id);
      
      const amount = parseFloat(debt.amount_domis);
      if (parseFloat(storeWallet.balance_custody) < amount) {
        throw new BusinessError(`Saldo insuficiente en la billetera de la sede. Disponible: ${storeWallet.balance_custody}, Deuda: ${amount}`, 400);
      }

      let beneficiaryWallet;
      if (debt.beneficiary_type === 'driver') {
        beneficiaryWallet = await wallets.getUserWallet(conn, debt.beneficiary_id);
      } else if (debt.beneficiary_type === 'system') {
        beneficiaryWallet = await wallets.getSystemWallet(conn);
      } else {
        throw new BusinessError('Tipo de beneficiario no soportado.', 400);
      }

      await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [amount, storeWallet.id]);

      if (debt.beneficiary_type === 'driver') {
        await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [amount, beneficiaryWallet.id]);
      } else if (debt.beneficiary_type === 'system') {
        await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [amount, beneficiaryWallet.id]);
      }

      await conn.query('UPDATE domi_store_debts SET status = "paid", paid_at = NOW(6) WHERE id = ?', [debtId]);

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

      await logSecurityEvent(userContext.id, 'DOMI_STORE_DEBT_PAID', 'MEDIUM', req, {
        storeId: debt.store_id,
        debtId: debt.id,
        amountDomis: amount,
        beneficiaryType: debt.beneficiary_type,
        beneficiaryId: debt.beneficiary_id
      });

      await conn.commit();

      // Sincronizar cache de Redis post-commit
      await domiRedis.decrementBalance('store', debt.store_id, amount);
      if (debt.beneficiary_type === 'driver') {
        await domiRedis.incrementBalance('user', debt.beneficiary_id, amount);
      }

      return { success: true, debtId: debt.id, amountPaid: amount };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = DomiDebtService;
