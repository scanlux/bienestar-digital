// fsm/transitions.js
// Tabla de transiciones del FSM. Es configuración pura: sin lógica de negocio.
// Estructura: TRANSITIONS[ACTION][estadoActual] → { nextState, handler, guard? }
//
// Si un par (ACTION, estadoActual) NO existe en esta tabla, el motor lanza
// automáticamente FSM_TRANSITION_NOT_ALLOWED (400). No se necesitan if/else
// en los handlers para rechazar transiciones inválidas.
//
// guardExtras: condiciones adicionales que se agregan al WHERE del UPDATE atómico.
//   - null         → AND columna IS NULL
//   - 'NOT NULL'   → AND columna IS NOT NULL
//   - cualquier valor → AND columna = valor (escapado)

const TRANSITIONS = {

  // ── CLIENTE CANCELA ───────────────────────────────────────────────────────
  // Fuente: MATRIZ_CANCELACIONES.md
  CUSTOMER_CANCEL: {
    pendiente:      { nextState: 'cancelado', handler: 'customer/cancelPendiente' },
    aceptado:       { nextState: 'cancelado', handler: 'customer/cancelPreparation' },
    preparando:     { nextState: 'cancelado', handler: 'customer/cancelPreparation' },
    listo:          { nextState: 'cancelado', handler: 'customer/cancelPreparation' },
    listo_despacho: { nextState: 'cancelado', handler: 'customer/cancelDispatch' },
    en_camino:      { nextState: 'cancelado', handler: 'customer/cancelTransit' },
    en_rescate:     { nextState: 'cancelado', handler: 'customer/cancelTransit' },
    // entregado, cancelado → BLOQUEADOS (no aparecen = 400 automático)
  },

  // ── SEDE CANCELA ──────────────────────────────────────────────────────────
  // Fuente: MATRIZ_CANCELACIONES_SEDE.md
  // REGLA: La sede NO puede cancelar en en_camino ni en_rescate.
  //        El producto ya salió físicamente del establecimiento.
  STORE_CANCEL: {
    pendiente:      { nextState: 'cancelado', handler: 'store/cancelPreparation' },
    aceptado:       { nextState: 'cancelado', handler: 'store/cancelPreparation' },
    preparando:     { nextState: 'cancelado', handler: 'store/cancelPreparation' },
    listo:          { nextState: 'cancelado', handler: 'store/cancelPreparation' },
    listo_despacho: { nextState: 'cancelado', handler: 'store/cancelDispatch' },
    // en_camino:  BLOQUEADO — REGLAS §2
    // en_rescate: BLOQUEADO — sistema tiene control total
  },

  // ── REPARTIDOR CANCELA ────────────────────────────────────────────────────
  // Fuente: MATRIZ_CANCELACIONES_REPARTIDOR.md
  // REGLA: cancelar en preparando/listo/listo_despacho NO cancela la orden.
  //        El pedido retrocede a 'listo' y se busca nuevo conductor.
  // REGLA: pendiente/aceptado → no aplica (sin conductor asignado).
  DRIVER_CANCEL: {
    preparando:     {
      nextState: 'listo',
      handler:   'driver/cancelPreparation',
      guard:     { driver_user_id: 'NOT NULL' }, // conductor debe estar asignado
    },
    listo:          {
      nextState: 'listo',
      handler:   'driver/cancelPreparation',
      guard:     { driver_user_id: 'NOT NULL' },
    },
    listo_despacho: { nextState: 'listo',     handler: 'driver/cancelDispatch' },
    en_camino:      { nextState: 'cancelado', handler: 'driver/cancelTransit' },
    // en_rescate → usar RESCUE_FAIL_RESCUER (el rescatista falla, no es DRIVER_CANCEL)
  },

  // ── PROTOCOLO EN_RESCATE ──────────────────────────────────────────────────
  // Fuente: MATRIZ_CANCELACIONES_REPARTIDOR.md Sección C
  // Fuente: REGLAS_DE_NEGOCIO.md Sección 9

  // Repartidor reporta incidente activo durante en_camino
  RESCUE_INITIATE: {
    en_camino: { nextState: 'en_rescate', handler: 'rescue/initiate' },
  },

  // Sistema asigna rescatista — solo si aún no hay rescatista activo
  RESCUE_ASSIGN: {
    en_rescate: {
      nextState: 'en_rescate',
      handler:   'rescue/assignRescuer',
      guard:     { rescue_driver_id: null }, // solo si sin rescatista
    },
  },

  // Rescatista confirma entrega exitosa
  RESCUE_COMPLETE: {
    en_rescate: {
      nextState: 'entregado',
      handler:   'rescue/complete',
      guard:     { rescue_driver_id: 'NOT NULL' },
    },
  },

  // El rescatista también falla → cadena de rescate (vuelve a en_rescate)
  // El caller debe incluir en meta: { rescue_attempt_count: N } para el guard
  RESCUE_FAIL_RESCUER: {
    en_rescate: {
      nextState: 'en_rescate',
      handler:   'rescue/failRescuer',
      guard:     { rescue_driver_id: 'NOT NULL' },
    },
  },

  // Sistema auto-cancela por timeout o por superar max_attempts
  RESCUE_TIMEOUT: {
    en_rescate: { nextState: 'cancelado', handler: 'rescue/systemTimeout' },
  },

  // ── FLUJO NORMAL (no cancelación) ─────────────────────────────────────────
  // Incluidos para completitud del FSM; los handlers respectivos
  // se implementarán en módulos separados del flujo positivo.
  ORDER_ACCEPT: {
    pendiente: { nextState: 'aceptado', handler: 'store/accept' },
  },
  ORDER_DELIVER: {
    en_camino:  { nextState: 'entregado', handler: 'driver/deliver' },
  },

};

module.exports = TRANSITIONS;
