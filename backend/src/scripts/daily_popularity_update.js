const db = require('../config/db');

async function updatePopularity() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    console.log('Iniciando actualización de popularidad...');

    // Calcular ventas totales por producto desde order_items
    const [sales] = await connection.query(`
      SELECT product_id, SUM(quantity) as total_sales
      FROM order_items
      GROUP BY product_id
    `);

    console.log(`Procesando ventas para ${sales.length} productos...`);

    for (const sale of sales) {
      await connection.query(`
        INSERT INTO product_popularity (product_id, sales_count, last_update)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
          sales_count = VALUES(sales_count),
          last_update = NOW()
      `, [sale.product_id, sale.total_sales]);
    }

    await connection.commit();
    console.log('SUCCESS: Popularidad actualizada correctamente.');
    process.exit(0);
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('ERROR: Error actualizando popularidad:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

updatePopularity();
