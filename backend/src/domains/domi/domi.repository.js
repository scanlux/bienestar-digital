const db = require('../../config/db');

class DomiRepository {
  async findTokenRegistry() {
    const [rows] = await db.query('SELECT symbol, name, decimals, fiat_peg_cop, protocol_version, created_at FROM token_registry WHERE id = 1');
    return rows[0] || null;
  }

  async findProtocolRules() {
    const [rows] = await db.query('SELECT * FROM protocol_rules WHERE id = 1');
    return rows[0] || null;
  }

  async findSystemWallet() {
    const [rows] = await db.query("SELECT * FROM wallets WHERE is_system = 1");
    return rows[0] || null;
  }

  async checkStoreExists(storeId, commerceId) {
    const [rows] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
    return rows.length > 0;
  }

  async findWallet(ownerType, ownerId) {
    let userId = null;
    let isSystem = 0;
    
    if (ownerType === 'user') {
      userId = ownerId;
    } else if (ownerType === 'store') {
      const [rows] = await db.query('SELECT usuario_id FROM stores WHERE id = ?', [ownerId]);
      userId = rows[0]?.usuario_id || null;
    } else if (ownerType === 'commerce') {
      const [rows] = await db.query('SELECT usuario_id FROM commerces WHERE id = ?', [ownerId]);
      userId = rows[0]?.usuario_id || null;
    } else if (ownerType === 'delivery_company') {
      const [rows] = await db.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [ownerId]);
      userId = rows[0]?.usuario_id || null;
    } else if (ownerType === 'system') {
      isSystem = 1;
    }
    
    if (isSystem) {
      const [rows] = await db.query('SELECT * FROM wallets WHERE is_system = 1');
      return rows[0] || null;
    }
    
    if (!userId) return null;
    
    const [rows] = await db.query(
      `SELECT id, user_id, is_system, balance_custody, balance_utility, locked_balance, created_at, updated_at 
       FROM wallets WHERE user_id = ?`,
      [userId]
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

  async findWalletLedgerEntries(walletId, limit = 50) {
    const [rows] = await db.query(
      `SELECT l.*, 
              CASE
                WHEN fw.user_id IS NOT NULL THEN 'user'
                WHEN fw.is_system = 1 THEN 'system'
              END as from_owner_type,
              fw.user_id as from_owner_id,
              CASE
                WHEN tw.user_id IS NOT NULL THEN 'user'
                WHEN tw.is_system = 1 THEN 'system'
              END as to_owner_type,
              tw.user_id as to_owner_id
       FROM domi_ledger l
       LEFT JOIN wallets fw ON l.from_wallet_id = fw.id
       LEFT JOIN wallets tw ON l.to_wallet_id = tw.id
       WHERE l.from_wallet_id = ? OR l.to_wallet_id = ?
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT ?`,
      [walletId, walletId, Number(limit)]
    );
    return rows;
  }

  async calculateTotalCustodyBalance() {
    const [rows] = await db.query("SELECT SUM(balance_custody) as total_custody FROM wallets WHERE is_system = 0");
    return parseFloat(rows[0]?.total_custody || 0);
  }

  async calculateCustodyBreakdown() {
    const [rows] = await db.query(`
      SELECT 
        SUM(CASE WHEN u.rol = 'admin' THEN w.balance_custody ELSE 0 END) as commerce_custody,
        0 as store_custody,
        SUM(CASE WHEN u.rol = 'customer' THEN w.balance_custody ELSE 0 END) as user_custody
      FROM wallets w
      LEFT JOIN users u ON w.user_id = u.id
    `);
    return {
      commerceCustody: parseFloat(rows[0]?.commerce_custody || 0),
      storeCustody: parseFloat(rows[0]?.store_custody || 0),
      userCustody: parseFloat(rows[0]?.user_custody || 0)
    };
  }

  async findPackageByPaymentRef(paymentRef) {
    const [rows] = await db.query(
      'SELECT id FROM domi_packages WHERE payment_ref = ? LIMIT 1',
      [paymentRef]
    );
    return rows[0] || null;
  }

  // --- METODOS DE ALIAS DE WALLET ("BRE-B") ---
  async findAliasesByWalletId(walletId) {
    const [rows] = await db.query(
      'SELECT id, wallet_id, alias, created_at FROM wallet_aliases WHERE wallet_id = ? ORDER BY created_at DESC',
      [walletId]
    );
    return rows;
  }

  async findWalletAliasByString(alias) {
    const [rows] = await db.query(
      'SELECT id, wallet_id, alias, created_at FROM wallet_aliases WHERE alias = ? LIMIT 1',
      [alias]
    );
    return rows[0] || null;
  }

  async findWalletAliasById(aliasId) {
    const [rows] = await db.query(
      'SELECT id, wallet_id, alias, created_at FROM wallet_aliases WHERE id = ? LIMIT 1',
      [aliasId]
    );
    return rows[0] || null;
  }

  async countWalletAliases(walletId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM wallet_aliases WHERE wallet_id = ?',
      [walletId]
    );
    return rows[0]?.count || 0;
  }

