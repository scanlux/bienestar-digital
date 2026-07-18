const db = require('../../config/db');

class IntelligenceRepository {
  async findStopWords() {
    const [rows] = await db.query('SELECT * FROM stop_words ORDER BY word ASC');
    return rows;
  }

  async insertStopWords(values) {
    await db.query('INSERT IGNORE INTO stop_words (word) VALUES ?', [values]);
  }

  async deleteStopWord(id) {
    await db.query('DELETE FROM stop_words WHERE id = ?', [id]);
  }

  async findProductPopularityRanking() {
    const [rows] = await db.query(`
      SELECT 
        p.id as product_id,
        p.nombre,
        p.image_url,
        pp.sales_count,
        pp.last_update,
        com.nombre as commerce_name
      FROM product_popularity pp
      INNER JOIN products p ON pp.product_id = p.id
      INNER JOIN stores s ON p.store_id = s.id
      INNER JOIN commerces com ON s.commerce_id = com.id
      WHERE p.deleted_at IS NULL AND p.disponible = 1
      ORDER BY pp.sales_count DESC
      LIMIT 100
    `);
    return rows;
  }

  async findSalesByProduct() {
    const [rows] = await db.query(`
      SELECT product_id, SUM(quantity) as total_sales
      FROM order_items
      GROUP BY product_id
    `);
    return rows;
  }

  async upsertProductPopularity(productId, salesCount) {
    await db.query(`
      INSERT INTO product_popularity (product_id, sales_count, last_update)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE sales_count = VALUES(sales_count), last_update = NOW()
    `, [productId, salesCount]);
  }

  async findProductTotalCount() {
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM products');
    return total;
  }

  async findStopWordsList() {
    const [rows] = await db.query('SELECT word FROM stop_words');
    return rows.map(r => r.word);
  }

  async findProductsForTagging(limit, offset) {
    const [rows] = await db.query(`
      SELECT p.id, p.nombre, p.descripcion_larga, p.tags as existing_tags, p.es_vegetariano, 
             c.nombre as categoria_nombre, com.nombre as commerce_nombre
      FROM products p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN commerces com ON s.commerce_id = com.id
      WHERE p.deleted_at IS NULL
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    return rows;
  }

  async updateProductTags(productId, tags) {
    await db.query('UPDATE products SET tags = ? WHERE id = ?', [tags, productId]);
  }
}

module.exports = new IntelligenceRepository();
