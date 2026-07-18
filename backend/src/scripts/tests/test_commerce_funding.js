const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../../services/domiRedis');
const crypto = require('crypto');

function generateTxHash(txType, fromWalletId, toWalletId, amount, referenceId) {
  const payload = `${txType}|${fromWalletId || 'null'}|${toWalletId || 'null'}|${amount}|${referenceId}|${Date.now()}|${Math.random()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function run() {
  console.log('=== INICIANDO PRUEBA DE FONDEO Y COMPRA DE DOMIS PARA COMERCIOS ===');
  const conn = await db.getConnection();
  try {
    // 1. Obtener todos los comercios registrados
    const [commerces] = await conn.query('SELECT id, nombre FROM commerces');
    console.log(`Se encontraron ${commerces.length} comercios en el sistema.`);

    // Obtener las reglas y el token para el ledger
    const [rulesRows] = await conn.query('SELECT * FROM protocol_rules WHERE id = 1');
    const [tokenRows] = await conn.query('SELECT * FROM token_registry WHERE id = 1');
    const protocolSnapshot = { token: tokenRows[0], rules: rulesRows[0] };
    const fiatPeg = parseFloat(tokenRows[0].fiat_peg_cop || 1000.00);

    for (const commerce of commerces) {
      console.log(`\nProcesando comercio: ${commerce.nombre} (ID: ${commerce.id})...`);

      // === PASO 1: Asegurar wallet corporativa y fondearla a 10000 DOMIs ===
      // Buscar o crear la wallet
      let [walletRows] = await conn.query("SELECT * FROM wallets WHERE commerce_id = ?", [commerce.id]);
      let walletId;
      if (walletRows.length === 0) {
        const [insertResult] = await conn.query("INSERT INTO wallets (commerce_id, balance_custody, balance_utility, locked_balance) VALUES (?, 0.0000, 0.0000, 0.0000)", [commerce.id]);
        walletId = insertResult.insertId;
        console.log(`-> Creada billetera corporativa ID: ${walletId} para el comercio.`);
      } else {
        walletId = walletRows[0].id;
        console.log(`-> Billetera corporativa existente ID: ${walletId}.`);
      }

      // Actualizar a 10000 DOMI en MariaDB
      await conn.query('UPDATE wallets SET balance_custody = 10000.0000 WHERE id = ?', [walletId]);
      
      // Sincronizar en Redis
      await domiRedis.setBalance('commerce', commerce.id, 10000);
      console.log(`-> Saldo de la billetera actualizado a 10,000 DOMI en DB y Redis.`);

      // Registrar en el Ledger (Ajuste/Fondeo Inicial de Prueba)
      const txHash1 = generateTxHash('mint', null, walletId, 10000, commerce.id);
      await conn.query(`
        INSERT INTO domi_ledger 
        (tx_hash, tx_type, from_wallet_id, to_wallet_id, amount_domis, amount_fiat_cop, reference_type, reference_id, protocol_snapshot, notes)
        VALUES (?, 'mint', NULL, ?, 10000.0000, ?, 'manual', ?, ?, ?)
      `, [txHash1, walletId, 10000 * fiatPeg, commerce.id, JSON.stringify(protocolSnapshot), `Fondeo inicial de prueba de 10,000 DOMIs para comercio #${commerce.id}`]);
      console.log(`-> Ledger registrado para fondeo inicial. Hash: ${txHash1.substring(0, 16)}...`);


      // === PASO 2: Simular una nueva compra de 10,000 DOMIs ===
      // Insertar un nuevo paquete confirmado en domi_packages
      const fiatPaid = 10000 * fiatPeg;
      const paymentRef = `TEST-MINT-${commerce.id}-${Date.now()}`;
      
      const [pkgResult] = await conn.query(`
        INSERT INTO domi_packages (store_id, wallet_id, domis_purchased, fiat_paid_cop, exchange_rate, payment_ref, status, confirmed_at)
        VALUES (NULL, ?, 10000.0000, ?, ?, ?, 'confirmado', NOW())
      `, [walletId, fiatPaid, fiatPeg, paymentRef]);
      const packageId = pkgResult.insertId;
      console.log(`-> Simulación de compra: Paquete de compra #${packageId} creado con referencia ${paymentRef} por ${fiatPaid} COP.`);

      // Sumar otros 10,000 DOMI por la compra (haciendo un total de 20,000 DOMI)
      await conn.query('UPDATE wallets SET balance_custody = balance_custody + 10000.0000 WHERE id = ?', [walletId]);
      
      // Sincronizar incremento en Redis
      await domiRedis.incrementBalance('commerce', commerce.id, 10000);
      console.log(`-> Billetera incrementada en 10,000 DOMI adicionales por la compra (Nuevo Saldo: 20,000 DOMI).`);

      // Registrar la compra en el Ledger
      const txHash2 = generateTxHash('mint', null, walletId, 10000, packageId);
      await conn.query(`
        INSERT INTO domi_ledger 
        (tx_hash, tx_type, from_wallet_id, to_wallet_id, amount_domis, amount_fiat_cop, reference_type, reference_id, protocol_snapshot, notes)
        VALUES (?, 'mint', NULL, ?, 10000.0000, ?, 'package', ?, ?, ?)
      `, [txHash2, walletId, fiatPaid, packageId, JSON.stringify(protocolSnapshot), `Simulación de compra de 10,000 DOMIs (Paquete #${packageId})`]);
      console.log(`-> Ledger registrado para la compra. Hash: ${txHash2.substring(0, 16)}...`);
    }

    console.log('\n=== PRUEBAS FINALIZADAS CON EXITO ===');
  } catch (err) {
    console.error('ERROR CRITICO EN EJECUCION DE PRUEBAS:', err);
  } finally {
    conn.release();
    // Cerramos conexiones para finalizar el script de forma limpia
    await db.end();
    await redisClient.disconnect();
    console.log('Conexiones cerradas.');
  }
}

run();
