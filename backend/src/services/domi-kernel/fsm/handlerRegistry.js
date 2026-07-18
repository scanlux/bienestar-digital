// fsm/handlerRegistry.js
// Mapa que asocia cada clave de handler configurada en transitions.js
// con su función de ejecución correspondiente.

const handlerRegistry = {
  // CLIENTE
  'customer/cancelPendiente':   require('./handlers/customer/cancelPendiente'),
  'customer/cancelPreparation': require('./handlers/customer/cancelPreparation'),
  'customer/cancelDispatch':    require('./handlers/customer/cancelDispatch'),
  'customer/cancelTransit':     require('./handlers/customer/cancelTransit'),

  // REPARTIDOR
  'driver/cancelPreparation':   require('./handlers/driver/cancelPreparation'),
  'driver/cancelDispatch':      require('./handlers/driver/cancelDispatch'),
  'driver/cancelTransit':       require('./handlers/driver/cancelTransit'),

  // SEDE
  'store/cancelPreparation':    require('./handlers/store/cancelPreparation'),
  'store/cancelDispatch':       require('./handlers/store/cancelDispatch'),

  // PROTOCOLO RESCATE
  'rescue/initiate':            require('./handlers/rescue/initiate'),
  'rescue/assignRescuer':       require('./handlers/rescue/assignRescuer'),
  'rescue/complete':            require('./handlers/rescue/complete'),
  'rescue/failRescuer':         require('./handlers/rescue/failRescuer'),
  'rescue/systemTimeout':       require('./handlers/rescue/systemTimeout'),
};

module.exports = handlerRegistry;
