// fsm/handlers/rescue/initiate.js
// Escenario: El repartidor reporta un incidente activo en la entrega.
// La orden cambia de 'en_camino' a 'en_rescate'.
//
// El handler crea el registro en rescue_assignments y marca el inicio del rescate.
//
// Ver REGLAS_DE_NEGOCIO.md §9.1 — Activación y reglas de acceso.

async function initiateRescue({ order, actorId, meta = {}, conn }) {
  const incidentId = meta.incidentId;
  if (!incidentId) {
    throw new Error('incidentId is required in meta to initiate rescue');
  }

  // 1. Crear el registro en rescue_assignments con el estado 'buscando_rescatista'
  const [result] = await conn.execute(
    `INSERT INTO rescue_assignments (
      incident_id, order_id, original_driver_id, original_commission, status, created_at
    ) VALUES (?, ?, ?, ?, 'buscando_rescatista', NOW(6))`,
    [
      incidentId,
      order.id,
      order.driver_user_id,
      parseFloat(order.driver_domi_cost || 0)
    ]
  );
  const rescueId = result.insertId;

  // 2. Establecer la fecha de inicio del rescate en la orden
  await conn.execute(
    `UPDATE orders
     SET    rescue_started_at = NOW(6)
     WHERE  id = ?`,
    [order.id]
  );

  return { rescueId };
}

module.exports = initiateRescue;
