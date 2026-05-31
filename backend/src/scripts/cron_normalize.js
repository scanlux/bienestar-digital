const db = require('../config/db');
const { generateProductTags } = require('../utils/tagger');

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

    console.log(`SUCCESS: Normalizacion completada con exito. Se actualizaron los tags de ${updatedCount} productos.`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR: Error en la normalizacion:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

run();
