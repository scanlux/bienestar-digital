require('dotenv').config();
const db = require('../config/db');

async function run() {
  let connection;
  try {
    connection = await db.getConnection();
    console.log('Iniciando verificacion diaria de expiracion de planes...');

    // 1. Buscar planes activos expirados
    const [expiredPlans] = await connection.query(`
      SELECT cp.id, cp.commerce_id, cp.end_date
      FROM commerce_plans cp
      WHERE cp.status = 'active' AND cp.end_date <= UTC_TIMESTAMP()
    `);

    console.log(`Se encontraron ${expiredPlans.length} planes expirados para procesar.`);

    // 2. Marcar videos de mas de 5 dias como eliminados
    const [videoCleanResult] = await connection.query(`
      UPDATE commerce_videos
      SET status = 'deleted'
      WHERE status = 'active' AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)
    `);
    console.log(`Se marcaron ${videoCleanResult.affectedRows} videos antiguos de mas de 5 dias como 'deleted'.`);

    let processedCount = 0;
    for (const plan of expiredPlans) {
      const { id, commerce_id } = plan;

      // Iniciar transaccion para cada plan para asegurar atomicidad
      await connection.beginTransaction();

      try {
        // Actualizar estado del plan a 'expired'
        await connection.query(
          "UPDATE commerce_plans SET status = 'expired' WHERE id = ?",
          [id]
        );

        // Contar el numero de sedes activas para este comercio
        const [stores] = await connection.query(
          "SELECT COUNT(*) as storeCount FROM stores WHERE commerce_id = ?",
          [commerce_id]
        );
        const storeCount = stores[0].storeCount;

        // Si tiene menos de 2 sedes, revertir el tipo a 'Comercial'
        if (storeCount < 2) {
          await connection.query(
            "UPDATE commerces SET type = 'Comercial' WHERE id = ?",
            [commerce_id]
          );
          console.log(`Plan ID ${id}: Comercio ID ${commerce_id} revertido a 'Comercial' (Sedes: ${storeCount}).`);
        } else {
          console.log(`Plan ID ${id}: Comercio ID ${commerce_id} mantiene 'Empresarial' porque tiene ${storeCount} sedes.`);
        }

        await connection.commit();
        processedCount++;
      } catch (err) {
        await connection.rollback();
        console.error(`Error procesando expiracion para plan ID ${id}:`, err);
      }
    }

    console.log(`SUCCESS: Verificacion de planes finalizada. Se procesaron ${processedCount} de ${expiredPlans.length} planes.`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR: Error en el cron de verificacion de planes:', err);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

run();
