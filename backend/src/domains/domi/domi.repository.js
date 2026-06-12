const db = require('../../config/db');

class DomiRepository {
  async findTokenRegistry() {
    const [rows] = await db.query('SELECT symbol, name, decimals, fiat_peg_cop, protocol_version, created_at FROM token_registry WHERE id = 1');
    return rows[0] || null;
  }

  async findProtocolRules() {
    const [rows] = await db.query('SELECT threshold_fiat_cop, base_cost_domis, percentage_rate, driver_base_cost_domis, driver_threshold_fiat_cop, driver_percentage_rate, retention_penalty_rate, refund_standard_rate, rescue_cashback_rate, effective_date FROM protocol_rules WHERE id = 1');
    return rows[0] || null;
  }

  async findSystemWallet() {
    const [rows] = await db.query("SELECT * FROM wallets WHERE owner_type = 'system' AND owner_id IS NULL");
    return rows[0] || null;
  }

  async checkStoreExists(storeId, commerceId) {
    const [rows] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
    return rows.length > 0;
  }

  async findWallet(ownerType, ownerId) {
    const [rows] = await db.query(
      'SELECT id, owner_type, owner_id, balance_custody, balance_utility, locked_balance, created_at, updated_at FROM wallets WHERE owner_type = ? AND owner_id = ?',
      [ownerType, ownerId]
    );
    return rows[0] || null;
  }

  async findDomiPackagesByStoreId(storeId) {
    const [rows] = await db.query(
      'SELECT * FROM domi_packages WHERE store_id = ? ORDER BY created_at DESC',
      [storeId]
    );
    return rows;
  }

  async findLedgerEntries({ txType, referenceType, referenceId, limit }) {
    let query = 'SELECT * FROM domi_ledger WHERE 1=1';
    const params = [];

    if (txType) {
      query += ' AND tx_type = ?';
      params.push(txType);
    }
    if (referenceType) {
      query += ' AND reference_type = ?';
      params.push(referenceType);
    }
    if (referenceId) {
      query += ' AND reference_id = ?';
      params.push(referenceId);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit) || 50);

    const [rows] = await db.query(query, params);
    return rows;
  }

  async findTokenRegistryFiatPeg() {
    const [rows] = await db.query('SELECT fiat_peg_cop FROM token_registry LIMIT 1');
    return rows[0] || null;
  }
}

module.exports = new DomiRepository();
