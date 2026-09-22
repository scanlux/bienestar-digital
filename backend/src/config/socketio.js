const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('./redis.pubsub');
const jwt = require('jsonwebtoken');
const sessionStampService = require('../services/sessionStampService');
const db = require('./db');
const appLogger = require('../utils/appLogger');
const { SOCKET_EVENTS } = require('../utils/socketEvents');
const { logSecurityEvent } = require('../utils/securityLogger');

let ioInstance = null;

async function verifyWSUser(token) {
  if (!token) throw new Error('NO_TOKEN');
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!verified.session_stamp) {
      throw new Error('INVALID_SESSION_STAMP');
    }
    const currentStamp = await sessionStampService.getStamp(verified.actorType, verified.id);
    if (currentStamp !== verified.session_stamp) {
      throw new Error('STAMP_MISMATCH');
    }
    return verified;
  } catch (err) {
    throw new Error('AUTH_FAILED');
  }
}

async function validateOrderAccess(user, orderId) {
  const [orderRows] = await db.query('SELECT store_id, customer_user_id, driver_user_id FROM orders WHERE id = ?', [orderId]);
  if (orderRows.length === 0) return false;
  const order = orderRows[0];

  if (user.rol === 'customer') {
    return order.customer_user_id === user.id;
  }
  if (user.rol === 'driver') {
    return order.driver_user_id === user.id;
  }
  
  // Para operadores de sede o comercio:
  const orderRepository = require('../domains/order/order.repository');
  const belongs = await orderRepository.checkStoreBelongsToCommerce(order.store_id, user.commerceId);
  return belongs;
}

async function initSocketIO(httpServer) {
  await Promise.all([pubClient.connect(), subClient.connect()]);

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    adapter: createAdapter(pubClient, subClient),
  });

  // RBAC Middleware: verificar JWT en handshake
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const user = await verifyWSUser(token);
      socket.user = user;
      next();
    } catch (err) {
      await logSecurityEvent(null, 'WS_AUTH_FAILED', 'HIGH', null, {
        socketId: socket.id,
        ip: socket.handshake.address,
        reason: err.message || 'auth_failed'
      });
      next(new Error('AUTH_FAILED'));
    }
  });

  io.on('connection', (socket) => {
    appLogger.info(`[WS] Usuario ${socket.user?.id} (rol: ${socket.user?.rol}) conectado.`);

    // Unirse a la sala del pedido
    socket.on(SOCKET_EVENTS.JOIN_ORDER_ROOM, async ({ orderId }) => {
      try {
        const parsedOrderId = parseInt(orderId, 10);
        if (isNaN(parsedOrderId)) {
          socket.emit(SOCKET_EVENTS.WS_ERROR, { code: 'INVALID_ORDER_ID' });
          return;
        }

        const canJoin = await validateOrderAccess(socket.user, parsedOrderId);
        if (!canJoin) {
          socket.emit(SOCKET_EVENTS.WS_ERROR, { code: 'FORBIDDEN' });
          return;
        }

        const room = `order:${parsedOrderId}`;
        socket.join(room);
        appLogger.info(`[WS] Usuario ${socket.user.id} se unió a la sala ${room}`);
        socket.emit(SOCKET_EVENTS.JOINED_ROOM, { room });
      } catch (err) {
        appLogger.error(`[WS] Error en join_order_room para usuario ${socket.user?.id}: ${err.message}`);
        socket.emit(SOCKET_EVENTS.WS_ERROR, { code: 'SERVER_ERROR' });
      }
    });

    // Unirse al canal del feed público
    socket.on(SOCKET_EVENTS.JOIN_FEED_ROOM, async () => {
      try {
        const room = 'feed:public';
        socket.join(room);
        appLogger.info(`[WS] Usuario ${socket.user.id} (${socket.user.rol}) se unió al feed.`);
        socket.emit(SOCKET_EVENTS.JOINED_FEED_ROOM, { room });
        await logSecurityEvent(socket.user.id, 'WS_FEED_JOINED', 'LOW', null, { userId: socket.user.id });
      } catch (err) {
        appLogger.error(`[WS] Error en join_feed_room para usuario ${socket.user?.id}: ${err.message}`);
        socket.emit(SOCKET_EVENTS.WS_ERROR, { code: 'SERVER_ERROR' });
      }
    });

    socket.on('disconnect', async () => {
      appLogger.info(`[WS] Usuario ${socket.user?.id} desconectado.`);
      try {
        if (socket.user?.id) {
          await logSecurityEvent(socket.user.id, 'WS_FEED_LEFT', 'LOW', null, { userId: socket.user.id });
        }
      } catch (err) {
        // Ignorar fallas silenciosas en la desconexión del registro
      }
    });
  });

  // Namespace de Sincronización de Dispositivos /device-sync con Token Secreto (PSK)
  const deviceSyncNs = io.of('/device-sync');
  deviceSyncNs.use(async (socket, next) => {
    try {
      const pskToken = socket.handshake.auth?.token || socket.handshake.query?.token;
      const expectedSecret = process.env.TELEMETRY_API_KEY || process.env.SYNC_SECRET_KEY || 'HkA8RFB9Yx2M1Lp7vQ4w9R0';
      if (!pskToken || pskToken !== expectedSecret) {
        await logSecurityEvent(null, 'WS_DEVICE_SYNC_AUTH_FAILED', 'HIGH', null, {
          socketId: socket.id,
          ip: socket.handshake.address,
          reason: 'invalid_psk_token'
        });
        return next(new Error('AUTH_FAILED_INVALID_PSK'));
      }
      socket.deviceId = socket.handshake.auth?.deviceId || socket.handshake.query?.deviceId;
      next();
    } catch (err) {
      next(new Error('AUTH_FAILED'));
    }
  });

  deviceSyncNs.on('connection', (socket) => {
    appLogger.info(`[WS] Dispositivo ${socket.deviceId || socket.id} conectado a /device-sync.`);
    socket.on('disconnect', () => {
      appLogger.info(`[WS] Dispositivo ${socket.deviceId || socket.id} desconectado de /device-sync.`);
    });
  });

  ioInstance = io;
  return io;
}

const getIO = () => ioInstance;

module.exports = { initSocketIO, getIO };
