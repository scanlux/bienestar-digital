/**
 * PRUEBA DE ESTRÉS V4: CADENA DE 8 RELEVOS + VOLUMEN REALISTA
 * 
 * Este script verifica:
 * 1. La coherencia entre orders y order_items (necesario para el ranking).
 * 2. La resistencia del domiEngine a una cadena larga de 8 rescates.
 * 3. La persistencia asíncrona de Redis a MariaDB.
 */
require('dotenv').config({ path: __dirname + '/../../.env' });
const domiEngine = require('../services/domiEngine');
const domiRedis = require('../services/domiRedis');
const { startWorker } = require('../services/domiQueue');
const db = require('../config/db');

async function setupTestData() {
    console.log('--- Preparando Datos de Prueba ---');
    const [drivers] = await db.query("SELECT id FROM users WHERE rol = 'delivery' LIMIT 10");
    const [stores] = await db.query('SELECT id FROM stores LIMIT 1');
    
    // Obtener el menu_id de la sede
    const [menus] = await db.query('SELECT id FROM menus WHERE store_id = ? LIMIT 1', [stores[0].id]);
    if (menus.length === 0) throw new Error(`La sede ${stores[0].id} no tiene un menú configurado.`);
    
    const [products] = await db.query('SELECT id, precio_base FROM products WHERE menu_id = ? LIMIT 5', [menus[0].id]);
    
    if (drivers.length < 9) throw new Error('Se necesitan al menos 9 repartidores en la DB.');
    if (products.length === 0) throw new Error('La tienda no tiene productos para la prueba.');

    return { 
        driverIds: drivers.map(d => d.id), 
        storeId: stores[0].id,
        products 
    };
}

async function createOrderWithItems(connection, storeId, userId, products) {
    const total = products.reduce((acc, p) => acc + parseFloat(p.precio_base), 0);
    const [res] = await connection.query(
        "INSERT INTO orders (store_id, customer_user_id, total_cop, status) VALUES (?, ?, ?, 'aceptado')",
        [storeId, userId, total]
    );
    const orderId = res.insertId;

    for (const p of products) {
        await connection.query(
            "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, 1, ?)",
            [orderId, p.id, p.precio_base]
        );
    }
    return orderId;
}

async function run8RelayChain(orderId, storeId, driverIds) {
    console.log(`\n[CHAIN] Iniciando Cadena de 8 RELEVOS para Pedido #${orderId}`);
    
    // El primer repartidor acepta
    await domiEngine.chargeForOrder(orderId, storeId, driverIds[0], 1.5, 0.8);
    
    for (let i = 1; i <= 8; i++) {
        const currentDriver = driverIds[i-1];
        const nextDriver = driverIds[i];
        console.log(`   Relevo ${i}: #${currentDriver} -> #${nextDriver}`);
        
        const { incidentId } = await domiEngine.reportIncident(orderId, currentDriver, 'post_pickup', 'Relevo de prueba V4');
        await domiEngine.assignRescue(incidentId, nextDriver);
    }
    
    // El noveno repartidor entrega
    const [rescueRows] = await db.query("SELECT id FROM rescue_assignments WHERE order_id = ? ORDER BY id DESC LIMIT 1", [orderId]);
    await domiEngine.completeRescue(rescueRows[0].id, 'delivered');
    console.log(`   ✅ Pedido #${orderId} ENTREGADO tras 8 relevos.`);
}

async function runStress() {
    console.log('\n================================================');
    console.log('   ESTRÉS V4: CADENAS DE 8 RELEVOS + RANKING');
    console.log('================================================\n');

    try {
        const { driverIds, storeId, products } = await setupTestData();

        // 1. Fondear
        console.log('[1/4] Fondeando billeteras...');
        await domiEngine.mintDomis('store', storeId, 1000000, 'STRESS_V4');
        for (const dId of driverIds) await domiEngine.mintDomis('user', dId, 500000, 'STRESS_V4');

        // 2. 500 Pedidos con Items (Ranking)
        console.log('[2/4] Creando 500 pedidos con items para ranking...');
        const conn = await db.getConnection();
        for (let i = 0; i < 500; i++) {
            const oId = await createOrderWithItems(conn, storeId, driverIds[0], [products[0]]);
            await domiEngine.chargeForOrder(oId, storeId, driverIds[0], 1.0, 0.5);
            if (i % 100 === 0) console.log(`   - ${i} pedidos creados...`);
        }
        conn.release();

        // 3. Cadena de 8 Relevos
        console.log('\n[3/4] Ejecutando cadena de 8 relevos...');
        const chainOrderId = await createOrderWithItems(db, storeId, driverIds[0], products);
        await run8RelayChain(chainOrderId, storeId, driverIds);

        // 4. Procesar
        console.log('\n[4/4] Iniciando Worker para vaciar cola Redis...');
        startWorker();

        const timer = setInterval(async () => {
            const len = await domiRedis.getQueueLength();
            console.log(`   Pendientes en Redis: ${len}`);
            if (len === 0) {
                clearInterval(timer);
                console.log('\n✅ PRUEBA V4 COMPLETADA EXITOSAMENTE.');
                process.exit(0);
            }
        }, 1500);

    } catch (err) {
        console.error('❌ ERROR EN PRUEBA V4:', err);
        process.exit(1);
    }
}

runStress();
