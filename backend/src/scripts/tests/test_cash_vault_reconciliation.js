const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const cashService = require('../../domains/cash/cash.service');
const domiEngine = require('../../services/domiEngine');

async function getOrCreateUserWalletHelper(conn, userId) {
  // 1. Asegurar que exista el usuario
  await conn.query(
    "INSERT IGNORE INTO users (id, email, password_hash, rol) VALUES (?, ?, 'password', 'customer')",
    [userId, `user_${userId}@test.com`]
  );
  
  // 2. Asegurar que exista el perfil
  await conn.query(
    "INSERT IGNORE INTO profiles (usuario_id, nombres, apellidos, telefono) VALUES (?, 'Nombre Test', 'Apellido Test', '3001234567')",
    [userId]
  );

  // 3. Obtener o crear la wallet
  const [rows] = await conn.query("SELECT * FROM wallets WHERE user_id = ?", [userId]);
  if (rows.length > 0) {
    return rows[0];
  }

  const [result] = await conn.query(
    "INSERT INTO wallets (user_id, balance_custody, balance_frozen, is_system) VALUES (?, 0, 0, 0)",
    [userId]
  );

  const [[newWallet]] = await conn.query("SELECT * FROM wallets WHERE id = ?", [result.insertId]);
  return newWallet;
}

async function run() {
  console.log('=== INICIANDO PRUEBA DE CONCILIACIÓN DE CAJA FÍSICA (VAULT) ===');
  const conn = await db.getConnection();

  try {
    // 1. Obtener/crear wallet de prueba para usuario
    const testUserId = Math.floor(200000 + Math.random() * 800000);
    const wallet = await getOrCreateUserWalletHelper(conn, testUserId);
    console.log(`Billetera de prueba: ID=${wallet.id}, OwnerId=${testUserId}`);

    // 2. Simular recepción de pago físico (Instamint)
    console.log('Registrando pago físico...');
    const paymentResult = await cashService.receivePhysicalPayment(
      { id: 1, role: 'admin' }, // operador
      {
        amountCop: 50000,
        destinationWalletId: wallet.id,
        notes: 'Pago físico de prueba para Instamint'
      }
    );

    const { vaultTxId, packageId, amountDomis } = paymentResult;
    console.log(`Pago físico registrado. Transacción Caja ID: ${vaultTxId}, Paquete ID: ${packageId}, DOMIs: ${amountDomis}`);

    // Verificar que el paquete DOMI está en estado 'pendiente' y tiene el vault_tx_id asignado
    const [[pkgPending]] = await conn.query(
      'SELECT id, status, vault_tx_id, bank_deposit_id FROM domi_packages WHERE id = ?',
      [packageId]
    );

    if (!pkgPending) {
      throw new Error(`No se encontró el paquete DOMI con ID ${packageId}`);
    }
    console.log(`Verificación paquete pendiente: status='${pkgPending.status}', vault_tx_id=${pkgPending.vault_tx_id}`);
    if (pkgPending.status !== 'pendiente') {
      throw new Error(`El paquete debería estar en estado 'pendiente', pero está en: ${pkgPending.status}`);
    }

    // 3. Registrar el depósito bancario de tipo vault pasando vaultTxIds
    console.log('Creando depósito bancario vinculado a la transacción de caja...');
    const depositResult = await cashService.createBankDeposit(
      { id: 1, role: 'admin' },
      {
        amountCop: 50000,
        destinationWalletId: wallet.id,
        evidenceUrl: 'http://evidence.url/vault-test.png',
        depositDate: new Date(),
        notes: 'Depósito bancario de prueba desde caja física',
        isFromCash: true,
        vaultTxIds: [vaultTxId]
      },
      { ip: '127.0.0.1' }
    );

    const depositId = depositResult.depositId;
    console.log(`Depósito bancario creado con ID: ${depositId}`);

    // Verificar que la transacción de caja ahora tiene asignado el bank_deposit_id
    const [[vaultTxCheck]] = await conn.query(
      'SELECT id, bank_deposit_id FROM cash_vault_transactions WHERE id = ?',
      [vaultTxId]
    );
    console.log(`Transacción de caja vinculada a depósito: bank_deposit_id=${vaultTxCheck.bank_deposit_id}`);
    if (vaultTxCheck.bank_deposit_id !== depositId) {
      throw new Error(`La transacción de caja debería estar vinculada al depósito ${depositId}`);
    }

    // 4. Reconciliar/Aprobar el depósito bancario
    console.log('Aprobando y conciliando depósito bancario...');
    const reconcileResult = await cashService.reconcileBankDeposit(
      { id: 1, role: 'admin' },
      depositId,
      { action: 'approve', notes: 'Prueba de conciliación de caja física' },
      { ip: '127.0.0.1' }
    );
    console.log('Resultado de conciliación:', reconcileResult);

    // 5. Verificar actualizaciones en base de datos
    // El depósito bancario debe estar 'confirmed'
    const [[depositCheck]] = await conn.query(
      'SELECT id, status FROM bank_deposits WHERE id = ?',
      [depositId]
    );
    console.log(`Estado depósito bancario: status='${depositCheck.status}'`);
    if (depositCheck.status !== 'confirmed') {
      throw new Error(`El depósito bancario debería ser 'confirmed', pero es: ${depositCheck.status}`);
    }

    // La transacción de caja debe tener reconciled_at no nulo
    const [[vaultTxReconciledCheck]] = await conn.query(
      'SELECT id, reconciled_at FROM cash_vault_transactions WHERE id = ?',
      [vaultTxId]
    );
    console.log(`Reconciliación en caja física: reconciled_at=${vaultTxReconciledCheck.reconciled_at}`);
    if (!vaultTxReconciledCheck.reconciled_at) {
      throw new Error(`La transacción de caja debería tener fecha de reconciliación.`);
    }

    // El paquete DOMI debe estar 'confirmado' y tener bank_deposit_id asignado
    const [[pkgConfirmed]] = await conn.query(
      'SELECT id, status, bank_deposit_id FROM domi_packages WHERE id = ?',
      [packageId]
    );
    console.log(`Estado paquete DOMI: status='${pkgConfirmed.status}', bank_deposit_id=${pkgConfirmed.bank_deposit_id}`);
    if (pkgConfirmed.status !== 'confirmado') {
      throw new Error(`El paquete DOMI debería ser 'confirmado', pero es: ${pkgConfirmed.status}`);
    }
    if (pkgConfirmed.bank_deposit_id !== depositId) {
      throw new Error(`El paquete DOMI debería tener asignado el bank_deposit_id=${depositId}`);
    }

    console.log('✅ PRUEBA DE CONCILIACIÓN DE CAJA FÍSICA COMPLETADA CON ÉXITO');

  } catch (error) {
    console.error('❌ ERROR EN LA PRUEBA:', error);
  } finally {
    conn.release();
    await db.end();
    await redisClient.disconnect();
    console.log('Conexiones cerradas.');
  }
}

run();
