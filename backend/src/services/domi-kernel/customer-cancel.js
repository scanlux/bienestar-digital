// customer-cancel.js
// Fachada (Facade thin wrapper) del core transaccional legado.
// Delega el flujo completo al nuevo motor de máquina de estados (FSM).

const { executeTransition } = require('./fsm/engine');

async function processDomiCancelPending(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'CUSTOMER_CANCEL',
    actorId:   order.customer_user_id,
    actorRole: 'customer',
    db:        conn
  });
}

async function processDomiCancelPrep(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'CUSTOMER_CANCEL',
    actorId:   order.customer_user_id,
    actorRole: 'customer',
    db:        conn
  });
}

async function processDomiCancelDispatch(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'CUSTOMER_CANCEL',
    actorId:   order.customer_user_id,
    actorRole: 'customer',
    db:        conn
  });
}

async function processDomiCancelTransit(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'CUSTOMER_CANCEL',
    actorId:   order.customer_user_id,
    actorRole: 'customer',
    db:        conn
  });
}

async function processCodCancelPending(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'CUSTOMER_CANCEL',
    actorId:   order.customer_user_id,
    actorRole: 'customer',
    db:        conn
  });
}

async function processCodCancelPrep(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'CUSTOMER_CANCEL',
    actorId:   order.customer_user_id,
    actorRole: 'customer',
    db:        conn
  });
}

async function processCodCancelDispatch(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'CUSTOMER_CANCEL',
    actorId:   order.customer_user_id,
    actorRole: 'customer',
    db:        conn
  });
}

async function processCodCancelTransit(conn, order) {
  return executeTransition({
    orderId:   order.id,
    trigger:   'CUSTOMER_CANCEL',
    actorId:   order.customer_user_id,
    actorRole: 'customer',
    db:        conn
  });
}

module.exports = {
  processDomiCancelPending,
  processDomiCancelPrep,
  processDomiCancelDispatch,
  processDomiCancelTransit,
  processCodCancelPending,
  processCodCancelPrep,
  processCodCancelDispatch,
  processCodCancelTransit
};
