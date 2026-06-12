require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

const API_URL = 'http://127.0.0.1:4000';

async function verifyCloner() {
  console.log('=== TEST DE VERIFICACION: CLONADOR DE CATALOGOS POR SEDE ===');
  
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('SUCCESS: Conectado a la base de datos MariaDB local.');

    // 1. Iniciar sesion como Commerce Admin (para tener permisos de creacion de sede y clone_store_catalog)
    console.log('\n--- 1. Iniciando sesion como Administrador de Comercio ---');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin_commerce_1@trendy.sytes.net',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    console.log('SUCCESS: Token de autenticacion obtenido.');

    // 2. Verificar datos de la sede origen (store_id = 1)
    console.log('\n--- 2. Verificando menus y productos en la sede origen (ID: 1) ---');
    const [originalMenus] = await connection.execute(
      'SELECT m.* FROM menus m JOIN store_menus sm ON m.id = sm.menu_id WHERE sm.store_id = 1'
    );
    console.log(`Menus de Sede 1 en la DB: ${originalMenus.length}`);
    if (originalMenus.length === 0) {
      throw new Error('La sede 1 no tiene menus cargados. Asegurese de que el semillado se realizo correctamente.');
    }
    
    // Contar productos antes de clonar
    const [originalProducts] = await connection.execute(
      'SELECT p.* FROM products p JOIN store_products sp ON p.id = sp.product_id WHERE sp.store_id = 1'
    );
    console.log(`Productos de Sede 1 en la DB: ${originalProducts.length}`);
    if (originalProducts.length === 0) {
      throw new Error('La sede 1 no tiene productos cargados.');
    }

    // 3. Crear una nueva sede clonando desde la sede 1
    console.log('\n--- 3. Creando nueva sede clonada via API (cloneSourceStoreId = 1) ---');
    const uniqueMatricula = `C-${Math.floor(100000 + Math.random() * 900000)}`;
    const newStorePayload = {
      commerce_id: 1, // Mismo comercio
      nombre_sucursal: 'Sede Automatizada Clon',
      direccion: 'Carrera 45 # 10-20',
      latitud: '4.60971',
      longitud: '-74.08175',
      estado: 'operativo',
      telefono_domicilio: '3201234567',
      matricula: uniqueMatricula,
      admin_nombres: 'AdminTest',
      admin_apellidos: 'Clonado',
      admin_email: `test_admin_${Date.now()}@trendy.sytes.net`,
      admin_password: 'adminPassword123',
      cloneSourceStoreId: 1, // <-- ID de la sede a clonar
      schedule: [
        { day_index: 0, status: 'abierto', open_time: '08:00', close_time: '20:00', is_24h: 0 },
        { day_index: 1, status: 'abierto', open_time: '08:00', close_time: '20:00', is_24h: 0 }
      ],
      accounts: []
    };

    const createRes = await axios.post(`${API_URL}/api/manage/stores`, newStorePayload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const newStoreId = createRes.data.id;
    console.log(`SUCCESS: Nueva sede creada con ID: ${newStoreId}`);

    // 4. Verificar en DB que la clonacion ocurrio y los IDs estan asociados (Catálogo Maestro V7)
    console.log('\n--- 4. Verificando asociacion de datos en la nueva sede ---');
    const [clonedMenus] = await connection.execute(
      'SELECT m.* FROM menus m JOIN store_menus sm ON m.id = sm.menu_id WHERE sm.store_id = ?',
      [newStoreId]
    );
    console.log(`Menus asociados a la nueva Sede: ${clonedMenus.length}`);
    if (clonedMenus.length !== originalMenus.length) {
      throw new Error(`Error de clonacion: se asociaron ${clonedMenus.length} menus de ${originalMenus.length}`);
    }

    const [clonedProducts] = await connection.execute(
      'SELECT p.* FROM products p JOIN store_products sp ON p.id = sp.product_id WHERE sp.store_id = ?',
      [newStoreId]
    );
    console.log(`Productos asociados a la nueva Sede: ${clonedProducts.length}`);
    if (clonedProducts.length !== originalProducts.length) {
      throw new Error(`Error de clonacion: se asociaron ${clonedProducts.length} productos de ${originalProducts.length}`);
    }

    // Comprobar que los IDs de menus y productos son exactamente los mismos (Compartidos bajo el Catálogo Maestro)
    const originalMenuIds = originalMenus.map(m => m.id);
    const clonedMenuIds = clonedMenus.map(m => m.id);
    const intersectMenus = originalMenuIds.filter(id => clonedMenuIds.includes(id));
    
    const originalProductIds = originalProducts.map(p => p.id);
    const clonedProductIds = clonedProducts.map(p => p.id);
    const intersectProducts = originalProductIds.filter(id => clonedProductIds.includes(id));

    console.log(`Interseccion de IDs de Menus: ${intersectMenus.length} (esperado: ${originalMenus.length})`);
    console.log(`Interseccion de IDs de Productos: ${intersectProducts.length} (esperado: ${originalProducts.length})`);

    if (intersectMenus.length !== originalMenus.length || intersectProducts.length !== originalProducts.length) {
      throw new Error('ERROR CRITICO: Los IDs asociados no corresponden a los del catálogo maestro del comercio.');
    }

    console.log('SUCCESS: Menus y productos asociados correctamente compartiendo los registros maestros.');

    // 5. Verificar relaciones de ingredientes
    const [originalIngredients] = await connection.execute(
      `SELECT pi.* FROM product_ingredients pi
       JOIN products p ON pi.product_id = p.id
       JOIN store_products sp ON p.id = sp.product_id
       WHERE sp.store_id = 1`
    );
    const [clonedIngredients] = await connection.execute(
      `SELECT pi.* FROM product_ingredients pi
       JOIN products p ON pi.product_id = p.id
       JOIN store_products sp ON p.id = sp.product_id
       WHERE sp.store_id = ?`,
      [newStoreId]
    );

    console.log(`Relaciones de ingredientes origen: ${originalIngredients.length}`);
    console.log(`Relaciones de ingredientes clonados: ${clonedIngredients.length}`);
    if (originalIngredients.length > 0 && clonedIngredients.length !== originalIngredients.length) {
      throw new Error('ERROR: Las relaciones de ingredientes del catálogo maestro no coinciden.');
    }
    console.log('SUCCESS: Las relaciones de ingredientes del catálogo maestro coinciden.');

    // 6. Test de Aislamiento: Modificar un precio local de la nueva sede y verificar que el original no se altera
    console.log('\n--- 5. Editando precio local en la nueva sede clonada (Test de Modificacion Aislada) ---');
    const targetProduct = clonedProducts[0];
    const newPrice = 99999.00;
    
    await axios.post(`${API_URL}/api/manage/store-products`, {
      store_id: newStoreId,
      product_id: targetProduct.id,
      disponible: 1,
      precio_local: newPrice,
      tiempo_prep_local: 15
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Consultar el precio en la sede origen (store_id = 1)
    const [checkOriginal] = await connection.execute(
      'SELECT precio_local FROM store_products WHERE store_id = 1 AND product_id = ?',
      [targetProduct.id]
    );
    // Consultar el precio en la nueva sede
    const [checkCloned] = await connection.execute(
      'SELECT precio_local FROM store_products WHERE store_id = ? AND product_id = ?',
      [newStoreId, targetProduct.id]
    );

    const originalVal = checkOriginal[0]?.precio_local;
    const clonedVal = Number(checkCloned[0]?.precio_local);

    console.log(`Precio local original en Sede 1: ${originalVal} (esperado: NULL o diferente a ${newPrice})`);
    console.log(`Precio local en nueva Sede: ${clonedVal} (esperado: ${newPrice})`);

    if (originalVal !== null && Number(originalVal) === newPrice) {
      throw new Error('ERROR CRITICO: La modificacion local afecto a la sede origen.');
    }
    if (clonedVal !== newPrice) {
      throw new Error(`ERROR CRITICO: El precio local no se guardó correctamente. Valor: ${clonedVal}`);
    }
    console.log('SUCCESS: La modificacion de precios locales es 100% aislada e independiente.');

    // 7. Limpieza en base de datos
    console.log('\n--- 6. Limpiando datos de prueba creados ---');
    
    // Eliminar asociaciones de la sede clonada en tablas puente
    await connection.execute('DELETE FROM store_products WHERE store_id = ?', [newStoreId]);
    await connection.execute('DELETE FROM store_categories WHERE store_id = ?', [newStoreId]);
    await connection.execute('DELETE FROM store_menus WHERE store_id = ?', [newStoreId]);
    
    // Obtener user_id del administrador de la sede creada para borrarlo
    const [storeUser] = await connection.execute('SELECT usuario_id FROM stores WHERE id = ?', [newStoreId]);
    const deleteUserId = storeUser[0]?.usuario_id;

    // Eliminar user_stores
    await connection.execute('DELETE FROM user_stores WHERE store_id = ?', [newStoreId]);
    // Eliminar operating hours
    await connection.execute('DELETE FROM store_operating_hours WHERE store_id = ?', [newStoreId]);
    // Eliminar store
    await connection.execute('DELETE FROM stores WHERE id = ?', [newStoreId]);
    
    if (deleteUserId) {
      await connection.execute('DELETE FROM wallets WHERE usuario_id = ?', [deleteUserId]);
      await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [deleteUserId]);
      await connection.execute('DELETE FROM profiles WHERE usuario_id = ?', [deleteUserId]);
      await connection.execute('DELETE FROM users WHERE id = ?', [deleteUserId]);
    }
    
    console.log('SUCCESS: Todos los datos del test han sido eliminados. Base de datos limpia.');
    console.log('\n=== VERIFICACION DEL CLONADOR DE CATALOGOS CONCLUIDA CON EXITO ===');
  } catch (err) {
    console.error('\n❌ ERROR EN LA VERIFICACION:', err.response?.data || err.message);
  } finally {
    if (connection) await connection.end();
  }
}

verifyCloner();
