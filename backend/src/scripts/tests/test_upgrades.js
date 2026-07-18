require('dotenv').config();
const db = require('../../config/db');
const upgradesService = require('../../domains/upgrades/upgrades.service');
const catalogService = require('../../domains/catalog/catalog.service');

async function test() {
  console.log('=== INICIANDO PRUEBAS DE LÍMITES Y MERCADO DE MEJORAS ===');

  // 1. Obtener primer comercio de la base de datos
  const [commerces] = await db.query('SELECT id FROM commerces LIMIT 1');
  const commerce = commerces[0];
  if (!commerce) {
    console.error('ERROR: No hay comercios creados para probar.');
    process.exit(1);
  }
  const commerceId = commerce.id;
  console.log(`Usando Comercio ID: ${commerceId} para las pruebas.`);

  // 2. Obtener una sede asociada al comercio
  const [stores] = await db.query('SELECT id FROM stores WHERE commerce_id = ? LIMIT 1', [commerceId]);
  const store = stores[0];
  if (!store) {
    console.error('ERROR: No hay sedes asociadas al comercio para probar.');
    process.exit(1);
  }
  const storeId = store.id;

  // Obtener un menu asociado a la sede para probar categorias
  const [menus] = await db.query('SELECT id FROM menus WHERE store_id = ? LIMIT 1', [storeId]);
  let menuId;
  if (menus.length === 0) {
    // Crear un menu de prueba
    const [res] = await db.query('INSERT INTO menus (store_id, nombre, disponible) VALUES (?, "Menú Test", 1)', [storeId]);
    menuId = res.insertId;
    console.log(`Creado Menú de prueba ID: ${menuId}`);
  } else {
    menuId = menus[0].id;
  }

  // Crear mas de 3 categorias para probar limites
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('DELETE FROM categorias WHERE menu_id = ?', [menuId]);
  await db.query('INSERT INTO categorias (menu_id, nombre, disponible, orden_visual) VALUES (?, "Cat 1", 1, 0)', [menuId]);
  await db.query('INSERT INTO categorias (menu_id, nombre, disponible, orden_visual) VALUES (?, "Cat 2", 1, 1)', [menuId]);
  await db.query('INSERT INTO categorias (menu_id, nombre, disponible, orden_visual) VALUES (?, "Cat 3", 1, 2)', [menuId]);
  await db.query('INSERT INTO categorias (menu_id, nombre, disponible, orden_visual) VALUES (?, "Cat 4", 1, 3)', [menuId]);
  await db.query('INSERT INTO categorias (menu_id, nombre, disponible, orden_visual) VALUES (?, "Cat 5", 1, 4)', [menuId]);
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Insertadas 5 categorías de prueba.');

  // Limpiar cualquier upgrade existente para comenzar limpio
  await db.query('DELETE FROM commerce_upgrades WHERE commerce_id = ?', [commerceId]);

  // Contexto de usuario simulado (comercio)
  const mockUserContext = {
    id: 1,
    actorType: 'user',
    rol: 'commerce_manager',
    commerceId: commerceId,
    permissions: ['view_catalog', 'view_upgrades_market', 'purchase_upgrades']
  };

  const mockReq = {
    ip: '127.0.0.1',
    headers: {}
  };

  console.log('\n--- PRUEBA 1: Sin Estado Empresarial (Límites activos) ---');
  let categories = await catalogService.getCategories(mockUserContext, menuId, mockReq);
  console.log(`Total categorias obtenidas: ${categories.length}`);
  
  // Las primeras 3 deben estar desbloqueadas
  console.log(`Cat 1: disponible = ${categories[0].disponible}, locked = ${categories[0].locked}`);
  console.log(`Cat 2: disponible = ${categories[1].disponible}, locked = ${categories[1].locked}`);
  console.log(`Cat 3: disponible = ${categories[2].disponible}, locked = ${categories[2].locked}`);
  // Las siguientes deben estar bloqueadas
  console.log(`Cat 4: disponible = ${categories[3].disponible}, locked = ${categories[3].locked}`);
  console.log(`Cat 5: disponible = ${categories[4].disponible}, locked = ${categories[4].locked}`);

  if (categories[3].locked !== true || categories[3].disponible !== 0) {
    console.error('FAIL: La categoría 4 debería estar bloqueada.');
    process.exit(1);
  }
  console.log('SUCCESS: Límites aplicados correctamente sin upgrade.');

  console.log('\n--- PRUEBA 2: Compra de Upgrade "Estado Empresarial" ---');
  // Asegurar que la billetera tenga saldo suficiente
  const [commerceRows] = await db.query('SELECT usuario_id FROM commerces WHERE id = ?', [commerceId]);
  const commerceUserId = commerceRows[0]?.usuario_id;
  await db.query(
    'UPDATE wallets SET balance_custody = 100.0 WHERE user_id = ?',
    [commerceUserId]
  );
  // Habilitar retiros temporalmente para permitir compra de upgrades en la prueba
  await db.query('UPDATE system_financial_flags SET enabled = 1 WHERE `key` = "withdrawals_enabled"');

  const purchaseRes = await upgradesService.purchaseUpgrade(mockUserContext, 'estado_empresarial', mockReq);
  console.log('Compra procesada:', purchaseRes.message);

  console.log('\n--- PRUEBA 3: Con Estado Empresarial (Límites removidos) ---');
  categories = await catalogService.getCategories(mockUserContext, menuId, mockReq);
  console.log(`Total categorias obtenidas: ${categories.length}`);
  console.log(`Cat 1: disponible = ${categories[0].disponible}, locked = ${categories[0].locked}`);
  console.log(`Cat 4: disponible = ${categories[3].disponible}, locked = ${categories[3].locked}`);
  console.log(`Cat 5: disponible = ${categories[4].disponible}, locked = ${categories[4].locked}`);

  if (categories[3].locked === true || categories[3].disponible !== 1) {
    console.error('FAIL: La categoría 4 debería estar desbloqueada y disponible.');
    process.exit(1);
  }
  console.log('SUCCESS: Límites removidos correctamente con upgrade activo.');

  console.log('\n--- PRUEBA 4: Con Upgrade Vencido (Límites reactivados) ---');
  await db.query('DELETE FROM commerce_upgrades WHERE commerce_id = ?', [commerceId]);
  await db.query(
    'INSERT INTO commerce_upgrades (commerce_id, user_id, upgrade_type, price_domis, expires_at) VALUES (?, ?, "estado_empresarial", 80.0, NOW() - INTERVAL 1 HOUR)',
    [commerceId, mockUserContext.id]
  );
  categories = await catalogService.getCategories(mockUserContext, menuId, mockReq);
  console.log(`Total categorias obtenidas: ${categories.length}`);
  console.log(`Cat 1: disponible = ${categories[0].disponible}, locked = ${categories[0].locked}`);
  console.log(`Cat 4: disponible = ${categories[3].disponible}, locked = ${categories[3].locked}`);
  console.log(`Cat 5: disponible = ${categories[4].disponible}, locked = ${categories[4].locked}`);

  if (categories[3].locked !== true || categories[3].disponible !== 0) {
    console.error('FAIL: La categoría 4 debería estar bloqueada por expiración del upgrade.');
    process.exit(1);
  }
  console.log('SUCCESS: Límites reactivados correctamente tras expiración.');

  // Limpieza final
  await db.query('DELETE FROM commerce_upgrades WHERE commerce_id = ?', [commerceId]);
  // Restaurar estado original de retiros
  await db.query('UPDATE system_financial_flags SET enabled = 0 WHERE `key` = "withdrawals_enabled"');
  console.log('\n=== TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO ===');
  process.exit(0);
}

test().catch(err => {
  console.error('ERROR EN PRUEBAS:', err);
  process.exit(1);
});
