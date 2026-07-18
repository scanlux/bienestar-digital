const db = require('../../config/db');

class CatalogRepository {
  async findMenus(storeId, commerceId, isSystem) {
    let query = 'SELECT m.* FROM menus m';
    const params = [];
    if (storeId) {
      if (!isSystem) {
        query += ' JOIN stores s ON m.store_id = s.id WHERE m.store_id = ? AND s.commerce_id = ? AND m.deleted_at IS NULL';
        params.push(storeId, commerceId);
      } else {
        query += ' WHERE m.store_id = ? AND m.deleted_at IS NULL';
        params.push(storeId);
      }
    } else if (commerceId) {
      query += ' JOIN stores s ON m.store_id = s.id WHERE s.commerce_id = ? AND m.deleted_at IS NULL';
      params.push(commerceId);
    } else {
      query += ' WHERE m.deleted_at IS NULL';
    }
    query += ' ORDER BY m.orden ASC, m.nombre ASC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  async findMenuById(id) {
    const [rows] = await db.query('SELECT * FROM menus WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] || null;
  }

  async checkMenuOwnership(menuId, commerceId) {
    const [rows] = await db.query(
      'SELECT s.commerce_id FROM menus m JOIN stores s ON m.store_id = s.id WHERE m.id = ?',
      [menuId]
    );
    return rows[0] && rows[0].commerce_id === commerceId;
  }

  async createMenu(data) {
    const { store_id, nombre, disponible, descripcion, orden } = data;
    const [result] = await db.query(
      'INSERT INTO menus (store_id, nombre, disponible, descripcion, orden) VALUES (?, ?, ?, ?, ?)',
      [store_id, nombre, disponible !== undefined ? disponible : 1, descripcion || null, orden || 0]
    );
    return result.insertId;
  }

  async updateMenu(id, data) {
    const { nombre, disponible, descripcion, orden, store_id } = data;
    if (store_id) {
      await db.query(
        'UPDATE menus SET nombre=?, disponible=?, descripcion=?, orden=?, store_id=? WHERE id=?',
        [nombre, disponible !== undefined ? disponible : 1, descripcion || null, orden || 0, store_id, id]
      );
    } else {
      await db.query(
        'UPDATE menus SET nombre=?, disponible=?, descripcion=?, orden=? WHERE id=?',
        [nombre, disponible !== undefined ? disponible : 1, descripcion || null, orden || 0, id]
      );
    }
  }

  async softDeleteMenu(id, conn) {
    const q = conn || db;
    // Cascada en orden: primero productos, luego categorias, luego menu
    // Tambien limpia product_popularity: los eliminados no deben aparecer en sugerencias
    await q.query(`
      DELETE pp FROM product_popularity pp
      INNER JOIN products p ON pp.product_id = p.id
      INNER JOIN categorias c ON p.categoria_id = c.id
      WHERE c.menu_id = ?
    `, [id]);
    await q.query(`
      UPDATE products p
      JOIN categorias c ON p.categoria_id = c.id
      SET p.image_url = NULL, p.deleted_at = NOW(6)
      WHERE c.menu_id = ? AND p.deleted_at IS NULL
    `, [id]);
    await q.query(
      'UPDATE categorias SET deleted_at = NOW(6) WHERE menu_id = ? AND deleted_at IS NULL',
      [id]
    );
    await q.query('UPDATE menus SET deleted_at = NOW(6) WHERE id = ?', [id]);
  }

  async findMenusByCommerce(commerceId) {
    const [rows] = await db.query(
      'SELECT m.* FROM menus m JOIN stores s ON m.store_id = s.id WHERE s.commerce_id = ? AND m.deleted_at IS NULL ORDER BY m.orden ASC, m.nombre ASC',
      [commerceId]
    );
    return rows;
  }

  async findProductsByCommerce(commerceId) {
    const [rows] = await db.query(
      `SELECT p.* 
       FROM products p
       JOIN stores s ON p.store_id = s.id
       WHERE s.commerce_id = ? AND p.deleted_at IS NULL
       ORDER BY p.nombre ASC`,
      [commerceId]
    );
    return rows;
  }

  async findCategories(menuId) {
    const [rows] = await db.query(
      'SELECT * FROM categorias WHERE menu_id = ? AND deleted_at IS NULL ORDER BY orden_visual ASC',
      [menuId]
    );
    return rows;
  }

  async findCategoryById(id) {
    const [rows] = await db.query('SELECT * FROM categorias WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] || null;
  }

  async checkCategoryOwnership(categoryId, commerceId) {
    const [rows] = await db.query(
      `SELECT s.commerce_id 
       FROM categorias c 
       JOIN menus m ON c.menu_id = m.id 
       JOIN stores s ON m.store_id = s.id
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

  async softDeleteCategory(id, conn) {
    const q = conn || db;
    // Limpiar popularidad de los productos de esta categoria antes del soft delete
    await q.query(
      'DELETE FROM product_popularity WHERE product_id IN (SELECT id FROM products WHERE categoria_id = ?)',
      [id]
    );
    // Cascada: primero productos, luego la categoria
    await q.query(
      'UPDATE products SET image_url = NULL, deleted_at = NOW(6) WHERE categoria_id = ? AND deleted_at IS NULL',
      [id]
    );
    await q.query('UPDATE categorias SET deleted_at = NOW(6) WHERE id = ?', [id]);
  }

  async findProducts(categoriaId) {
    const [rows] = await db.query(
      'SELECT * FROM products WHERE categoria_id = ? AND deleted_at IS NULL ORDER BY nombre ASC',
      [categoriaId]
    );
    return rows;
  }

  async findProductById(id) {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] || null;
  }

  async checkProductOwnership(productId, commerceId) {
    const [rows] = await db.query(
      `SELECT s.commerce_id 
       FROM products p 
       JOIN stores s ON p.store_id = s.id 
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

  async softDeleteProduct(id, conn) {
    const q = conn || db;
    // Limpiar popularidad: un producto eliminado no debe aparecer en sugerencias
    await q.query('DELETE FROM product_popularity WHERE product_id = ?', [id]);
    await q.query('UPDATE products SET image_url = NULL, deleted_at = NOW(6) WHERE id = ?', [id]);
  }

  async findStoreProducts(storeId, categoriaId) {
    const [rows] = await db.query(
      `SELECT p.id, p.store_id, p.categoria_id, p.menu_id, p.nombre, p.descripcion_larga, 
              p.precio_base, p.tiempo_prep_estimado, 
              p.disponible, p.disponible as habilitado,
              NULL as precio_local, NULL as tiempo_prep_local,
              p.precio_base as precio_efectivo,
              p.tiempo_prep_estimado as tiempo_efectivo,
              p.image_url, p.es_vegetariano, p.tags
       FROM products p
       WHERE p.store_id = ? AND p.categoria_id = ? AND p.deleted_at IS NULL
       ORDER BY p.nombre ASC`,
      [storeId, categoriaId]
    );
    return rows;
  }

  async toggleStoreMenu(storeId, menuId, disponible) {
    await db.query(
      'UPDATE menus SET disponible = ? WHERE id = ? AND store_id = ?',
      [disponible, menuId, storeId]
    );
  }

  async toggleStoreCategory(storeId, categoriaId, disponible) {
    await db.query(
      'UPDATE categorias c JOIN menus m ON c.menu_id = m.id SET c.disponible = ? WHERE c.id = ? AND m.store_id = ?',
      [disponible, categoriaId, storeId]
    );
  }

  async toggleStoreProduct(storeId, productId, disponible, precioLocal, tiempoPrepLocal) {
    const params = [disponible];
    let query = 'UPDATE products SET disponible = ?';
    if (precioLocal !== undefined && precioLocal !== null) {
      query += ', precio_base = ?';
      params.push(precioLocal);
    }
    if (tiempoPrepLocal !== undefined && tiempoPrepLocal !== null) {
      query += ', tiempo_prep_estimado = ?';
      params.push(tiempoPrepLocal);
    }
    query += ' WHERE id = ? AND store_id = ?';
    params.push(productId, storeId);
    await db.query(query, params);
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
    const [rows] = await db.query(
      'SELECT id as menu_id, disponible FROM menus WHERE store_id = ? AND deleted_at IS NULL',
      [storeId]
    );
    return rows;
  }

  async findStoreCategoriesWithAvailability(storeId, menuId) {
    const [rows] = await db.query(
      `SELECT c.id, c.menu_id, c.nombre, c.descripcion, c.orden_visual, 
              c.disponible as habilitada,
              c.disponible as disponible
       FROM categorias c
       JOIN menus m ON c.menu_id = m.id
       WHERE m.store_id = ? AND c.menu_id = ? AND c.deleted_at IS NULL
       ORDER BY c.orden_visual ASC`,
      [storeId, menuId]
    );
    return rows;
  }

  async getMenuDeletePreview(menuId) {
    const [[catRow]] = await db.query(
      'SELECT COUNT(*) as total FROM categorias WHERE menu_id = ? AND deleted_at IS NULL',
      [menuId]
    );
    const [[prodRow]] = await db.query(
      `SELECT COUNT(*) as total FROM products p
       JOIN categorias c ON p.categoria_id = c.id
       WHERE c.menu_id = ? AND p.deleted_at IS NULL`,
      [menuId]
    );
    return { categorias: catRow.total, productos: prodRow.total };
  }

  async getCategoryDeletePreview(categoriaId) {
    const [[prodRow]] = await db.query(
      'SELECT COUNT(*) as total FROM products WHERE categoria_id = ? AND deleted_at IS NULL',
      [categoriaId]
    );
    return { productos: prodRow.total };
  }
}

module.exports = new CatalogRepository();
