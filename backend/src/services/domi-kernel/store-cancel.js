// store-cancel.js
// Fachada (Facade thin wrapper) del core transaccional legado.
// Delega el flujo completo al nuevo motor de máquina de estados (FSM).

const { executeTransition } = require('./fsm/engine');

async function processStoreCancelDomi(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'STORE_CANCEL',
    actorId:   order.store_id,
    actorRole: 'store',
    db:        conn
  });
}

async function processStoreCancelCod(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'STORE_CANCEL',
    actorId:   order.store_id,
    actorRole: 'store',
    db:        conn
  });
}

module.exports = {
  processStoreCancelDomi,
  processStoreCancelCod
};
