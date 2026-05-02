/**
 * Prueba de Estrés: Redis Queue & Write-Behind Cache
 * 
 * Simula 500 cobros instantáneos concurrently.
 * El worker procesará esto en background hacia MariaDB.
 */
require('dotenv').config();
const domiEngine = require('../services/domiEngine');
const domiRedis = require('../services/domiRedis');
const { startWorker } = require('../services/domiQueue');
const db = require('../config/db');

async function runStressTest() {
  console.log('\n============================================');
  console.log('   PRUEBA DE ESTRES: REDIS QUEUE (500 Pedidos)');
  console.log('============================================\n');

  try {
    const [stores] = await db.query('SELECT id FROM stores LIMIT 1');
    const [users] = await db.query("SELECT id FROM users WHERE rol = 'delivery' LIMIT 1");
    if (stores.length === 0 || users.length === 0) throw new Error('Faltan datos de prueba.');
    
    const storeId = stores[0].id;
    const driverId = users[0].id;

    // Asegurar fondos inmensos en MariaDB primero
    await domiEngine.mintDomis('store', storeId, 10000000, 'STRESS_TEST'); // 10M COP = 25k DOMIs
    await domiEngine.mintDomis('user', driverId, 10000000, 'STRESS_TEST');

    // Forzar carga a Redis
    const initialStoreBalance = await domiRedis.getWalletBalance('store', storeId);
    const initialDriverBalance = await domiRedis.getWalletBalance('user', driverId);
    
    console.log(`Balances Iniciales en Cache: Tienda=${initialStoreBalance}, Repartidor=${initialDriverBalance}`);

    // Crear 500 pedidos falsos en la BD para poder cobrarlos
    console.log('\n[1/3] Creando 500 pedidos en MariaDB...');
    const orderIds = [];
    for (let i=0; i<50; i++) { // Batch insert to be faster for test setup
      const values = [];
      for(let j=0; j<10; j++) {
        values.push(`(${storeId}, ${driverId}, ${driverId}, 10000, 1, 0.75, 'aceptado')`);
      }
      const [res] = await db.query(`INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES ${values.join(',')}`);
      for(let k=0; k<10; k++) orderIds.push(res.insertId + k);
    }
    console.log(`Creados ${orderIds.length} pedidos falsos.`);

    // Ejecutar 500 peticiones de cobro concurrentes (SIMULANDO TRAFICO EXTREMO)
    console.log('\n[2/3] Bombardeando Redis con 500 peticiones concurrentes...');
    const startTime = Date.now();
    
    const promises = orderIds.map(oId => domiEngine.chargeForOrder(oId, storeId, driverId, 1, 0.75));
    await Promise.all(promises);
    
    const endTime = Date.now();
    console.log(`\n¡BOMBARDEO COMPLETADO! Tiempo: ${endTime - startTime}ms`);
    console.log(`Rendimiento Frontend: ${500 / ((endTime - startTime)/1000)} req/seg`);
    
    const finalStoreRedis = await domiRedis.getWalletBalance('store', storeId);
    console.log(`Saldo actual en Redis (Inmediato): Tienda=${finalStoreRedis} (Descontó 500 DOMI al instante)`);

    // Iniciar Worker
    console.log('\n[3/3] Iniciando Worker para vaciar la cola hacia MariaDB...');
    startWorker(); // No le hacemos await porque es un while true

    // Monitorear progreso
    const monitor = setInterval(async () => {
      const [rows] = await db.query("SELECT balance_custody FROM wallets WHERE owner_type = 'store' AND owner_id = ?", [storeId]);
      console.log(`   MariaDB Sync Status: Balance = ${rows[0].balance_custody} DOMI`);
      
      if (parseFloat(rows[0].balance_custody) === finalStoreRedis) {
        clearInterval(monitor);
        console.log('\n============================================');
        console.log(' SINCRONIZACIÓN MARIA DB 100% COMPLETADA');
        console.log('============================================\n');
        process.exit(0);
      }
    }, 500);

  } catch(e) {
    console.error('ERROR STRESS TEST:', e);
    process.exit(1);
  }
}

runStressTest();
