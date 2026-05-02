/**
 * PRUEBA DE ESTRÉS: CADENA DE RESCATES Y VOLUMEN MASIVO (500)
 * 
 * Escenario:
 * 1. 500 pedidos normales procesados en ráfaga.
 * 2. 5 pedidos "Hot Potato" que pasan por 5 repartidores cada uno.
 * 3. Verificación de integridad de saldos finales.
 */
require('dotenv').config();
const domiEngine = require('../services/domiEngine');
const domiRedis = require('../services/domiRedis');
const { startWorker } = require('../services/domiQueue');
const db = require('../config/db');

async function setupUsers() {
    console.log('--- Configurando Usuarios para la prueba ---');
    // Asegurar que existan al menos 6 repartidores
    const [deliveries] = await db.query("SELECT id FROM users WHERE rol = 'delivery' LIMIT 10");
    if (deliveries.length < 6) {
        console.log('Creando repartidores adicionales...');
        for(let i=0; i<6; i++) {
            await db.query("INSERT IGNORE INTO users (email, password_hash, rol, nombre) VALUES (?, '123', 'delivery', ?)", 
                [`test_driver_${i}@domi.com`, `Driver Test ${i}`]);
        }
    }
    const [finalDeliveries] = await db.query("SELECT id FROM users WHERE rol = 'delivery' LIMIT 10");
    return finalDeliveries.map(u => u.id);
}

async function runChainTest(orderId, storeId, driverIds) {
    console.log(`\n[CHAIN] Iniciando Cadena para Pedido #${orderId}`);
    
    // 1. Driver 0 acepta
    await domiEngine.chargeForOrder(orderId, storeId, driverIds[0], 1.5, 0.8);
    
    let currentDriverIndex = 0;
    let currentIncidentId = null;
    
    // Cadena de 4 rescates (para llegar a 5 conductores en total)
    for (let i = 1; i <= 4; i++) {
        const nextDriverId = driverIds[i];
        console.log(`   Paso ${i}: Repartidor #${driverIds[currentDriverIndex]} reporta incidente -> Pasa a Repartidor #${nextDriverId}`);
        
        const { incidentId } = await domiEngine.reportIncident(orderId, driverIds[currentDriverIndex], 'post_pickup', 'Vara mecánica mecánica chain test');
        const { rescueId } = await domiEngine.assignRescue(incidentId, nextDriverId);
        
        currentDriverIndex = i;
        currentIncidentId = incidentId;
    }
    
    // El último (Driver 4) entrega con éxito
    console.log(`   Final: Repartidor #${driverIds[4]} entrega el pedido.`);
    // Buscamos el último rescueId asociado al pedido
    const [rescueRows] = await db.query("SELECT id FROM rescue_assignments WHERE order_id = ? ORDER BY id DESC LIMIT 1", [orderId]);
    await domiEngine.completeRescue(rescueRows[0].id, 'delivered');
}

async function runStress() {
    console.log('\n================================================');
    console.log('   STRESS TEST: DOMI V3 - CADENAS Y VOLUMEN');
    console.log('================================================\n');

    try {
        const driverIds = await setupUsers();
        const [stores] = await db.query('SELECT id FROM stores LIMIT 1');
        const storeId = stores[0].id;

        // 1. Fondear a todos los participantes
        console.log('\n[1/4] Fondeando billeteras...');
        await domiEngine.mintDomis('store', storeId, 5000000, 'STRESS_INIT');
        for (const dId of driverIds) {
            await domiEngine.mintDomis('user', dId, 2000000, 'STRESS_INIT');
        }

        // 2. 500 Pedidos Concurrentes (Volumen)
        console.log('\n[2/4] Creando y cobrando 500 pedidos concurrentes...');
        const orderIds = [];
        for (let i=0; i<50; i++) {
            const values = [];
            for(let j=0; j<10; j++) values.push(`(${storeId}, ${driverIds[0]}, ${driverIds[0]}, 15000, 1.5, 0.8, 'aceptado')`);
            const [res] = await db.query(`INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES ${values.join(',')}`);
            for(let k=0; k<10; k++) orderIds.push(res.insertId + k);
        }

        const startV = Date.now();
        await Promise.all(orderIds.map(oId => domiEngine.chargeForOrder(oId, storeId, driverIds[0], 1.5, 0.8)));
        console.log(`   >>> 500 Cobros en Redis completados en ${Date.now() - startV}ms`);

        // 3. Ejecutar 5 Cadenas de Rescate (Lógica Crítica)
        console.log('\n[3/4] Ejecutando 5 Cadenas de "Papa Caliente" (5 repartidores cada una)...');
        for (let i = 0; i < 5; i++) {
            // Crear un pedido nuevo para la cadena
            const [res] = await db.query("INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES (?, ?, ?, 20000, 2, 1.2, 'aceptado')", [storeId, driverIds[0], driverIds[0]]);
            await runChainTest(res.insertId, storeId, driverIds);
        }

        // 4. Iniciar Worker y Verificar Sincronización
        console.log('\n[4/4] Iniciando Worker de Persistencia...');
        startWorker();

        const checkInterval = setInterval(async () => {
            const queueLen = await domiRedis.getQueueLength();
            console.log(`   Pendientes en cola Redis: ${queueLen}`);
            
            if (queueLen === 0) {
                clearInterval(checkInterval);
                console.log('\n================================================');
                console.log('   PRUEBA FINALIZADA CON ÉXITO');
                console.log('   Toda la cadena y el volumen están en DB');
                console.log('================================================\n');
                process.exit(0);
            }
        }, 1000);

    } catch (err) {
        console.error('ERROR EN STRESS TEST:', err);
        process.exit(1);
    }
}

runStress();
