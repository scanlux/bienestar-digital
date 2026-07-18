const db = require('../../config/db');

class CashRepository {
  async getCashBalance() {
    const [rows] = await db.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN tx_type = 'income' THEN amount_cop
          WHEN tx_type = 'expense' THEN -amount_cop
          WHEN tx_type = 'deposit' THEN -amount_cop
          WHEN tx_type = 'adjustment' THEN amount_cop
          ELSE 0 
        END
      ), 0) as balance 
      FROM cash_vault_transactions
    `);
    return parseFloat(rows[0]?.balance || 0);
  }

  async getBankTransitBalance() {
    const [rows] = await db.query(`
      SELECT COALESCE(SUM(amount_cop), 0) as balance
      FROM bank_deposits
      WHERE status = 'pending'
    `);
    return parseFloat(rows[0]?.balance || 0);
  }

  async createCashTransaction(amountCop, txType, notes, referenceType, referenceId, createdBy, connection) {
    const queryExecutor = connection || db;
    const [result] = await queryExecutor.query(`
      INSERT INTO cash_vault_transactions 
      (amount_cop, tx_type, notes, reference_type, reference_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [amountCop, txType, notes || null, referenceType || 'manual', referenceId || null, createdBy]);
    return result.insertId;
  }

  async createBankDeposit(amountCop, destinationWalletId, evidenceUrl, depositDate, notes, createdBy) {
    const [result] = await db.query(`
      INSERT INTO bank_deposits 
      (amount_cop, status, destination_wallet_id, evidence_url, deposit_date, notes, created_by)
      VALUES (?, 'pending', ?, ?, ?, ?, ?)
    `, [amountCop, destinationWalletId, evidenceUrl, depositDate, notes || null, createdBy]);
    return result.insertId;
  }

  async getBankDeposits(status) {
    let query = `
      SELECT bd.*, 
             CASE
               WHEN w.is_system = 1 THEN 'system'
               WHEN st.id IS NOT NULL THEN 'store'
               WHEN cm.id IS NOT NULL THEN 'commerce'
               WHEN dc.id IS NOT NULL THEN 'delivery_company'
               ELSE 'user'
             END as owner_type,
             COALESCE(w.user_id, 0) as owner_id,
             u.email as creator_email,
             conf.email as confirmer_email,
             CASE
               WHEN w.is_system = 1 THEN 'Sistema'
               WHEN st.id IS NOT NULL THEN st.nombre_sucursal
               WHEN cm.id IS NOT NULL THEN cm.nombre
               WHEN w.user_id IS NOT NULL THEN (SELECT CONCAT(nombres, ' ', apellidos) FROM profiles WHERE usuario_id = w.user_id)
               ELSE 'Sistema'
             END as destination_name
      FROM bank_deposits bd
      JOIN wallets w ON bd.destination_wallet_id = w.id
      LEFT JOIN stores st ON w.user_id = st.usuario_id
      LEFT JOIN commerces cm ON w.user_id = cm.usuario_id
      LEFT JOIN delivery_companies dc ON w.user_id = dc.usuario_id
      JOIN users u ON bd.created_by = u.id
      LEFT JOIN users conf ON bd.confirmed_by = conf.id
    `;
    const params = [];
    if (status) {
      query += ' WHERE bd.status = ?';
      params.push(status);
    }
    query += ' ORDER BY bd.created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  async findBankDepositById(id) {
    const [rows] = await db.query(`
      SELECT bd.*, w.id as wallet_id, 
             CASE
               WHEN w.is_system = 1 THEN 'system'
               WHEN st.id IS NOT NULL THEN 'store'
               WHEN cm.id IS NOT NULL THEN 'commerce'
               WHEN dc.id IS NOT NULL THEN 'delivery_company'
               ELSE 'user'
             END as owner_type,
             COALESCE(w.user_id, 0) as owner_id
      FROM bank_deposits bd
      JOIN wallets w ON bd.destination_wallet_id = w.id
      LEFT JOIN stores st ON w.user_id = st.usuario_id
      LEFT JOIN commerces cm ON w.user_id = cm.usuario_id
      LEFT JOIN delivery_companies dc ON w.user_id = dc.usuario_id
      WHERE bd.id = ?
    `, [id]);
    return rows[0] || null;
  }

  async updateBankDepositStatus(id, status, confirmedBy, notes, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query(`
      UPDATE bank_deposits
      SET status = ?, confirmed_by = ?, notes = ?, confirmed_at = CURRENT_TIMESTAMP(6)
      WHERE id = ?
    `, [status, confirmedBy, notes || null, id]);
  }

  async getCashTransactions(limit = 50) {
    const [rows] = await db.query(`
      SELECT cvt.*, u.email as creator_email
      FROM cash_vault_transactions cvt
      JOIN users u ON cvt.created_by = u.id
      ORDER BY cvt.created_at DESC
      LIMIT ?
    `, [Number(limit)]);
    return rows;
  }

  async getOperatorHistory(operatorId, timeframe) {
    let dateFilter = 'DATE(cvt.created_at) = CURRENT_DATE()';
    let bankDateFilter = 'DATE(bd.created_at) = CURRENT_DATE()';

    if (timeframe === 'month') {
      dateFilter = 'MONTH(cvt.created_at) = MONTH(CURRENT_DATE()) AND YEAR(cvt.created_at) = YEAR(CURRENT_DATE())';
      bankDateFilter = 'MONTH(bd.created_at) = MONTH(CURRENT_DATE()) AND YEAR(bd.created_at) = YEAR(CURRENT_DATE())';
    }

    const [cashTxs] = await db.query(`
      SELECT cvt.*, 'cash' as source_type
      FROM cash_vault_transactions cvt
      WHERE cvt.created_by = ? AND ${dateFilter}
      ORDER BY cvt.created_at DESC
    `, [operatorId]);

    const [bankDeposits] = await db.query(`
      SELECT bd.*, 'bank' as source_type, 
             CASE
               WHEN w.is_system = 1 THEN 'system'
               WHEN st.id IS NOT NULL THEN 'store'
               WHEN cm.id IS NOT NULL THEN 'commerce'
               WHEN dc.id IS NOT NULL THEN 'delivery_company'
               ELSE 'user'
             END as owner_type,
             COALESCE(w.user_id, 0) as owner_id
      FROM bank_deposits bd
      JOIN wallets w ON bd.destination_wallet_id = w.id
      LEFT JOIN stores st ON w.user_id = st.usuario_id
      LEFT JOIN commerces cm ON w.user_id = cm.usuario_id
      LEFT JOIN delivery_companies dc ON w.user_id = dc.usuario_id
      WHERE bd.created_by = ? AND ${bankDateFilter}
      ORDER BY bd.created_at DESC
    `, [operatorId]);

    return {
      cashTransactions: cashTxs,
      bankDeposits
    };
  }

}

module.exports = new CashRepository();
