require('dotenv').config();
const db = require('../config/db');
const domiRedis = require('../services/domiRedis');
const orderService = require('../domains/order/order.service');

async function main() {
  const email = 'nuevo_cod_customer@trendy.sytes.net';
  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    console.log('--- 1. LIMPIEZA DE DATOS PREVIOS ---');
    // Buscar si existe el usuario previo para borrar en orden de dependencias
    const [existingUsers] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      const oldUserId = existingUsers[0].id;
      console.log(`Eliminando datos del usuario anterior con ID ${oldUserId}...`);
      
      // Eliminar items de pedidos y pedidos
      await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_user_id = ?)', [oldUserId]);
      await conn.query('DELETE FROM orders WHERE customer_user_id = ?', [oldUserId]);
      // Eliminar wallets
      await conn.query('DELETE FROM wallets WHERE owner_type = "user" AND owner_id = ?', [oldUserId]);
      // Eliminar roles
      await conn.query('DELETE FROM user_roles WHERE user_type = "user" AND user_id = ?', [oldUserId]);
      // Eliminar profiles
      await conn.query('DELETE FROM profiles WHERE usuario_id = ?', [oldUserId]);
      // Eliminar usuario
      await conn.query('DELETE FROM users WHERE id = ?', [oldUserId]);
    }

    console.log('\n--- 2. CREACIÓN DE NUEVO USUARIO CUSTOMER (SCORE POR DEFECTO) ---');
    // Insertamos el usuario sin especificar domi_score ni crear wallets o user_roles manualmente
    // Queremos comprobar que el valor predeterminado del campo y los triggers funcionan correctamente
    const [userInsertResult] = await conn.query(`
      INSERT INTO users (email, password_hash, estado, rol)
      VALUES (?, 'mock_hash', 'activo', 'customer')
    `, [email]);
    const newUserId = userInsertResult.insertId;
    console.log(`Usuario creado exitosamente con ID: ${newUserId}`);

    // Insertar perfil del usuario
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Cliente', 'Nuevo COD', '88776655', '3008877665')
    `, [newUserId]);

    // Consultar el usuario creado para verificar el Score asignado por defecto
    const [[userData]] = await conn.query('SELECT id, email, domi_score, rol FROM users WHERE id = ?', [newUserId]);
    console.log('Datos del usuario recién insertado:');
    console.log(`- Email: ${userData.email}`);
    console.log(`- Rol asignado: ${userData.rol}`);
    console.log(`- Score obtenido (DEFAULT): ${userData.domi_score}`);

    if (userData.domi_score !== 0) {
      throw new Error(`Error: El score por defecto del usuario nuevo debería ser 0, pero se obtuvo ${userData.domi_score}`);
    }
    console.log('✅ Validación exitosa: Un usuario nuevo arranca con cero score por definición de columna.');

    // Validar asignación de rol en user_roles por trigger `auto_assign_customer_role`
    const [userRoles] = await conn.query('SELECT * FROM user_roles WHERE user_type = "user" AND user_id = ?', [newUserId]);
    console.log(`Registros en user_roles por trigger (Esperado: 1): ${userRoles.length}`);
    if (userRoles.length === 0 || userRoles[0].role_id !== 10) {
      throw new Error('Error: El trigger auto_assign_customer_role no asignó correctamente el role_id 10 (customer).');
    }
    console.log('✅ Validación exitosa: El trigger auto_assign_customer_role asignó el rol de customer en user_roles.');

    // Validar creación de wallet por trigger `auto_create_user_wallet`
    const [wallets] = await conn.query('SELECT * FROM wallets WHERE owner_type = "user" AND owner_id = ?', [newUserId]);
    console.log(`Registros en wallets por trigger (Esperado: 1): ${wallets.length}`);
    if (wallets.length === 0) {
      throw new Error('Error: El trigger auto_create_user_wallet no creó la billetera del usuario automáticamente.');
    }
    const walletId = wallets[0].id;
    console.log(`✅ Validación exitosa: El trigger auto_create_user_wallet creó la billetera ID: ${walletId}.`);

    console.log('\n--- 3. ASIGNANDO 20 DOMIs DE BALANCE AL CUSTOMER ---');
    // Actualizar saldo en MariaDB
    await conn.query('UPDATE wallets SET balance_custody = 20.0000 WHERE id = ?', [walletId]);
    // Actualizar saldo en Redis
    await domiRedis.setBalance('user', newUserId, 20.0);
    console.log('Saldo actualizado en MariaDB y Redis a 20.0000 DOMIs.');

    // Consultar balance en MariaDB para reconfirmar
    const [[walletAfter]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [walletId]);
    const redisBal = await domiRedis.getWalletBalance('user', newUserId);
    console.log(`- Balance en DB: ${walletAfter.balance_custody} DOMIs`);
    console.log(`- Balance en Redis: ${redisBal} DOMIs`);

    console.log('\n--- 4. OBTENIENDO O CREANDO PRODUCTO EN SEDE CHAPINERO M ---');
    // Sede Chapinero M
    const [stores] = await conn.query('SELECT * FROM stores WHERE nombre_sucursal = ?', ['Sede Chapinero M']);
    if (stores.length === 0) {
      throw new Error('Error: No se encontró la tienda "Sede Chapinero M" en la base de datos.');
    }
    const storeId = stores[0].id;
    console.log(`Tienda encontrada: Sede Chapinero M (ID: ${storeId})`);

    // Buscar o insertar producto
    const [existingProducts] = await conn.query('SELECT * FROM products WHERE store_id = ? AND disponible = 1', [storeId]);
    let productId;
    let productPrice = 25000; // Más de 20,000 COP

    if (existingProducts.length > 0) {
      productId = existingProducts[0].id;
      productPrice = parseFloat(existingProducts[0].precio_base);
      console.log(`Producto existente encontrado: ${existingProducts[0].nombre} (ID: ${productId}, Precio: ${productPrice} COP)`);
      if (productPrice <= 20000) {
        // Actualizar el precio para que supere los 20000 COP si es necesario para la prueba
        await conn.query('UPDATE products SET precio_base = 25000 WHERE id = ?', [productId]);
        productPrice = 25000;
        console.log(`Precio del producto actualizado a ${productPrice} COP para cumplir requerimiento de > 20000 COP.`);
      }
    } else {
      const [prodInsertResult] = await conn.query(`
        INSERT INTO products (store_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano)
        VALUES (?, 'Super Combo Chapinero', 'Combo premium de la sede Chapinero para pruebas.', 25000, 15, 1, 0)
      `, [storeId]);
      productId = prodInsertResult.insertId;
      console.log(`Producto fixture creado con ID: ${productId} y precio de ${productPrice} COP.`);
    }

    console.log('\n--- 5. PRUEBA DE CREACIÓN DE PEDIDO POR EL ENDPOINT / SERVICE ---');
    console.log('Intentando crear el pedido COD usando orderService.createOrder (Debería fallar por la regla de Score)...');
    
    const clientUser = { id: newUserId, rol: 'customer', actorType: 'user' };
    const orderData = {
      store_id: storeId,
      customer_user_id: newUserId,
      total_cop: productPrice,
      payment_method_customer: 'cash_cod',
      delivery_address: 'Calle 60 # 13-45, Chapinero, Bogotá',
      items: [
        { product_id: productId, quantity: 1, price: productPrice }
      ]
    };

    try {
      await orderService.createOrder(clientUser, orderData, {});
      console.log('❌ Error: El backend permitió la creación del pedido COD a pesar de tener score 0. Esto incumple las reglas de negocio.');
    } catch (err) {
      console.log('✅ Comportamiento esperado: La creación del pedido a nivel de servicio falló con el siguiente error:');
      console.log(`   --> "${err.message}" (Código: ${err.statusCode || 400})`);
    }

    console.log('\n--- 6. CREACIÓN DIRECTA DEL PEDIDO EN LA BASE DE DATOS (BYPASS DE VALIDACIÓN) ---');
    console.log('Insertando el pedido directamente en MariaDB para simular que le llega a la sede en estado pendiente...');
    
    // Insertar en la tabla orders
    const [orderInsert] = await conn.query(`
      INSERT INTO orders (
        store_id, 
        customer_user_id, 
        total_cop, 
        domi_cost, 
        driver_domi_cost,
        payment_method_customer,
        status, 
        delivery_address
      ) VALUES (?, ?, ?, 0.0000, 0.0000, 'cash_cod', 'pendiente', ?)
    `, [storeId, newUserId, productPrice, orderData.delivery_address]);
    const orderId = orderInsert.insertId;
    console.log(`Pedido insertado exitosamente en MariaDB con ID: ${orderId}`);

    // Insertar en la tabla order_items
    await conn.query(`
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES (?, ?, 1, ?)
    `, [orderId, productId, productPrice]);
    console.log(`Ítem del producto insertado exitosamente para el pedido ID: ${orderId}`);

    // Validar el estado del pedido insertado en la base de datos
    const [[insertedOrder]] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    console.log('\n--- 7. RESULTADOS FINALES Y VERIFICACIÓN ---');
    console.log('Pedido insertado en base de datos:');
    console.log(`- ID Pedido: ${insertedOrder.id}`);
    console.log(`- ID Sede: ${insertedOrder.store_id} (Sede Chapinero M)`);
    console.log(`- ID Cliente: ${insertedOrder.customer_user_id}`);
    console.log(`- Total COP: ${insertedOrder.total_cop} COP (Esperado: > 20000)`);
    console.log(`- Método de Pago: ${insertedOrder.payment_method_customer}`);
    console.log(`- Estado en DB: ${insertedOrder.status}`);

    if (insertedOrder.status !== 'pendiente') {
      throw new Error(`Error: El estado del pedido en la base de datos debería ser 'pendiente', pero es '${insertedOrder.status}'`);
    }
    console.log('✅ Validación exitosa: El pedido se guardó correctamente y quedó en estado "pendiente".');

    await conn.commit();
    console.log('\nTransacción completada exitosamente.');

  } catch (error) {
    console.error('Ocurrió un error en el script:', error);
    if (conn) {
      await conn.rollback();
      console.log('Transacción revertida debido al error.');
    }
  } finally {
    if (conn) {
      conn.release();
    }
    process.exit();
  }
}

main();