  async createWalletAlias(walletId, alias) {
    const [result] = await db.query(
      'INSERT INTO wallet_aliases (wallet_id, alias) VALUES (?, ?)',
      [walletId, alias]
    );
    return result.insertId;
  }

  async deleteWalletAlias(aliasId) {
    await db.query(
      'DELETE FROM wallet_aliases WHERE id = ?',
      [aliasId]
    );
  }

  async findWalletOwnerInfo(ownerType, ownerId) {
    if (ownerType === 'user') {
      const [rows] = await db.query(
        'SELECT nombres, apellidos, cedula FROM profiles WHERE usuario_id = ? LIMIT 1',
        [ownerId]
      );
      return rows[0] || null;
    }
    if (ownerType === 'commerce') {
      const [rows] = await db.query(
        'SELECT nombre, nit FROM commerces WHERE id = ? LIMIT 1',
        [ownerId]
      );
      return rows[0] || null;
    }
    if (ownerType === 'store') {
      const [rows] = await db.query(
        'SELECT s.nombre_sucursal, s.matricula, c.nombre as commerce_nombre, c.nit FROM stores s LEFT JOIN commerces c ON s.commerce_id = c.id WHERE s.id = ? LIMIT 1',
        [ownerId]
      );
      return rows[0] || null;
    }
    return null;
  }

  async findWithdrawalAccountsByWalletId(walletId) {
    const [rows] = await db.query(
      'SELECT * FROM withdrawal_accounts WHERE wallet_id = ? ORDER BY is_default DESC, created_at DESC',
      [walletId]
    );
    return rows;
  }

  async findWithdrawalAccountById(id) {
    const [rows] = await db.query(
      'SELECT * FROM withdrawal_accounts WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async createWithdrawalAccount(walletId, data, connection) {
    const queryExecutor = connection || db;
    const { metodo, numero_cuenta, tipo_cuenta, codigo_banco, titular, documento_cc, is_default } = data;
    const [result] = await queryExecutor.query(
      `INSERT INTO withdrawal_accounts 
       (wallet_id, metodo, numero_cuenta, tipo_cuenta, codigo_banco, titular, documento_cc, is_default, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [walletId, metodo, numero_cuenta, tipo_cuenta, codigo_banco || null, titular, documento_cc, is_default ? 1 : 0]
    );
    return result.insertId;
  }

  async deleteWithdrawalAccount(id) {
    await db.query('DELETE FROM withdrawal_accounts WHERE id = ?', [id]);
  }

  async unsetAllDefaultWithdrawalAccounts(walletId, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('UPDATE withdrawal_accounts SET is_default = 0 WHERE wallet_id = ?', [walletId]);
  }

  async setDefaultWithdrawalAccount(id, connection) {
    const queryExecutor = connection || db;
    await queryExecutor.query('UPDATE withdrawal_accounts SET is_default = 1 WHERE id = ?', [id]);
  }
}

module.exports = new DomiRepository();
