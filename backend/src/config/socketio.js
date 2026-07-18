const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('./redis.pubsub');
const jwt = require('jsonwebtoken');
const sessionStampService = require('../services/sessionStampService');
const db = require('./db');
const appLogger = require('../utils/appLogger');

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
      next(new Error('AUTH_FAILED'));
    }
  });

  io.on('connection', (socket) => {
    appLogger.info(`[WS] Usuario ${socket.user?.id} (rol: ${socket.user?.rol}) conectado.`);

    // Unirse a la sala del pedido
    socket.on('join_order_room', async ({ orderId }) => {
      try {
        const parsedOrderId = parseInt(orderId, 10);
        if (isNaN(parsedOrderId)) {
          socket.emit('error_ws', { code: 'INVALID_ORDER_ID' });
          return;
        }

        const canJoin = await validateOrderAccess(socket.user, parsedOrderId);
        if (!canJoin) {
          socket.emit('error_ws', { code: 'FORBIDDEN' });
          return;
        }

        const room = `order:${parsedOrderId}`;
        socket.join(room);
        appLogger.info(`[WS] Usuario ${socket.user.id} se unió a la sala ${room}`);
        socket.emit('joined_room', { room });
      } catch (err) {
        appLogger.error(`[WS] Error en join_order_room para usuario ${socket.user?.id}: ${err.message}`);
        socket.emit('error_ws', { code: 'SERVER_ERROR' });
      }
    });

    socket.on('disconnect', () => {
      appLogger.info(`[WS] Usuario ${socket.user?.id} desconectado.`);
    });
  });

  ioInstance = io;
  return io;
}

const getIO = () => ioInstance;

module.exports = { initSocketIO, getIO };
