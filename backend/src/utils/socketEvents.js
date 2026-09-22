const SOCKET_EVENTS = Object.freeze({
  // Emitidos por el servidor al cliente
  ORDER_STATUS_CHANGE: 'order_status_change',
  NEW_ORDER_MESSAGE:   'new_message',
  JOINED_ROOM:         'joined_room',
  WS_ERROR:            'error_ws',
  FORCE_LOGOUT:        'force_logout',
  STORE_UPDATED:       'store:updated',
  JOINED_FEED_ROOM:    'joined_feed_room',

  // Emitidos por el cliente al servidor
  JOIN_ORDER_ROOM:     'join_order_room',
  JOIN_FEED_ROOM:      'join_feed_room',
});

module.exports = { SOCKET_EVENTS };
