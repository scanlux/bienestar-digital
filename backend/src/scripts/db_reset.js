const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { seed } = require('./db_seed');

require('dotenv').config({ path: '.env' });

async function runSqlFile(connection, filePath) {
  console.log(`Executing SQL file: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Parse and execute SQL statements, handling DELIMITER //
  const statements = [];
  let currentStatement = '';
  let inDelimiterBlock = false;
  
  const lines = content.split('\n');
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed === '') {
      continue;
    }
    
    if (trimmed.toUpperCase().startsWith('DELIMITER //')) {
      inDelimiterBlock = true;
      continue;
    }
    if (trimmed.toUpperCase().startsWith('DELIMITER ;')) {
      inDelimiterBlock = false;
      if (currentStatement.trim() !== '') {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
      continue;
    }
    
    if (inDelimiterBlock) {
      if (trimmed.endsWith('//')) {
        currentStatement += '\n' + line.slice(0, line.lastIndexOf('//'));
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else {
        currentStatement += '\n' + line;
      }
    } else {
      if (trimmed.endsWith(';')) {
        currentStatement += '\n' + line.slice(0, line.lastIndexOf(';'));
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else {
        currentStatement += '\n' + line;
      }
    }
  }
  
  if (currentStatement.trim() !== '') {
    statements.push(currentStatement.trim());
  }

  // Execute statements sequentially
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  for (let stmt of statements) {
    if (stmt === '') continue;
    try {
      await connection.query(stmt);
    } catch (err) {
      console.error(`Error executing SQL statement:\n${stmt}\nError: ${err.message}`);
      throw err;
    }
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function truncateTransactionalData(c) {
  console.log('Truncating transactional and operational tables...');
  const tablesToTruncate = [
    'orders', 'order_items', 'order_incidents', 'rescue_assignments',
    'domi_ledger', 'domi_packages', 'wallets', 'user_moderation_logs',
    'security_audit_logs', 'wallet_aliases', 'redis_sync_queue',
    'domi_order_debts', 'domi_store_debts', 'domi_withdrawal_log',
    'domi_withdrawal_requests', 'bank_deposits', 'cash_vault_transactions',
    'order_messages', 'order_offer_rejections', 'user_push_tokens',
    'withdrawal_accounts', 'domi_reserve_alerts', 'domi_reserve_declarations',
    'domi_peg_history', 'users', 'profiles', 'commerces', 'stores',
    'user_stores', 'store_operators', 'delivery_companies', 'registration_requests',
    'commerce_upgrades', 'influencer_reels', 'product_popularity'
  ];

  await c.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of tablesToTruncate) {
    try {
      await c.query(`TRUNCATE TABLE \`${t}\``);
    } catch (err) {
      console.warn(`Warning: Could not truncate table ${t}: ${err.message}`);
    }
  }
  await c.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Transactional tables truncated successfully.');
}

async function truncateFinancialData(c) {
  console.log('Resetting ONLY financial and order tables (preserving users and catalogs)...');
  const tablesToTruncate = [
    'orders', 'order_items', 'order_incidents', 'rescue_assignments',
    'domi_ledger', 'domi_packages', 'security_audit_logs', 'redis_sync_queue',
    'domi_order_debts', 'domi_store_debts', 'domi_withdrawal_log',
    'domi_withdrawal_requests', 'bank_deposits', 'cash_vault_transactions',
    'order_messages', 'order_offer_rejections', 'domi_reserve_alerts',
    'domi_reserve_declarations'
  ];

  await c.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of tablesToTruncate) {
    try {
      await c.query(`TRUNCATE TABLE \`${t}\``);
    } catch (err) {
      console.warn(`Warning: Could not truncate table ${t}: ${err.message}`);
    }
  }
  
  // Reset wallets safely without destroying the rows (so users keep their wallet ID bindings)
  await c.query(`UPDATE wallets SET balance_custody = 0, locked_balance = 0, balance_utility = 0`);
  
  // Reset user score to default positive score of 10 to allow COD orders
  await c.query(`UPDATE users SET domi_score = 10`);

  await c.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Financial and order tables reset successfully.');
}

async function main() {
  const args = process.argv.slice(2);
  const isFull = args.includes('--full');
  const isOnlyTransactional = args.includes('--only-transactional');
  const isOnlyFinancial = args.includes('--only-financial');
  const isSeedOnly = args.includes('--seed-only');

  if (!isFull && !isOnlyTransactional && !isOnlyFinancial && !isSeedOnly) {
    console.log(`
Usage: node db_reset.js [options]
Options:
  --full                Recreate database schema from scratch and run seed.
  --only-transactional  Clear operational/transactional tables while preserving config tables.
  --only-financial      Clear ONLY financial/order tables and wallets (preserves users and catalogs).
  --seed-only           Only run db_seed.js to refresh system configuration (no truncation).
`);
    process.exit(0);
  }

  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true // Enable multiple statements support
  });

  try {
    if (isFull) {
      console.log('Starting full database reset (--full)...');
      const schemaPath = path.join(__dirname, 'db_schema.sql');
      await runSqlFile(c, schemaPath);
      await seed(c);
    } else if (isOnlyTransactional) {
      console.log('Starting transactional data reset (--only-transactional)...');
      await truncateTransactionalData(c);
      await seed(c);
    } else if (isOnlyFinancial) {
      console.log('Starting financial data reset (--only-financial)...');
      await truncateFinancialData(c);
      // We also run seed to ensure configuration parameters are up to date, but users are untouched
      await seed(c);
    } else if (isSeedOnly) {
      console.log('Starting system config seed only (--seed-only)...');
      await seed(c);
    }

    // Reset Redis cache & streams (preserving session_stamps)
    try {
      const { createClient } = require('redis');
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
      const rClient = createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD
      });
      await rClient.connect();
      const keys = await rClient.keys('domi:*');
      const keysToDelete = keys.filter(k => k !== 'domi:tx_stream');
      if (keysToDelete.length > 0) {
        await rClient.del(keysToDelete);
        console.log(`Cleared ${keysToDelete.length} cached keys matching 'domi:*' from Redis (preserving session_stamps).`);
      }
      try {
        await rClient.del('domi:tx_stream').catch(() => {});
        await rClient.xGroupCreate('domi:tx_stream', 'domi-workers', '$', { MKSTREAM: true });
        console.log('Redis stream and consumer group cleared and recreated successfully.');
      } catch (trimErr) {
        console.warn('Warning: Could not clear Redis stream:', trimErr.message);
      }
      await rClient.disconnect();
    } catch (redisErr) {
      console.warn('Warning: Could not clear Redis:', redisErr.message);
    }

    console.log('Database reset process finished successfully.');
  } catch (err) {
    console.error('Database reset process failed:', err);
    process.exit(1);
  } finally {
    await c.end();
  }
}

main();
