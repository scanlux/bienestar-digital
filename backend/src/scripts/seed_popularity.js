require('dotenv').config({ path: __dirname + '/../../.env' });
const db = require('../config/db');

async function seed() {
  let connection;
  try {
    connection = await db.getConnection();
    console.log('🔄 Iniciando simulación de datos de popularidad...');

    // 1. Asumimos que las tablas ya existen según la infraestructura (IaC)
    console.log('🛠️ Omitiendo creación de tablas (Permisos IaC)...');

    // 2. Obtener productos para simular compras
    const [products] = await connection.query('SELECT id, precio_base, commerce_id FROM products LIMIT 100');
    if (products.length === 0) {
      console.log('❌ No hay productos en la base de datos para simular compras.');
      return;
    }
    
    const [stores] = await connection.query('SELECT id FROM stores LIMIT 1');
    if (stores.length === 0) {
      console.log('❌ No hay sedes en la base de datos.');
      return;
    }
    const validStoreId = stores[0].id;
    
    const [users] = await connection.query('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos.');
      return;
    }
    const validUserId = users[0].id;

    // No podemos borrar order_items por reglas de inmutabilidad financiera (IaC)
    console.log('🧹 Conservando order_items previos...');

    // 3. Generar órdenes ficticias
    const NUM_ORDERS = 100;
    console.log(`📦 Generando ${NUM_ORDERS} pedidos ficticios...`);
    
    await connection.beginTransaction();

    for (let i = 0; i < NUM_ORDERS; i++) {
      const storeId = validStoreId;
      const customerUserId = validUserId;
      
      // 1. Preparar items y calcular total
      const numItems = Math.floor(Math.random() * 4) + 1;
      let orderTotal = 0;
      const orderItemsToInsert = [];

      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 5) + 1;
        const price = product.precio_base || 15000;
        
        orderTotal += (price * qty);
        orderItemsToInsert.push({ productId: product.id, qty, price });
      }

      // 2. Insertar orden con el total ya calculado
      const [orderResult] = await connection.query(`
        INSERT INTO orders (store_id, customer_user_id, total_cop) VALUES (?, ?, ?)
      `, [storeId, customerUserId, orderTotal]);
      
      const orderId = orderResult.insertId;
      
      // 3. Insertar items
      for (const item of orderItemsToInsert) {
        await connection.query(`
          INSERT INTO order_items (order_id, product_id, quantity, price)
          VALUES (?, ?, ?, ?)
        `, [orderId, item.productId, item.qty, item.price]);
      }
    }

    await connection.commit();
    console.log(`✅ Se generaron las órdenes correctamente.`);

    // 4. Se omite el Trigger de Popularidad aquí
    console.log(`🏆 Órdenes listas. Por favor, haz clic en 'Actualizar Ranking Ahora' en el panel web.`);

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ Error durante la simulación:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

seed();
