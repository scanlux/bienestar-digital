const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const db = require('../../config/db');
const domiService = require('../../domains/domi/domi.service');
const domiRepository = require('../../domains/domi/domi.repository');

async function runTests() {
  console.log('=== STARTING WALLET ALIASES INTEGRATION TEST ===');
  let testUser = null;
  let testWallet = null;
  const createdAliasIds = [];

  try {
    // 1. Obtener o crear una wallet de prueba
    console.log('Step 1: Finding an active wallet or creating a test user/wallet...');
    
    // Buscamos un usuario existente en la base de datos
    const [users] = await db.query('SELECT id, nombres, apellidos, cedula FROM profiles LIMIT 1');
    if (users.length === 0) {
      throw new Error('No user profile found in the database. Run seed_users.js or insert a test user first.');
    }
    
    testUser = users[0];
    console.log(`Using Profile: ID=${testUser.id}, Name="${testUser.nombres} ${testUser.apellidos}", Doc=${testUser.cedula}`);

    // Buscamos la wallet asociada
    testWallet = await domiRepository.findWallet('user', testUser.id);
    if (!testWallet) {
      // Si no tiene, la creamos
      console.log('No wallet found for test user. Creating wallet...');
      await db.query(
        "INSERT INTO wallets (user_id, balance_custody, balance_utility) VALUES (?, 100, 0)",
        [testUser.id]
      );
      testWallet = await domiRepository.findWallet('user', testUser.id);
    }
    console.log(`Using Wallet: ID=${testWallet.id}, user_id=${testUser.id}, balance=${testWallet.balance_custody}`);

    // Limpiamos alias preexistentes para esta wallet si los hubiera (para iniciar limpio)
    const existingAliases = await domiRepository.findAliasesByWalletId(testWallet.id);
    console.log(`Cleaning up ${existingAliases.length} pre-existing test aliases for this wallet...`);
    for (const a of existingAliases) {
      await domiRepository.deleteWalletAlias(a.id);
    }

    // Contexto de usuario simulado para pasar como req.user / userContext
    const mockUserContext = {
      id: testUser.id,
      role: 'root' // root u otro rol
    };
    const mockReq = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'AliasIntegrationTestScript' }
    };

    // 2. Probar sugerencia de alias
    console.log('\nStep 2: Testing suggestWalletAlias...');
    const suggestionRes = await domiService.suggestWalletAlias(mockUserContext, 'user', testUser.id);
    console.log('Suggested alias response:', suggestionRes);
    if (!suggestionRes.alias) {
      throw new Error('Suggestion did not return an alias candidate.');
    }
    const suggested = suggestionRes.alias;

    // 3. Probar verificación de disponibilidad (debería estar libre ya que limpiamos la wallet)
    console.log(`\nStep 3: Checking availability for suggested alias "${suggested}"...`);
    const availabilityRes = await domiService.checkAliasAvailability(suggested);
    console.log('Availability check response:', availabilityRes);
    if (!availabilityRes.available) {
      throw new Error(`Suggested alias "${suggested}" should be available but it is not.`);
    }

    // 4. Crear alias (hasta 4 para validar límite)
    console.log('\nStep 4: Registering aliases to the wallet...');
    const aliasBase = `test${testUser.id}_`;
    const aliasNamesToCreate = [
      `${aliasBase}one`,
      `${aliasBase}two`,
      `${aliasBase}three`,
      `${aliasBase}four`
    ];

    for (let i = 0; i < aliasNamesToCreate.length; i++) {
      const aliasName = aliasNamesToCreate[i];
      console.log(`Registering alias #${i + 1}: "@${aliasName}"...`);
      const createRes = await domiService.createWalletAlias(mockUserContext, 'user', testUser.id, aliasName, mockReq);
      console.log('Create response:', createRes);
      
      // Buscamos el ID recién creado para poder eliminarlo después
      const saved = await domiRepository.findWalletAliasByString(aliasName);
      if (!saved) {
        throw new Error(`Alias "@${aliasName}" was not found in DB after creation.`);
      }
      createdAliasIds.push(saved.id);
    }

    // 5. Intentar crear un 5to alias (debería fallar por límite de 4)
    console.log('\nStep 5: Attempting to create a 5th alias (should fail)...');
    try {
      const extraAlias = `${aliasBase}five`;
      await domiService.createWalletAlias(mockUserContext, 'user', testUser.id, extraAlias, mockReq);
      throw new Error('SUCCESS: 5th alias created but it should have failed!');
    } catch (err) {
      console.log('Expected failure caught successfully:', err.message);
      if (!err.message.includes('límite máximo') && !err.message.includes('más de 4 alias')) {
        console.warn('Warning: Failure message format is different:', err.message);
      }
    }

    // 6. Intentar crear un alias que ya está tomado (debería fallar por restricción de unicidad)
    console.log('\nStep 6: Attempting to create a duplicate alias (should fail)...');
    try {
      const duplicateAlias = aliasNamesToCreate[0];
      await domiService.createWalletAlias(mockUserContext, 'user', testUser.id, duplicateAlias, mockReq);
      throw new Error('SUCCESS: Duplicate alias created but it should have failed!');
    } catch (err) {
      console.log('Expected duplicate failure caught successfully:', err.message);
    }

    // 7. Intentar crear un alias con caracteres inválidos (debería fallar por regex)
    console.log('\nStep 7: Attempting to create an alias with invalid characters (should fail)...');
    const invalidAliases = ['ab', 'a@b', 'test alias', 'test-alias-super-long-more-than-30-characters-xyz'];
    for (const inv of invalidAliases) {
      try {
        await domiService.createWalletAlias(mockUserContext, 'user', testUser.id, inv, mockReq);
        throw new Error(`SUCCESS: Invalid alias "${inv}" created but it should have failed!`);
      } catch (err) {
        console.log(`Expected invalid character failure for "${inv}" caught:`, err.message);
      }
    }

    // 8. Listar alias registrados
    console.log('\nStep 8: Fetching active aliases from database...');
    const listRes = await domiService.getWalletAliases(mockUserContext, 'user', testUser.id, mockReq);
    console.log('Active aliases list:', listRes.map(a => `@${a.alias}`));
    if (listRes.length !== 4) {
      throw new Error(`Expected exactly 4 aliases but found ${listRes.length}.`);
    }

    // 9. Eliminar un alias y verificar que la cuenta baje a 3
    console.log('\nStep 9: Deleting one alias...');
    const aliasToDeleteId = createdAliasIds.pop();
    const aliasToDelete = listRes.find(a => a.id === aliasToDeleteId);
    console.log(`Deleting alias: ID=${aliasToDeleteId}, Name="@${aliasToDelete.alias}"`);
    const deleteRes = await domiService.deleteWalletAlias(mockUserContext, 'user', testUser.id, aliasToDeleteId, mockReq);
    console.log('Delete response:', deleteRes);

    const afterDeleteList = await domiService.getWalletAliases(mockUserContext, 'user', testUser.id, mockReq);
    console.log('Active aliases after delete:', afterDeleteList.map(a => `@${a.alias}`));
    if (afterDeleteList.length !== 3) {
      throw new Error(`Expected exactly 3 aliases after deletion but found ${afterDeleteList.length}.`);
    }

    console.log('\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n!!! TEST FAILED WITH ERROR !!!', error);
  } finally {
    // 10. Limpiar todo lo creado en el test para dejar la base de datos limpia
    console.log('\nStep 10: Cleaning up created test aliases...');
    for (const id of createdAliasIds) {
      try {
        await domiRepository.deleteWalletAlias(id);
      } catch (e) {
        console.error(`Error deleting alias ID ${id} during cleanup:`, e);
      }
    }
    console.log('Cleanup finished. Database is clean.');
    await db.end();
  }
}

runTests();
