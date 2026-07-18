const db = require('../config/db');
const redisClient = require('../config/redis');

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
    const msg = `Popularidad actualizada correctamente para ${sales.length} productos.`;
    console.log(`SUCCESS: ${msg}`);
    await logCronStatus('daily_popularity_update', 'success', msg);
    if (connection) connection.release();
    if (redisClient.isOpen) await redisClient.quit();
    process.exit(0);
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('ERROR: Error actualizando popularidad:', err);
    await logCronStatus('daily_popularity_update', 'failure', err.message);
    if (connection) connection.release();
    if (redisClient.isOpen) await redisClient.quit();
    process.exit(1);
  }
}

updatePopularity();
