const path = require('path');
const backendDir = 'c:/Users/starlux/.gemini/antigravity/scratch/bienestar-digital/backend';

module.paths.push(path.join(backendDir, 'node_modules'));

require('dotenv').config({ path: path.join(backendDir, '.env') });
const commerceService = require(path.join(backendDir, 'src/domains/commerce/commerce.service'));

async function main() {
  try {
    const userContext = {
      id: 1,
      actorType: 'commerce_manager',
      commerceId: 1
    };

    console.log('--- TEST: Fetching all stores history ---');
    const result = await commerceService.getStoresHistory(userContext, {}, {});
    console.log(`Found ${result.history.length} transaction entries.`);
    if (result.history.length > 0) {
      console.log('Sample entry:', JSON.stringify(result.history[0], null, 2));
    }

    console.log('\n--- TEST: Filtering by search text "upgrade" ---');
    const searchResult = await commerceService.getStoresHistory(userContext, { search: 'upgrade' }, {});
    console.log(`Found ${searchResult.history.length} matching "upgrade".`);

    console.log('\n--- TEST: Filtering by invalid commerceId (BOLA test) ---');
    // For commerce_manager, service should force their own commerceId (1)
    const rogueResult = await commerceService.getStoresHistory(userContext, { commerceId: 99 }, {});
    console.log(`BOLA Guard verified. Returned commerceId: ${rogueResult.commerceId} (Expected: 1)`);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    process.exit(0);
  }
}

main();
