const db = require('../../config/db');

class CatalogRepository {
  async findMenus(storeId, commerceId, isSystem) {
    let query = 'SELECT m.* FROM menus m';
    const params = [];
    if (storeId) {
      query += ' JOIN store_menus sm ON m.id = sm.menu_id WHERE sm.store_id = ?';
      params.push(storeId);
      if (!isSystem) {
        query += ' AND m.commerce_id = ?';
        params.push(commerceId);
      }
    } else if (!isSystem) {
      query += ' WHERE m.commerce_id = ?';
      params.push(commerceId);
    }
    query += ' ORDER BY m.orden ASC, m.nombre ASC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  async findMenuById(id) {
    const [rows] = await db.query('SELECT * FROM menus WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async checkMenuOwnership(menuId, commerceId) {
    const [rows] = await db.query(
      'SELECT commerce_id FROM menus WHERE id = ?',
      [menuId]
    );
    return rows[0] && rows[0].commerce_id === commerceId;
  }

  async createMenu(data) {
    const { commerce_id, nombre, disponible, descripcion, orden } = data;
    const [result] = await db.query(
      'INSERT INTO menus (commerce_id, nombre, disponible, descripcion, orden) VALUES (?, ?, ?, ?, ?)',
      [commerce_id, nombre, disponible !== undefined ? disponible : 1, descripcion || null, orden || 0]
    );
    return result.insertId;
  }

  async updateMenu(id, data) {
    const { nombre, disponible, descripcion, orden, commerce_id } = data;
    if (commerce_id) {
      await db.query(
        'UPDATE menus SET nombre=?, disponible=?, descripcion=?, orden=?, commerce_id=? WHERE id=?',
        [nombre, disponible !== undefined ? disponible : 1, descripcion || null, orden || 0, commerce_id, id]
      );
    } else {
      await db.query(
        'UPDATE menus SET nombre=?, disponible=?, descripcion=?, orden=? WHERE id=?',
        [nombre, disponible !== undefined ? disponible : 1, descripcion || null, orden || 0, id]
      );
    }
  }

  async deleteMenu(id) {
    await db.query('DELETE FROM menus WHERE id = ?', [id]);
  }

  async findMenusByCommerce(commerceId) {
    const [rows] = await db.query(
      'SELECT * FROM menus WHERE commerce_id = ? ORDER BY orden ASC, nombre ASC',
      [commerceId]
    );
    return rows;
  }

  async findProductsByCommerce(commerceId) {
    const [rows] = await db.query(
      `SELECT p.* 
       FROM products p
       JOIN stores s ON p.store_id = s.id
       WHERE s.commerce_id = ?
       ORDER BY p.nombre ASC`,
      [commerceId]
    );
    return rows;
  }

  async findCategories(menuId) {
    const [rows] = await db.query('SELECT * FROM categorias WHERE menu_id = ? ORDER BY orden_visual ASC', [menuId]);
    return rows;
  }

  async findCategoryById(id) {
    const [rows] = await db.query('SELECT * FROM categorias WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async checkCategoryOwnership(categoryId, commerceId) {
    const [rows] = await db.query(
      `SELECT m.commerce_id 
       FROM categorias c 
       JOIN menus m ON c.menu_id = m.id 
       WHERE c.id = ?`,
      [categoryId]
    );
    return rows[0] && rows[0].commerce_id === commerceId;
  }

  async createCategory(data) {
    const { menu_id, nombre, descripcion, orden_visual, disponible } = data;
    const [result] = await db.query(
      'INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual, disponible) VALUES (?, ?, ?, ?, ?)',
      [menu_id, nombre, descripcion, orden_visual || 0, disponible !== undefined ? disponible : 1]
    );
    return result.insertId;
  }

  async updateCategory(id, data) {
    const { nombre, descripcion, orden_visual, disponible } = data;
    await db.query(
      'UPDATE categorias SET nombre=?, descripcion=?, orden_visual=?, disponible=? WHERE id=?',
      [nombre, descripcion, orden_visual, disponible !== undefined ? disponible : 1, id]
    );
  }

  async deleteCategory(id) {
    await db.query('DELETE FROM categorias WHERE id = ?', [id]);
  }

  async findProducts(categoriaId) {
    const [rows] = await db.query('SELECT * FROM products WHERE categoria_id = ? ORDER BY nombre ASC', [categoriaId]);
    return rows;
  }

  async findProductById(id) {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async checkProductOwnership(productId, commerceId) {
    const [rows] = await db.query(
      `SELECT m.commerce_id 
       FROM products p 
       JOIN categorias c ON p.categoria_id = c.id 
       JOIN menus m ON c.menu_id = m.id 
       WHERE p.id = ?`,
      [productId]
    );
    return rows[0] && rows[0].commerce_id === commerceId;
  }

  async createProduct(data) {
    const { store_id, categoria_id, menu_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano, image_url, tags } = data;
    const [result] = await db.query(
      `INSERT INTO products 
       (store_id, categoria_id, menu_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano, image_url, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        store_id, categoria_id, menu_id, nombre, descripcion_larga, precio_base,
        tiempo_prep_estimado, disponible !== undefined ? disponible : 1,
        es_vegetariano || 0, image_url || null, tags || null
      ]
    );
    return result.insertId;
  }

  async updateProduct(id, data) {
    const { nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano, image_url, tags, categoria_id } = data;
    await db.query(
      `UPDATE products 
       SET nombre=?, descripcion_larga=?, precio_base=?, tiempo_prep_estimado=?, disponible=?, es_vegetariano=?, image_url=?, tags=?, categoria_id=?
       WHERE id=?`,
      [
        nombre, descripcion_larga, precio_base, tiempo_prep_estimado,
        disponible !== undefined ? disponible : 1, es_vegetariano || 0,
        image_url || null, tags || null, categoria_id, id
      ]
    );
  }

  async deleteProduct(id) {
    await db.query('DELETE FROM products WHERE id = ?', [id]);
  }

  async findStoreProducts(storeId, categoriaId) {
    const [rows] = await db.query(
      `SELECT p.id, sp.store_id, p.categoria_id, p.menu_id, p.nombre, p.descripcion_larga, 
              p.precio_base, p.tiempo_prep_estimado, 
              sp.disponible, sp.disponible as habilitado,
              sp.precio_local, sp.tiempo_prep_local,
              COALESCE(sp.precio_local, p.precio_base) as precio_efectivo,
              COALESCE(sp.tiempo_prep_local, p.tiempo_prep_estimado) as tiempo_efectivo,
              p.image_url, p.es_vegetariano, p.tags
       FROM products p
       JOIN store_products sp ON p.id = sp.product_id
       WHERE sp.store_id = ? AND p.categoria_id = ?
       ORDER BY p.nombre ASC`,
      [storeId, categoriaId]
    );
    return rows;
  }

  async toggleStoreMenu(storeId, menuId, disponible) {
    await db.query(
      `INSERT INTO store_menus (store_id, menu_id, disponible)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE disponible = VALUES(disponible)`,
      [storeId, menuId, disponible]
    );
  }

  async toggleStoreCategory(storeId, categoriaId, disponible) {
    await db.query(
      `INSERT INTO store_categories (store_id, categoria_id, disponible)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE disponible = VALUES(disponible)`,
      [storeId, categoriaId, disponible]
    );
  }

  async toggleStoreProduct(storeId, productId, disponible, precioLocal, tiempoPrepLocal) {
    await db.query(
      `INSERT INTO store_products (store_id, product_id, disponible, precio_local, tiempo_prep_local)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         disponible = VALUES(disponible),
         precio_local = VALUES(precio_local),
         tiempo_prep_local = VALUES(tiempo_prep_local)`,
      [storeId, productId, disponible, precioLocal, tiempoPrepLocal]
    );
  }

  async findIngredients() {
    const [rows] = await db.query('SELECT * FROM ingredients ORDER BY nombre ASC');
    return rows;
  }

  async createIngredient(nombre, esAlergeno) {
    const [result] = await db.query('INSERT INTO ingredients (nombre, es_alergeno) VALUES (?, ?)', [nombre, esAlergeno || 0]);
    return result.insertId;
  }

  async updateIngredient(id, nombre, esAlergeno) {
    await db.query('UPDATE ingredients SET nombre=?, es_alergeno=? WHERE id=?', [nombre, esAlergeno, id]);
  }

  async findStoreMenusAvailability(storeId) {
    const [rows] = await db.query('SELECT menu_id, disponible FROM store_menus WHERE store_id = ?', [storeId]);
    return rows;
  }

  async findStoreCategoriesWithAvailability(storeId, menuId) {
    const [rows] = await db.query(
      `SELECT c.id, c.menu_id, c.nombre, c.descripcion, c.orden_visual, 
              COALESCE(sc.disponible, c.disponible) as habilitada,
              COALESCE(sc.disponible, c.disponible) as disponible
       FROM categorias c
       LEFT JOIN store_categories sc ON c.id = sc.categoria_id AND sc.store_id = ?
       WHERE c.menu_id = ?
       ORDER BY c.orden_visual ASC`,
      [storeId, menuId]
    );
    return rows;
  }
}

module.exports = new CatalogRepository();
