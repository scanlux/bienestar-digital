// driver-cancel.js
// Fachada (Facade thin wrapper) del core transaccional legado.
// Delega el flujo completo al nuevo motor de máquina de estados (FSM).

const { executeTransition } = require('./fsm/engine');

async function processDriverCancelPrePickup(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'DRIVER_CANCEL',
    actorId:   order.driver_user_id,
    actorRole: 'driver',
    db:        conn
  });
}

async function processDriverCancelPostPickup(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'DRIVER_CANCEL',
    actorId:   order.driver_user_id,
    actorRole: 'driver',
    db:        conn
  });
}

module.exports = {
  processDriverCancelPrePickup,
  processDriverCancelPostPickup
};
