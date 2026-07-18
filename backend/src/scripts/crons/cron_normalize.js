const db = require('../config/db');
const redisClient = require('../config/redis');
const { generateProductTags } = require('../utils/tagger');

async function logCronStatus(name, status, message) {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const timestamp = new Date().toISOString();
    await redisClient.set(`cron:${name}:last_run`, timestamp);
    await redisClient.set(`cron:${name}:status`, status);
    await redisClient.set(`cron:${name}:message`, message);
    
    // Guardar en el historial (lista en Redis) y mantener un límite de 20 entradas
    const entry = JSON.stringify({ timestamp, status, message });
    await redisClient.lPush(`cron:${name}:history`, entry);
    await redisClient.lTrim(`cron:${name}:history`, 0, 19);

    console.log(`[REDIS LOG] Cron ${name} status set to ${status}: ${message}`);
  } catch (e) {
    console.error('Error logging status to Redis:', e.message);
  }
}

async function run() {
  let connection;
  try {
    connection = await db.getConnection();
    console.log('Iniciando Normalizacion Completa del Catalogo...');

    // 1. Obtener la lista negra (stop_words) actualizada desde la DB
    const [stopWordsRows] = await connection.query('SELECT word FROM stop_words');
    const stopWordsList = stopWordsRows.map(r => r.word);
    console.log(`Lista negra cargada: ${stopWordsList.length} palabras.`);

    // 2. Obtener todos los productos con sus relaciones completas
    const [products] = await connection.query(`
      SELECT p.id, p.nombre, p.descripcion_larga, p.tags as existing_tags, p.es_vegetariano, 
             c.nombre as categoria_nombre, 
             com.nombre as commerce_nombre,
             NULL as branch_name
      FROM products p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN commerces com ON p.commerce_id = com.id
      WHERE p.deleted_at IS NULL
    `);

    console.log(`Procesando ${products.length} productos...`);

    let updatedCount = 0;
    
    // 3. Procesar cada producto y actualizar si los tags cambiaron
    for (const product of products) {
      const { id, nombre, descripcion_larga, categoria_nombre, commerce_nombre, branch_name, existing_tags, es_vegetariano } = product;
      const fullDesc = `${descripcion_larga || ''}`;
      
      const newTags = generateProductTags(
        nombre, 
        fullDesc, 
        categoria_nombre || '', 
        existing_tags || '', 
        stopWordsList, 
        !!es_vegetariano, 
        commerce_nombre || '',
        branch_name || ''
      );
      
      if (newTags !== existing_tags) {
        await connection.query('UPDATE products SET tags = ? WHERE id = ?', [newTags, id]);
        updatedCount++;
      }
    }

    const msg = `Normalizacion completada con exito. Se actualizaron los tags de ${updatedCount} productos.`;
    console.log(`SUCCESS: ${msg}`);
    await logCronStatus('cron_normalize', 'success', msg);
    if (connection) connection.release();
    if (redisClient.isOpen) await redisClient.quit();
    process.exit(0);
  } catch (err) {
    console.error('ERROR: Error en la normalizacion:', err);
    await logCronStatus('cron_normalize', 'failure', err.message);
    if (connection) connection.release();
    if (redisClient.isOpen) await redisClient.quit();
    process.exit(1);
  }
}

run();
