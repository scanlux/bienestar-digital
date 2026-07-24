const db = require('../../../config/db');
const domiRepository = require('../domi.repository');
const domiEngine = require('../../../services/domiEngine');
const domiTreasuryEngine = require('../../../services/domiTreasuryEngine');
const domiRedis = require('../../../services/domiRedis');
const wompiService = require('../../../services/wompiService');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class ProcessWithdrawalRequest {
  async getRequests(userContext, filters = {}) {
    if (userContext.actorType !== 'system_user') {
      throw new ForbiddenError('Acceso denegado: Solo el administrador puede ver solicitudes de retiro.');
    }

    const conn = await db.getConnection();
    try {
      let query = `
        SELECT wr.*, w.tier, 
               CASE
                 WHEN w.is_system = 1 THEN 'system'
                 WHEN st.id IS NOT NULL THEN 'store'
                 WHEN cm.id IS NOT NULL THEN 'commerce'
                 WHEN dc.id IS NOT NULL THEN 'delivery_company'
                 ELSE 'user'
               END as owner_type,
               COALESCE(w.user_id, 0) as owner_id
        FROM domi_withdrawal_requests wr 
        JOIN wallets w ON wr.wallet_id = w.id
        LEFT JOIN stores st ON w.user_id = st.usuario_id
        LEFT JOIN commerces cm ON w.user_id = cm.usuario_id
        LEFT JOIN delivery_companies dc ON w.user_id = dc.usuario_id
      `;
      const params = [];
      
      if (filters.status) {
        query += ' WHERE wr.status = ?';
        params.push(filters.status);
      }
      
      query += ' ORDER BY wr.id DESC';
      const [requests] = await conn.query(query, params);
      return requests;
    } finally {
      conn.release();
    }
  }

  async processRequest(userContext, requestId, data, req) {
    if (userContext.actorType !== 'system_user') {
      throw new ForbiddenError('Acceso denegado: Solo el administrador puede procesar solicitudes de retiro.');
    }

    const { action, notes } = data;
    if (!['approve', 'reject'].includes(action)) {
      throw new BusinessError('Accion no valida. Debe ser approve o reject.', 400);
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [requests] = await conn.query('SELECT * FROM domi_withdrawal_requests WHERE id = ?', [requestId]);
      if (requests.length === 0) {
        throw new NotFoundError(`Solicitud de retiro #${requestId} no encontrada.`);
      }
      const withdrawalReq = requests[0];

      if (withdrawalReq.status !== 'pendiente' && withdrawalReq.status !== 'en_cooldown') {
        throw new BusinessError(`La solicitud de retiro esta en estado '${withdrawalReq.status}' y no se puede procesar.`, 400);
      }

      const [walletRows] = await conn.query(
        `SELECT *, 
                CASE
                  WHEN user_id IS NOT NULL THEN 'user'
                  WHEN commerce_id IS NOT NULL THEN 'commerce'
                  WHEN store_id IS NOT NULL THEN 'store'
                  WHEN delivery_company_id IS NOT NULL THEN 'delivery_company'
                  WHEN is_system = 1 THEN 'system'
                END as owner_type,
                COALESCE(user_id, commerce_id, store_id, delivery_company_id) as owner_id
         FROM wallets WHERE id = ?`,
        [withdrawalReq.wallet_id]
      );
      const wallet = walletRows[0];
      const systemWallet = await domiRepository.findSystemWallet();

      if (action === 'approve') {
        // 1. Validar solvencia antes de procesar el retiro
        const solvency = await domiTreasuryEngine.getTreasuryStatus(conn);
        const solvencyVal = await domiTreasuryEngine.validateSolvencyBeforeWithdrawal(conn, parseFloat(withdrawalReq.amount_domis));
        if (!solvencyVal.ok) {
          throw new BusinessError(solvencyVal.detail, 400);
        }

        let wompiDispersionId = null;
        let wompiFeeCop = null;
        let wompiFeeDomi = null;

        if (withdrawalReq.dispersion_method !== 'efectivo_casa_matriz') {
          // Obtener los detalles de la cuenta de retiro
          const [accountRows] = await conn.query('SELECT * FROM withdrawal_accounts WHERE id = ?', [withdrawalReq.withdrawal_account_id]);
          if (accountRows.length === 0) {
            throw new BusinessError('Cuenta bancaria de retiro no encontrada.', 400);
          }
          const account = accountRows[0];
          if (account.is_verified !== 1) {
            throw new BusinessError('La cuenta bancaria de retiro no está verificada por un administrador.', 400);
          }

          // Calcular el fee de Wompi.
          wompiFeeCop = (account.metodo === 'bancolombia' || account.metodo === 'nequi' || account.metodo === 'daviplata') ? 500.00 : 1500.00;
          wompiFeeDomi = parseFloat((wompiFeeCop / solvency.fiat_peg_cop).toFixed(8));

          // Realizar la dispersión con Wompi (monto neto = amount_cop - fee)
          const amountNetoCop = parseFloat(withdrawalReq.amount_cop) - wompiFeeCop;
          if (amountNetoCop <= 0) {
            throw new BusinessError(`Monto de retiro neto insuficiente tras descontar el fee de Wompi ($${wompiFeeCop} COP).`, 400);
          }

          try {
            const dispersion = await wompiService.triggerDispersion(account, amountNetoCop, withdrawalReq.id);
            if (dispersion.status !== 'APPROVED') {
              throw new BusinessError(`Wompi Dispersiones rechazó la transacción. Estado: ${dispersion.status}`, 400);
            }
            wompiDispersionId = dispersion.transferId;
          } catch (dispError) {
            // Si Wompi falla, registrar fallo y lanzar error sin quemar tokens
            await logSecurityEvent(
              userContext.id,
              'DOMI_WITHDRAWAL_DISPERSION_FAILED',
              'HIGH',
              req,
              { requestId, error: dispError.message }
            );
            throw dispError;
          }
        }

        // 2. Quema definitiva de DOMIs de la wallet de sistema
        await conn.query(
          'UPDATE wallets SET balance_utility = balance_utility - ? WHERE id = ?',
          [parseFloat(withdrawalReq.amount_domis), systemWallet.id]
        );

        // 3. Registrar la quema en el ledger
        const token = await domiRepository.findTokenRegistry();
        const [rules] = await conn.query('SELECT * FROM protocol_rules WHERE id = 1');
        await domiEngine.appendLedger(conn, {
          txType: 'burn_manual',
          fromWalletId: systemWallet.id,
          toWalletId: null,
          amountDomis: parseFloat(withdrawalReq.amount_domis),
          referenceType: 'manual',
          referenceId: withdrawalReq.id,
          protocolSnapshot: { token, rules: rules[0] },
          notes: `Quema definitiva por aprobacion de retiro fiduciario #${withdrawalReq.id}. Ratio post-retiro: ${solvencyVal.ratio_post_retiro.toFixed(2)}%`
        });

        // 4. Actualizar estado de la solicitud
        await conn.query(
          `UPDATE domi_withdrawal_requests SET 
            status = "completado", 
            approved_by = ?, 
            processed_at = NOW(),
            wompi_dispersion_id = ?,
            wompi_fee_cop = ?,
            wompi_fee_domi = ?
           WHERE id = ?`,
          [userContext.id, wompiDispersionId, wompiFeeCop, wompiFeeDomi, requestId]
        );

        // 5. Registrar evento de seguridad de auditoría
        await logSecurityEvent(
          userContext.id,
          'DOMI_WITHDRAWAL_APPROVED',
          'HIGH',
          req,
          { requestId, amountDomis: withdrawalReq.amount_domis, postCollateralRatio: solvencyVal.ratio_post_retiro }
        );
      } else {
        // Rechazar retiro: reversar tokens y comision de vuelta al balance del usuario
        const totalRefund = parseFloat(withdrawalReq.amount_domis) + parseFloat(withdrawalReq.exit_fee_domis);

        await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [totalRefund, withdrawalReq.wallet_id]);
        await conn.query('UPDATE wallets SET balance_utility = balance_utility - ? WHERE id = ?', [totalRefund, systemWallet.id]);

        // Registrar devolucion en el ledger
        const token = await domiRepository.findTokenRegistry();
        const [rules] = await conn.query('SELECT * FROM protocol_rules WHERE id = 1');
        await domiEngine.appendLedger(conn, {
          txType: 'refund',
          fromWalletId: systemWallet.id,
          toWalletId: withdrawalReq.wallet_id,
          amountDomis: totalRefund,
          referenceType: 'manual',
          referenceId: withdrawalReq.id,
          protocolSnapshot: { token, rules: rules[0] },
          notes: `Reversion por rechazo de solicitud de retiro #${withdrawalReq.id}. Notas: ${notes || ''}`
        });

        // Actualizar solicitud
        await conn.query(
          'UPDATE domi_withdrawal_requests SET status = "rechazado", approved_by = ?, processed_at = NOW() WHERE id = ?',
          [userContext.id, requestId]
        );

        // Registrar evento de seguridad de auditoría
        await logSecurityEvent(
          userContext.id,
          'DOMI_WITHDRAWAL_REJECTED',
          'MEDIUM',
          req,
          { requestId, amountDomis: withdrawalReq.amount_domis, reason: notes }
        );

      }

      await conn.commit();

      // Sincronizar cache de Redis post-commit
      if (action === 'approve') {
        await domiRedis.decrementBalance('system', null, parseFloat(withdrawalReq.amount_domis));
      } else {
        const ownerType = wallet.owner_type;
        const ownerId = wallet.owner_id;
        const totalRefund = parseFloat(withdrawalReq.amount_domis) + parseFloat(withdrawalReq.exit_fee_domis);
        await domiRedis.incrementBalance(ownerType, ownerId, totalRefund);
        await domiRedis.decrementBalance('system', null, totalRefund);
      }

      return { success: true, requestId, action };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new ProcessWithdrawalRequest();
