require('dotenv').config();
const db = require('../src/config/db');

async function seed() {
  try {
    console.log('--- Iniciando Saneo de Datos del Marketplace ---');

    // 1. Obtener todas las sedes
    const [stores] = await db.query('SELECT s.*, c.id as commerce_id FROM stores s JOIN commerces c ON s.commerce_id = c.id');
    console.log(`Se encontraron ${stores.length} sedes.`);

    for (const store of stores) {
      console.log(`Procesando sede: ${store.nombre_sucursal} (ID: ${store.id})`);

      // 2. Obtener o crear menú principal
      let [menus] = await db.query('SELECT id FROM menus WHERE store_id = ?', [store.id]);
      let menuId;

      if (menus.length === 0) {
        console.log(`  - Creando menú para sede ${store.id}...`);
        const [menuResult] = await db.query(
          'INSERT INTO menus (store_id, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
          [store.id, 'Menú Principal', 'Nuestra selección exclusiva de productos', 0]
        );
        menuId = menuResult.insertId;
      } else {
        menuId = menus[0].id;
      }

      // 3. Verificar si tiene categorías y productos
      const [existingProducts] = await db.query('SELECT id FROM products WHERE menu_id = ?', [menuId]);

      if (existingProducts.length === 0) {
        console.log(`  - Llenando productos para el menú ${menuId}...`);
        
        const categories = [
          { nombre: 'Entradas', items: ['Empanadas Gourmet', 'Patacones con Todo', 'Ceviche de la Casa', 'Deditos de Queso'] },
          { nombre: 'Platos Fuertes', items: ['Bandeja Paisa Premium', 'Ajiaco Santafereño', 'Parrillada Mixta', 'Pasta Alfredo con Pollo', 'Hamburguesa Artesanal'] },
          { nombre: 'Bebidas y Postres', items: ['Limonada de Coco', 'Jugo Natural de Temporada', 'Tres Leches Cremoso', 'Flan de Caramelo Casero', 'Café Especial'] }
        ];

        for (let i = 0; i < categories.length; i++) {
          const cat = categories[i];
          const [catResult] = await db.query(
            'INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual) VALUES (?, ?, ?, ?)',
            [menuId, cat.nombre, `Variedad de ${cat.nombre}`, i]
          );
          const catId = catResult.insertId;

          for (let j = 0; j < cat.items.length; j++) {
            const baseItemName = cat.items[j];
            // Para evitar colisiones con el índice único (commerce_id, nombre), 
            // añadimos el nombre de la sucursal al nombre del producto.
            const itemName = `${baseItemName} - ${store.nombre_sucursal}`; 
            
            const price = Math.floor(Math.random() * (45000 - 12000 + 1) + 12000);
            const imageId = Math.floor(Math.random() * 1000);
            const imageUrl = `https://loremflickr.com/600/400/food?lock=${imageId}`;

            await db.query(
              'INSERT INTO products (commerce_id, categoria_id, menu_id, nombre, descripcion_corta, descripcion_larga, precio_base, image_url, disponible, tiempo_prep_estimado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                store.commerce_id, 
                catId, 
                menuId, 
                itemName, 
                `Delicioso ${baseItemName.toLowerCase()} preparado al instante.`,
                `Nuestro ${baseItemName.toLowerCase()} es famoso por su sabor auténtico y el uso de ingredientes de la más alta calidad. Una experiencia gastronómica inolvidable para compartir o disfrutar solo en ${store.nombre_sucursal}.`,
                price,
                imageUrl,
                true,
                25
              ]
            );
          }
        }
        console.log(`  - Menú, 3 categorías y ${categories.reduce((acc, c) => acc + c.items.length, 0)} productos creados con éxito.`);
      } else {
        console.log(`  - La sede ya tiene menú. Saltando...`);
      }
    }

    console.log('--- Saneo Completado con Éxito ---');
    process.exit(0);
  } catch (error) {
    console.error('Error durante el saneo:', error);
    process.exit(1);
  }
}

seed();
