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
    const { amountCop, destinationWalletId, evidenceUrl, depositDate, notes, isFromCash, vaultTxIds } = data;

    if (!amountCop || parseFloat(amountCop) <= 0) {
      throw new BusinessError('El monto consignado en pesos (COP) debe ser un número positivo.');
    }

    if (!evidenceUrl) {
      throw new BusinessError('El soporte fotográfico o de comprobante de Bancolombia es requerido.');
    }

    if (isFromCash && (!vaultTxIds || !Array.isArray(vaultTxIds) || vaultTxIds.length === 0)) {
      throw new BusinessError('Se deben especificar las transacciones de caja física asociadas (vaultTxIds) cuando el depósito proviene de caja.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      let depositSource = 'direct';
      const isVaultDeposit = (vaultTxIds && Array.isArray(vaultTxIds) && vaultTxIds.length > 0);

      // Si es depósito desde caja física (depósito consolidado)
      if (isVaultDeposit) {
        depositSource = 'vault';
        const currentCashBalance = await cashRepository.getCashBalance();
        if (currentCashBalance < parseFloat(amountCop)) {
          throw new BusinessError(`Saldo en efectivo de caja física insuficiente para realizar este depósito. Saldo actual: $${currentCashBalance.toLocaleString('es-CO')} COP.`);
        }

        // Validar transacciones de caja
        const [transactions] = await connection.query(
          'SELECT id, amount_cop, tx_type, reference_type, bank_deposit_id FROM cash_vault_transactions WHERE id IN (?)',
          [vaultTxIds]
        );

        if (transactions.length !== vaultTxIds.length) {
          throw new NotFoundError('Una o más transacciones de caja especificadas no existen.');
        }

        let calculatedSum = 0;
        for (const tx of transactions) {
          if (tx.tx_type !== 'income' || tx.reference_type !== 'cash_mint') {
            throw new BusinessError(`La transacción de caja #${tx.id} no es de tipo ingreso por acuñación de efectivo.`);
          }
          if (tx.bank_deposit_id !== null) {
            throw new BusinessError(`La transacción de caja #${tx.id} ya se encuentra vinculada a otro depósito bancario.`);
          }
          calculatedSum += parseFloat(tx.amount_cop);
        }

        if (Math.abs(calculatedSum - parseFloat(amountCop)) > 0.01) {
          throw new BusinessError(`El monto del depósito ($${parseFloat(amountCop).toLocaleString('es-CO')} COP) no coincide con la suma de las transacciones seleccionadas ($${calculatedSum.toLocaleString('es-CO')} COP).`);
        }

        // Registrar el egreso por depósito en la caja física
        await cashRepository.createCashTransaction(
          parseFloat(amountCop),
          'deposit',
          `Consignación consolidada en Bancolombia. IDs caja: ${vaultTxIds.join(', ')}. Notas: ${notes || ''}`,
          'manual',
          null,
          userContext.id,
          connection
        );
      }

      // Crear el depósito bancario
      const depositId = await cashRepository.createBankDeposit(
        parseFloat(amountCop),
        destinationWalletId || null,
        evidenceUrl,
        depositDate || new Date(),
        notes,
        userContext.id,
        depositSource,
        connection
      );

      // Si es consolidado de caja física, vincular las transacciones de caja al depósito
      if (vaultTxIds && Array.isArray(vaultTxIds) && vaultTxIds.length > 0) {
        await connection.query(
          'UPDATE cash_vault_transactions SET bank_deposit_id = ? WHERE id IN (?)',
          [depositId, vaultTxIds]
        );
      }

      await logSecurityEvent(userContext.id, 'BANK_DEPOSIT_REGISTERED', 'MEDIUM', req, {
        depositId,
        amountCop,
        destinationWalletId: destinationWalletId || null,
        depositSource,
        vaultTxIds: vaultTxIds || null
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

      // Aprobación de la Consignación
      const tokenRegistry = await domiEngine.getTokenRegistry(connection);
      const protocolRules = await domiEngine.getProtocolRules(connection);

      const fiatPeg = parseFloat(tokenRegistry?.fiat_peg_cop || 1000);
      const amountDomis = parseFloat((deposit.amount_cop / fiatPeg).toFixed(4));

      // 1. Marcar consignación como confirmada
      await cashRepository.updateBankDepositStatus(depositId, 'confirmed', userContext.id, notes, connection);

      let txHash = null;
      let wallet = null;

      if (deposit.deposit_source === 'vault') {
        // --- FLUJO NUEVO: Dinero proviene de la caja física (los DOMIs ya circulan vía Instamint) ---
        // Registrar la conciliación en las transacciones de caja
        await connection.query(
          'UPDATE cash_vault_transactions SET reconciled_at = NOW(6) WHERE bank_deposit_id = ?',
          [depositId]
        );

        // Confirmar los paquetes de DOMIs pendientes correspondientes
        await connection.query(`
          UPDATE domi_packages
          SET status = 'confirmado', is_confirmed = 1, bank_deposit_id = ?
          WHERE vault_tx_id IN (
            SELECT id FROM cash_vault_transactions WHERE bank_deposit_id = ?
          ) AND status = 'pendiente'
        `, [depositId, depositId]);

        await logSecurityEvent(userContext.id, 'BANK_DEPOSIT_RECONCILED', 'HIGH', req, {
          depositId,
          amount_cop: deposit.amount_cop,
          depositSource: 'vault',
          notes
        });

      } else {
        // --- FLUJO ANTIGUO/DIRECTO: Depósito directo del cliente al banco (requiere acuñación) ---
        await connection.query(
          'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
          [amountDomis, deposit.destination_wallet_id]
        );

        // Obtener la información del dueño de la wallet para actualizar Redis
        const [[walletRow]] = await connection.query(
          `SELECT 
             w.id,
             w.user_id,
             w.is_system,
             CASE 
               WHEN w.is_system = 1 THEN 'system'
               WHEN s.id IS NOT NULL THEN 'store'
               WHEN c.id IS NOT NULL THEN 'commerce'
               WHEN dc.id IS NOT NULL THEN 'delivery_company'
               ELSE 'user'
             END as owner_type,
             CASE
               WHEN w.is_system = 1 THEN 0
               WHEN s.id IS NOT NULL THEN s.id
               WHEN c.id IS NOT NULL THEN c.id
               WHEN dc.id IS NOT NULL THEN dc.id
               ELSE w.user_id
             END as owner_id
           FROM wallets w
           LEFT JOIN stores s ON w.user_id = s.usuario_id
           LEFT JOIN commerces c ON w.user_id = c.usuario_id
           LEFT JOIN delivery_companies dc ON w.user_id = dc.usuario_id
           WHERE w.id = ?`,
          [deposit.destination_wallet_id]
        );
        wallet = walletRow;

        // Registrar en el domi_ledger
        txHash = await domiEngine.appendLedger(connection, {
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
          depositSource: 'direct',
          txHash,
          notes
        });
      }

      await connection.commit();
      connection.release();

      // Sincronizar en Redis (solo si hubo acuñación directa)
      if (deposit.deposit_source !== 'vault' && wallet) {
        await domiRedis.incrementBalance(wallet.owner_type, wallet.owner_id, amountDomis);
      }

      return {
        success: true,
        message: deposit.deposit_source === 'vault' 
          ? `Consignación consolidada aprobada y conciliada con la caja física con éxito.`
          : `Consignación aprobada. Se acuñaron ${amountDomis.toLocaleString('es-CO')} DOMIs con éxito.`,
        amountDomis,
        txHash
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async receivePhysicalPayment(userContext, data) {
    const { amountCop, destinationWalletId, notes } = data;

    if (!amountCop || parseFloat(amountCop) <= 0) {
      throw new BusinessError('El monto en pesos (COP) debe ser un número positivo.');
    }
    if (!destinationWalletId) {
      throw new BusinessError('La wallet destino es requerida.');
    }
    if (!notes || notes.trim().length < 5) {
      throw new BusinessError('Las notas son obligatorias y deben tener al menos 5 caracteres.');
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Validar que la wallet de destino exista
      const [walletRows] = await connection.query(
        `SELECT 
           w.id,
           w.user_id,
           w.is_system,
           CASE 
             WHEN w.is_system = 1 THEN 'system'
             WHEN s.id IS NOT NULL THEN 'store'
             WHEN c.id IS NOT NULL THEN 'commerce'
             WHEN dc.id IS NOT NULL THEN 'delivery_company'
             ELSE 'user'
           END as owner_type,
           CASE
             WHEN w.is_system = 1 THEN 0
             WHEN s.id IS NOT NULL THEN s.id
             WHEN c.id IS NOT NULL THEN c.id
             WHEN dc.id IS NOT NULL THEN dc.id
             ELSE w.user_id
           END as owner_id
         FROM wallets w
         LEFT JOIN stores s ON w.user_id = s.usuario_id
         LEFT JOIN commerces c ON w.user_id = c.usuario_id
         LEFT JOIN delivery_companies dc ON w.user_id = dc.usuario_id
         WHERE w.id = ?`,
        [destinationWalletId]
      );

      if (walletRows.length === 0) {
        throw new NotFoundError('La billetera destino especificada no existe.');
      }
      const wallet = walletRows[0];

      // 2. Insertar transacción de caja física
      const txId = await cashRepository.createCashTransaction(
        parseFloat(amountCop),
        'income',
        notes.trim(),
        'cash_mint',
        null,
        userContext.id,
        connection
      );

      // Vincular el destination_wallet_id en cash_vault_transactions
      await connection.query(
        'UPDATE cash_vault_transactions SET destination_wallet_id = ? WHERE id = ?',
        [destinationWalletId, txId]
      );

      // 3. Acuñar DOMIs usando domiEngine.mintDomis (pasando vaultTxId como parámetro opcional y externalConn)
      const mintResult = await domiEngine.mintDomis(
        wallet.owner_type,
        wallet.owner_id,
        parseFloat(amountCop),
        `CASH-RCPT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        false, // isConfirmed = false -> status='pendiente' en domi_packages
        userContext.id,
        txId, // vaultTxId
        connection // externalConn
      );

      await logSecurityEvent(userContext.id, 'CASH_PAYMENT_RECEIVED', 'HIGH', null, {
        vaultTxId: txId,
        packageId: mintResult.packageId,
        amountCop: parseFloat(amountCop),
        amountDomis: mintResult.domis,
        destinationWalletId
      });

      await connection.commit();
      connection.release();

      // Sincronizar en Redis post-commit
      await domiRedis.incrementBalance(wallet.owner_type, wallet.owner_id, mintResult.domis);

      return {
        success: true,
        vaultTxId: txId,
        packageId: mintResult.packageId,
        amountDomis: mintResult.domis,
        message: `Recepción de efectivo de $${parseFloat(amountCop).toLocaleString('es-CO')} COP registrada e Instamint de ${mintResult.domis} DOMIs completado con éxito.`
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async searchWallets(userContext, query) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const searchPattern = `%${query.trim()}%`;
    const walletIdQuery = parseInt(query.trim(), 10);
    const walletId = isNaN(walletIdQuery) ? -1 : walletIdQuery;

    const [rows] = await db.query(`
      SELECT 
        w.id as wallet_id,
        w.balance_custody,
        CASE
          WHEN w.is_system = 1 THEN 'system'
          WHEN s.id IS NOT NULL THEN 'store'
          WHEN c.id IS NOT NULL THEN 'commerce'
          WHEN dc.id IS NOT NULL THEN 'delivery_company'
          ELSE 'user'
        END as owner_type,
        CASE
          WHEN w.is_system = 1 THEN 'Sistema'
          WHEN s.id IS NOT NULL THEN s.nombre_sucursal
          WHEN c.id IS NOT NULL THEN c.nombre
          WHEN dc.id IS NOT NULL THEN dc.nombre_comercial
          ELSE (SELECT CONCAT(nombres, ' ', COALESCE(apellidos, '')) FROM profiles WHERE usuario_id = w.user_id)
        END as owner_name,
        COALESCE(u.email, '') as owner_email,
        COALESCE(p.telefono, '') as owner_phone
      FROM wallets w
      LEFT JOIN users u ON w.user_id = u.id
      LEFT JOIN profiles p ON w.user_id = p.usuario_id
      LEFT JOIN stores s ON w.user_id = s.usuario_id
      LEFT JOIN commerces c ON w.user_id = c.usuario_id
      LEFT JOIN delivery_companies dc ON w.user_id = dc.usuario_id
      WHERE w.is_system = 0
        AND (
          u.email LIKE ? OR 
          p.nombres LIKE ? OR 
          p.apellidos LIKE ? OR 
          p.telefono LIKE ? OR
          w.id = ?
        )
      LIMIT 10
    `, [searchPattern, searchPattern, searchPattern, searchPattern, walletId]);

    return rows;
  }
}

module.exports = new CashService();
