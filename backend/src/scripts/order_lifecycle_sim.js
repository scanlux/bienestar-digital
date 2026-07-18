/**
 * order_lifecycle_sim.js
 * Simulador del Ciclo de Vida de Ordenes - Motor DOMI
 *
 * USA EXCLUSIVAMENTE datos reales del db_seed.js.
 * No crea usuarios ni datos ficticios: todo se descubre consultando la DB.
 *
 * Requisito previo: haber ejecutado "node src/scripts/db_reset.js --full"
 *
 * Uso:
 *   node src/scripts/order_lifecycle_sim.js [--scenario <ID|all>] [--reset]
 *
 * Actores del seed (descubiertos automaticamente desde la DB):
 *   Root:      root@trendy.sytes.net         / admin123
 *   Cliente A: customer_1@trendy.sytes.net   / user123
 *   Cliente B: customer_2@trendy.sytes.net   / user123
 *   Driver:    driver_1@trendy.sytes.net     / driver123
 *   Sede:      Sede Chapinero               (store_id auto-detectado por nombre)
 *   Producto:  Hamburguesa Especial          (product_id auto-detectado por nombre)
 */
'use strict';

require('dotenv').config();
const axios = require('axios');
const db    = require('../config/db');
const domiRedis = require('../services/domiRedis');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:4000/api';

// Credenciales definidas en db_seed.js — NO se inventan aqui
const SEED_CREDS = {
  root:    { email: 'root@trendy.sytes.net',        password: 'admin123'  },
  clientA: { email: 'customer_1@trendy.sytes.net',  password: 'user123'   },
  clientB: { email: 'customer_2@trendy.sytes.net',  password: 'user123'   },
  driver:  { email: 'driver_1@trendy.sytes.net',    password: 'driver123' },
};

// Nombres exactos del seed
const SEED_STORE_NAME   = 'Trattoria Nápoles - Chapinero';
const SEED_PRODUCT_NAME = 'Hamburguesa Angus Premium';

// Constantes del motor financiero (deben coincidir con protocol_rules en DB)
const PEG            = 400.0;  // fiat_peg_cop
const DISTANCE_KM    = 3.0;    // distancia de prueba (3 km = tarifa base exacta)
const DELIVERY_COP   = 3100;   // delivery_base_fare_cop para 3 km
const STORE_FEE_COP  = 400;    // store_fixed_fee_cop
const DRIVER_FEE_COP = 300;    // driver_fixed_fee_cop (coincide con rules en DB: 300 COP)

// Penalizaciones de Score del protocol_rules
const SCORE = {
  earnedCod:       5,
  penCodPrep:     40,
  penCodDisp:     50,
  penCodTransit:  60,
  penDomiPrep:    1,
  penDomiDisp:    2,
  penDomiTransit: 4,
};

const TOPUP_DOMI = 100; // Recargamos 100 DOMI para cubrir productos + envío

let _pass = 0;
let _fail = 0;

// ---------------------------------------------------------------------------
// CLIENTE HTTP
// ---------------------------------------------------------------------------

class ApiClient {
  constructor(token = null, isPublic = false) { 
    this.token = token; 
    this.isPublic = isPublic;
  }
  _h() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return h;
  }
  async post(path, body)  { return (await axios.post(BASE_URL + path, body || {}, { headers: this._h() })).data; }
  async get(path)         { return (await axios.get(BASE_URL + path, { headers: this._h() })).data; }
  async patch(path, body) { return (await axios.patch(BASE_URL + path, body || {}, { headers: this._h() })).data; }
}

async function loginAs(email, password, isPublic = false) {
  const c = new ApiClient();
  const res = await c.post('/auth/login', { email, password });
  const token = res.token || res.data?.token;
  if (!token) throw new Error('Sin token para ' + email);
  return new ApiClient(token, isPublic);
}

// ---------------------------------------------------------------------------
// DESCUBRIMIENTO DE DATOS REALES DEL SEED
// ---------------------------------------------------------------------------

async function discoverSeedData() {
  console.log('\n[DISCOVER] Consultando datos reales del seed en la DB...');

  const [[clientARow]] = await db.query(
    'SELECT id FROM users WHERE email = ?', [SEED_CREDS.clientA.email]
  );
  if (!clientARow) throw new Error('Cliente A no encontrado. Ejecuta db_reset.js --full.');

  const [[clientBRow]] = await db.query(
    'SELECT id FROM users WHERE email = ?', [SEED_CREDS.clientB.email]
  );
  if (!clientBRow) throw new Error('Cliente B no encontrado.');

  const [[driverRow]] = await db.query(
    'SELECT id FROM users WHERE email = ?', [SEED_CREDS.driver.email]
  );
  if (!driverRow) throw new Error('Driver no encontrado.');

  const [[storeRow]] = await db.query(
    'SELECT id FROM stores WHERE nombre_sucursal = ? LIMIT 1', [SEED_STORE_NAME]
  );
  if (!storeRow) throw new Error('Sede "' + SEED_STORE_NAME + '" no encontrada.');

  const [[productRow]] = await db.query(
    'SELECT id, precio_base FROM products WHERE nombre = ? AND store_id = ? AND disponible = 1 AND deleted_at IS NULL LIMIT 1',
    [SEED_PRODUCT_NAME, storeRow.id]
  );
  if (!productRow) throw new Error('Producto "' + SEED_PRODUCT_NAME + '" no encontrado para la sede.');

  const [[driverProfile]] = await db.query(
    'SELECT delivery_company_id FROM profiles WHERE usuario_id = ?', [driverRow.id]
  );
  if (!driverProfile) throw new Error('Perfil del repartidor no encontrado.');
  const deliveryCompanyId = driverProfile.delivery_company_id;
  if (!deliveryCompanyId) throw new Error('El repartidor no tiene empresa de reparto asociada.');

  const productCop  = parseFloat(productRow.precio_base);
  const productDomi = productCop / PEG;
  const deliveryDomi = DELIVERY_COP / PEG;
  const storeFee    = STORE_FEE_COP / PEG;
  const driverFee   = DRIVER_FEE_COP / PEG;
  const lockedDomi  = productDomi + deliveryDomi;

  console.log('  [OK] Cliente A:  #' + clientARow.id + ' (' + SEED_CREDS.clientA.email + ')');
  console.log('  [OK] Cliente B:  #' + clientBRow.id + ' (' + SEED_CREDS.clientB.email + ')');
  console.log('  [OK] Driver:     #' + driverRow.id  + ' (' + SEED_CREDS.driver.email + ')');
  console.log('  [OK] Sede:       #' + storeRow.id   + ' (' + SEED_STORE_NAME + ')');
  console.log('  [OK] Producto:   #' + productRow.id + ' (' + SEED_PRODUCT_NAME + ', ' + productCop + ' COP = ' + productDomi.toFixed(8) + ' DOMI)');
  console.log('  [OK] Domicilio:  ' + deliveryDomi.toFixed(8) + ' DOMI (' + DELIVERY_COP + ' COP, ' + DISTANCE_KM + ' km)');
  console.log('  [OK] Total lock: ' + lockedDomi.toFixed(8) + ' DOMI');

  return {
    clientAId: clientARow.id,
    clientBId: clientBRow.id,
    driverId:  driverRow.id,
    storeId:   storeRow.id,
    productId: productRow.id,
    deliveryCompanyId,
    productCop, productDomi, deliveryDomi, storeFee, driverFee, lockedDomi,
  };
}

// ---------------------------------------------------------------------------
// CONSULTAS DE ESTADO
// ---------------------------------------------------------------------------

async function getUserWallet(userId) {
  const [rows] = await db.query(
    'SELECT balance_custody, locked_balance FROM wallets WHERE user_id = ? LIMIT 1',
    [userId]
  );
  const w = rows[0] || {};
  return { custody: parseFloat(w.balance_custody || 0), locked: parseFloat(w.locked_balance || 0) };
}

async function getStoreWallet(storeId) {
  const [storeRows] = await db.query('SELECT usuario_id FROM stores WHERE id = ?', [storeId]);
  const userId = storeRows[0]?.usuario_id;
  if (!userId) return { custody: 0 };
  const [rows] = await db.query(
    'SELECT balance_custody FROM wallets WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return { custody: parseFloat(rows[0]?.balance_custody || 0) };
}

async function getSysUtil() {
  const [rows] = await db.query(
    "SELECT balance_utility FROM wallets WHERE is_system = 1 LIMIT 1"
  );
  return parseFloat(rows[0]?.balance_utility || 0);
}

async function getUserScore(userId) {
  const [rows] = await db.query('SELECT domi_score FROM users WHERE id = ?', [userId]);
  return parseFloat(rows[0]?.domi_score || 0);
}

async function hasPendingDebt(userId) {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS c FROM domi_order_debts WHERE customer_user_id = ? AND status = 'pending'",
    [userId]
  );
  return (rows[0]?.c || 0) > 0;
}

async function getOrderStatus(orderId) {
  const [rows] = await db.query('SELECT status FROM orders WHERE id = ?', [orderId]);
  return rows[0]?.status;
}

async function getDeliveryCompanyWallet(companyId) {
  const [dcRows] = await db.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [companyId]);
  const userId = dcRows[0]?.usuario_id;
  if (!userId) return { custody: 0 };
  const [rows] = await db.query(
    'SELECT balance_custody FROM wallets WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return { custody: parseFloat(rows[0]?.balance_custody || 0) };
}

async function snapshot(d) {
  return {
    clientA: await getUserWallet(d.clientAId),
    clientB: await getUserWallet(d.clientBId),
    store:   await getStoreWallet(d.storeId),
    driver:  await getUserWallet(d.driverId),
    company: await getDeliveryCompanyWallet(d.deliveryCompanyId),
    sysUtil: await getSysUtil(),
    scoreA:  await getUserScore(d.clientAId),
  };
}

// ---------------------------------------------------------------------------
// SIMULACION DE RECARGA DOMI (Wompi webhook)
// ---------------------------------------------------------------------------

async function simulateTopup(session, userId, amountDomi) {
  const intent = await session.post('/domi/payment/checkout-session', {
    amountDomis: amountDomi,
    ownerType: 'user',
    ownerId: userId,
  });
  const reference = intent.reference || intent.data?.reference;
  if (!reference) throw new Error('Intent sin referencia para user #' + userId);

  const timestamp = Math.floor(Date.now() / 1000);
  const txId = 'sim_topup_' + userId + '_' + Date.now();
  const amountInCents = Math.round(amountDomi * PEG * 100);
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET || 'test_events_wtaUQEXS2zGvzkWTY4OWzVN9ddJlRE6u';
  
  const crypto = require('crypto');
  const stringToSign = `${txId}APPROVED${amountInCents}${timestamp}${eventsSecret}`;
  const checksum = crypto.createHash('sha256').update(stringToSign).digest('hex');

  const hook = new ApiClient();
  await hook.post('/payments/wompi-webhook', {
    event: 'transaction.updated',
    timestamp,
    signature: {
      properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
      checksum,
    },
    data: {
      transaction: {
        id: txId,
        status: 'APPROVED',
        reference,
        amount_in_cents: amountInCents,
        currency: 'COP',
      },
    },
  });
  await sleep(700);
}

// ---------------------------------------------------------------------------
// VERIFICACION
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const approxEq = (a, b, tol = 0.001) => Math.abs(parseFloat(a) - parseFloat(b)) <= tol;

function check(label, actual, expected, tol = 0.001) {
  const ok = approxEq(actual, expected, tol);
  console.log('  [' + (ok ? 'PASS' : 'FAIL') + '] ' + label);
  if (!ok) {
    console.log('         esperado=' + parseFloat(expected).toFixed(8) +
                '  real='    + parseFloat(actual).toFixed(8));
  }
  ok ? _pass++ : _fail++;
  return ok;
}

function checkBool(label, condition) {
  console.log('  [' + (condition ? 'PASS' : 'FAIL') + '] ' + label);
  condition ? _pass++ : _fail++;
  return condition;
}

function checkZeroSum(deltas) {
  const sum = deltas.reduce((a, b) => a + b, 0);
  const ok  = Math.abs(sum) < 0.001;
  console.log('  [' + (ok ? 'PASS' : 'FAIL') + '] Invariante suma cero: Sigma=' + sum.toFixed(8));
  ok ? _pass++ : _fail++;
}

// ---------------------------------------------------------------------------
// HELPERS DE FLUJO
// ---------------------------------------------------------------------------

async function createOrder(session, d, paymentMethod) {
  const res = await session.post('/public/orders', {
    store_id:                d.storeId,
    customer_user_id:        d.clientAId,
    total_cop:               d.productCop,
    payment_method_customer: paymentMethod,
    delivery_address:        'Calle 60 No 10-20 Bogota (prueba)',
    distance_km:             DISTANCE_KM,
    items: [{ product_id: d.productId, quantity: 1, price: d.productCop }],
  });
  const id = res.id || res.data?.id;
  if (!id) throw new Error('Orden no creada: ' + JSON.stringify(res));
  return id;
}

async function advance(session, orderId, status, extra = {}) {
  const prefix = session.isPublic ? '/public' : '/manage';
  await session.patch(prefix + '/orders/' + orderId + '/status', { status, ...extra });
  await sleep(450);
}

async function forceAccepted(adminSession, orderId) {
  const status = await getOrderStatus(orderId);
  if (status === 'pendiente') {
    await advance(adminSession, orderId, 'aceptado');
  }
  await sleep(700);
}

async function prepareAndAssignDriver(oid, s, d) {
  await forceAccepted(s.admin, oid);
  await advance(s.admin, oid, 'preparando');
  await advance(s.admin, oid, 'listo');
  await s.delivery.post('/delivery-company/orders/' + oid + '/accept');
  await s.delivery.post('/delivery-company/orders/' + oid + '/assign-driver', { driverUserId: d.driverId });
  await sleep(400);
}

async function setupEnvironment(d, sessions) {
  require('child_process').execSync('node src/scripts/db_reset.js --only-financial', { stdio: 'ignore', cwd: process.cwd() });
  await db.query('UPDATE stores SET acceptance_mode = "manual" WHERE id = ?', [d.storeId]);
  await simulateTopup(sessions.clientA, d.clientAId, TOPUP_DOMI);
  await simulateTopup(sessions.clientB, d.clientBId, TOPUP_DOMI);
  
  const [storeRows] = await db.query('SELECT usuario_id FROM stores WHERE id = ?', [d.storeId]);
  const storeUserId = storeRows[0]?.usuario_id;
  if (storeUserId) {
    await db.query('UPDATE wallets SET balance_custody = 500.00 WHERE user_id = ?', [storeUserId]);
    await domiRedis.setBalance('user', storeUserId, 500.00);
  }

  const [dcRows] = await db.query('SELECT id FROM users WHERE email = "admin_delivery_1@trendy.sytes.net"');
  const dcUserId = dcRows[0]?.id;
  if (dcUserId) {
    await db.query('UPDATE wallets SET balance_custody = 500.00 WHERE user_id = ?', [dcUserId]);
    await domiRedis.setBalance('user', dcUserId, 500.00);
  }

  await db.query('UPDATE users SET domi_score = 70 WHERE id IN (?, ?)', [d.clientAId, d.clientBId]);
}

async function runScenario(id, desc, fn, d, sessions) {
  console.log('\n' + '-'.repeat(68));
  console.log('[' + id + '] ' + desc);
  try {
    await setupEnvironment(d, sessions);
    const before = await snapshot(d);
    await fn(d, sessions, before);
  } catch (e) {
    const msg = e.response?.data?.error || e.response?.data?.message || e.message || String(e);
    console.error('  [ERROR] ' + msg);
    _fail++;
  }
}

// ---------------------------------------------------------------------------
// ESCENARIOS DE PRUEBA
// ---------------------------------------------------------------------------

async function hp01(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'domi');
  console.log('  Pedido #' + oid + ' creado (DOMI, producto: ' + SEED_PRODUCT_NAME + ', ' + d.productCop + ' COP)');

  const mid = await getUserWallet(d.clientAId);
  check('locked_balance activo (' + d.lockedDomi.toFixed(4) + ' DOMI)', mid.locked, d.lockedDomi);

  await prepareAndAssignDriver(oid, s, d);

  for (const st of ['en_camino', 'entregado']) {
    await advance(s.admin, oid, st);
    console.log('  -> ' + st);
  }
  await sleep(1500);

  const after = await snapshot(d);
  const dC   = after.clientA.custody - before.clientA.custody;
  const dS   = after.store.custody   - before.store.custody;
  const dD   = after.company.custody  - before.company.custody;
  const dSys = after.sysUtil         - before.sysUtil;

  console.log('  --- Verificacion financiera ---');
  check('Cliente pago productos+domicilio (-' + d.lockedDomi.toFixed(4) + ' DOMI)', dC, -d.lockedDomi);
  check('Cliente locked=0', after.clientA.locked, 0);
  check('Sede: productos-comision (+' + (d.productDomi - d.storeFee).toFixed(4) + ' DOMI)', dS, d.productDomi - d.storeFee);
  check('Driver: domicilio-comision (+' + (d.deliveryDomi - d.driverFee).toFixed(4) + ' DOMI)', dD, d.deliveryDomi - d.driverFee);
  check('Sistema: cobra comisiones (+' + (d.storeFee + d.driverFee).toFixed(4) + ' DOMI)', dSys, d.storeFee + d.driverFee);
  checkZeroSum([dC, dS, dD, dSys]);
}

async function hp02(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'cash_cod');
  console.log('  Pedido #' + oid + ' creado (COD)');

  await prepareAndAssignDriver(oid, s, d);
  for (const st of ['en_camino', 'entregado'])
    { await advance(s.admin, oid, st); console.log('  -> ' + st); }
  await sleep(1000);

  const after = await snapshot(d);
  check('Cliente locked=0 (COD nunca bloquea)', after.clientA.locked, 0);
  check('Score +' + SCORE.earnedCod + ' por entrega COD', after.scoreA - before.scoreA, SCORE.earnedCod);
  check('Sede pago comision (-' + d.storeFee.toFixed(4) + ' DOMI)', after.store.custody - before.store.custody, -d.storeFee);
  check('Driver pago comision (-' + d.driverFee.toFixed(4) + ' DOMI)', after.company.custody - before.company.custody, -d.driverFee);
}

async function cc01(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'domi');
  const st  = await getOrderStatus(oid);
  console.log('  Pedido #' + oid + ' estado: ' + st + '. Cliente cancela...');
  await advance(s.clientA, oid, 'cancelado');
  await sleep(700);
  const after = await snapshot(d);
  check('Reembolso 100% — neto custody=0', after.clientA.custody - before.clientA.custody, 0);
  check('locked=0', after.clientA.locked, 0);
  check('Score sin penalizacion (pendiente)', after.scoreA - before.scoreA, 0);
  check('Sistema sin movimiento', after.sysUtil - before.sysUtil, 0);
}

async function cc02(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'cash_cod');
  console.log('  Pedido #' + oid + ' (COD). Cliente cancela...');
  await advance(s.clientA, oid, 'cancelado');
  await sleep(600);
  const after = await snapshot(d);
  check('Sin movimiento en custody (COD, pendiente)', after.clientA.custody - before.clientA.custody, 0);
  check('Score sin penalizacion', after.scoreA - before.scoreA, 0);
  checkBool('Sin deuda generada', !(await hasPendingDebt(d.clientAId)));
}

async function cc03(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'domi');
  await forceAccepted(s.admin, oid);
  console.log('  Cancelando en aceptado (sin driver)...');
  await advance(s.clientA, oid, 'cancelado');
  await sleep(900);
  const after = await snapshot(d);
  check('Score -' + SCORE.penDomiPrep + ' (DOMI cancelado en aceptado)', after.scoreA - before.scoreA, -SCORE.penDomiPrep);
  check('locked=0', after.clientA.locked, 0);
  const expected = (d.productDomi * 0.07) + d.deliveryDomi;
  console.log('  [DEBUG cc03] before custody:', before.clientA.custody.toFixed(8), 'after custody:', after.clientA.custody.toFixed(8), 'diff:', (after.clientA.custody - before.clientA.custody).toFixed(8), 'expected diff:', (expected - d.lockedDomi).toFixed(8));
  check('Cliente recupera devolucion parcial (+' + expected.toFixed(4) + ' DOMI)', after.clientA.custody - before.clientA.custody, expected - d.lockedDomi);
}

async function cc07(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'domi');
  await prepareAndAssignDriver(oid, s, d);
  console.log('  Estado: ' + await getOrderStatus(oid) + '. Cliente cancela...');
  await advance(s.clientA, oid, 'cancelado');
  await sleep(900);
  const after = await snapshot(d);
  check('Score -' + SCORE.penDomiDisp + ' (DOMI listo_despacho)', after.scoreA - before.scoreA, -SCORE.penDomiDisp);
  check('locked=0', after.clientA.locked, 0);
  const clientBack = (d.deliveryDomi * 0.5) + (d.productDomi * 0.04);
  console.log('  [DEBUG cc07] before custody:', before.clientA.custody.toFixed(8), 'after custody:', after.clientA.custody.toFixed(8), 'diff:', (after.clientA.custody - before.clientA.custody).toFixed(8), 'expected diff:', (clientBack - d.lockedDomi).toFixed(8));
  check('Cliente recupera '+clientBack.toFixed(4)+' DOMI', after.clientA.custody - before.clientA.custody, clientBack - d.lockedDomi);
}

async function cc09(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'domi');
  await prepareAndAssignDriver(oid, s, d);
  await advance(s.admin, oid, 'en_camino');
  console.log('  Cancelando en en_camino (DOMI)...');
  await advance(s.clientA, oid, 'cancelado');
  await sleep(900);
  const after = await snapshot(d);
  const dC   = after.clientA.custody - before.clientA.custody;
  const dS   = after.store.custody   - before.store.custody;
  const dD   = after.company.custody  - before.company.custody;
  const dSys = after.sysUtil         - before.sysUtil;
  console.log('  [DEBUG cc09] before custody:', before.clientA.custody.toFixed(8), 'after custody:', after.clientA.custody.toFixed(8), 'diff:', dC.toFixed(8), 'expected diff:', (-d.lockedDomi).toFixed(8));
  check('Score -' + SCORE.penDomiTransit + ' (DOMI en_camino)', after.scoreA - before.scoreA, -SCORE.penDomiTransit);
  check('locked=0', after.clientA.locked, 0);
  check('Cliente pierde todo (-' + d.lockedDomi.toFixed(4) + ')', dC, -d.lockedDomi);
  check('Driver: 100% domicilio - comision', dD, d.deliveryDomi - d.driverFee);
  check('Sede: 100% productos - comision', dS, d.productDomi - d.storeFee);
  checkZeroSum([dC, dS, dD, dSys]);
}

async function cc10(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'cash_cod');
  await prepareAndAssignDriver(oid, s, d);
  await db.query('UPDATE wallets SET balance_custody = 0.00 WHERE user_id = ?', [d.clientAId]);
  await advance(s.admin, oid, 'en_camino');
  console.log('  Cancelando en en_camino (COD, sin saldo cliente)...');
  await advance(s.clientA, oid, 'cancelado');
  await sleep(900);
  const after = await snapshot(d);
  check('Score -' + SCORE.penCodTransit + ' (COD en_camino)', after.scoreA - before.scoreA, -SCORE.penCodTransit);
  check('locked=0 (COD no bloquea)', after.clientA.locked, 0);
  checkBool('Deuda generada (Compensacion Automatica)', await hasPendingDebt(d.clientAId));
}

async function sc01(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'domi');
  console.log('  Pedido #' + oid + ' (estado: ' + await getOrderStatus(oid) + '). Sede cancela...');
  await advance(s.store, oid, 'cancelado', { observacion: 'Sin stock disponible (prueba SC-01)' });
  await sleep(900);
  const after = await snapshot(d);
  check('locked=0 (reembolso completo al cliente)', after.clientA.locked, 0);
  checkBool('Cliente recupero su saldo', after.clientA.custody >= before.clientA.custody);
  checkBool('Sistema no pierde (cobro penalizacion a sede)', after.sysUtil >= before.sysUtil);
}

async function sc03(d, s, before) {
  const [storeRows] = await db.query('SELECT usuario_id FROM stores WHERE id = ?', [d.storeId]);
  const storeUserId = storeRows[0]?.usuario_id;
  const [storeBalBefore] = await db.query('SELECT balance_custody, balance_utility FROM wallets WHERE user_id = ?', [storeUserId]);
  console.log('  [DEBUG sc03] DB wallet before order creation:', storeBalBefore[0]);
  const oid = await createOrder(s.clientA, d, 'domi');
  const [storeBalAfterCreate] = await db.query('SELECT balance_custody, balance_utility FROM wallets WHERE user_id = ?', [storeUserId]);
  console.log('  [DEBUG sc03] DB wallet after order creation:', storeBalAfterCreate[0]);
  await prepareAndAssignDriver(oid, s, d);
  await advance(s.admin, oid, 'preparando');
  const [storeBalAfterPrep] = await db.query('SELECT balance_custody, balance_utility FROM wallets WHERE user_id = ?', [storeUserId]);
  console.log('  [DEBUG sc03] DB wallet after preparing state:', storeBalAfterPrep[0]);
  const driverBefore = await getUserWallet(d.driverId);
  console.log('  Sede cancela en preparando (con driver)...');
  await advance(s.store, oid, 'cancelado', { observacion: 'Incidente en cocina (SC-03)' });
  await sleep(900);
  const after = await snapshot(d);
  const driverAfter = await getUserWallet(d.driverId);
  console.log('  [DEBUG sc03] snapshot before.store.custody:', before.store.custody, 'after.store.custody:', after.store.custody, 'diff:', after.store.custody - before.store.custody);
  check('locked=0', after.clientA.locked, 0);
  check('Sede pierde comision y paga bono fidelidad', after.store.custody - before.store.custody, -d.storeFee - 0.25, 0.05);
  const driverNet = driverAfter.custody - driverBefore.custody;
  const expectedDriverNet = d.deliveryDomi * 0.5;
  console.log('  Driver delta: ' + driverNet.toFixed(8) + ' DOMI (esperado ~+' + expectedDriverNet.toFixed(4) + ')');
  checkBool('Driver recibio compensacion del sistema', driverNet > 0);
}

async function dc01(d, s, before) {
  const oid = await createOrder(s.clientA, d, 'domi');
  await prepareAndAssignDriver(oid, s, d);
  console.log('  Estado: ' + await getOrderStatus(oid) + '. Driver cancela (debe volver a listo)...');
  await advance(s.driver, oid, 'cancelado');
  await sleep(700);
  const finalStatus = await getOrderStatus(oid);
  checkBool('Orden vuelve a listo (no cancelado)', finalStatus === 'listo');
  const cw = await getUserWallet(d.clientAId);
  check('locked_balance permanece activo (orden sigue viva)', cw.locked, d.lockedDomi);
  console.log('  Estado final: ' + finalStatus);
}

async function con01(d, s, before) {
  console.log('  Lanzando dos pedidos en paralelo (Promise.all)...');
  const [resA, resB] = await Promise.all([
    s.clientA.post('/public/orders', {
      store_id: d.storeId, customer_user_id: d.clientAId, total_cop: d.productCop,
      payment_method_customer: 'domi', delivery_address: 'Calle 60 Bogota (A)', distance_km: DISTANCE_KM,
      items: [{ product_id: d.productId, quantity: 1, price: d.productCop }],
    }),
    s.clientB.post('/public/orders', {
      store_id: d.storeId, customer_user_id: d.clientBId, total_cop: d.productCop,
      payment_method_customer: 'domi', delivery_address: 'Carrera 15 Bogota (B)', distance_km: DISTANCE_KM,
      items: [{ product_id: d.productId, quantity: 1, price: d.productCop }],
    }),
  ]);
  const oA = resA?.id || resA?.data?.id;
  const oB = resB?.id || resB?.data?.id;
  console.log('  Pedido A: #' + oA + ' | Pedido B: #' + oB);
  if (!oA || !oB) { checkBool('Ambas ordenes creadas', false); return; }
  await sleep(500);
  const wA = await getUserWallet(d.clientAId);
  const wB = await getUserWallet(d.clientBId);
  checkBool('IDs de orden son distintos (sin aliasing)', oA !== oB);
  check('Cliente A locked correcto (' + d.lockedDomi.toFixed(4) + ' DOMI)', wA.locked, d.lockedDomi);
  check('Cliente B locked correcto (' + d.lockedDomi.toFixed(4) + ' DOMI)', wB.locked, d.lockedDomi);
  check('Cliente A custody decrementado', wA.custody, TOPUP_DOMI - d.lockedDomi);
  check('Cliente B custody decrementado', wB.custody, TOPUP_DOMI - d.lockedDomi);
  checkBool('Sin doble-gasto: ambos locked > 0', wA.locked > 0 && wB.locked > 0);
}

// ---------------------------------------------------------------------------
// MAPA DE ESCENARIOS
// ---------------------------------------------------------------------------

const SCENARIOS = [
  { id: 'HP-01',  desc: 'Happy Path DOMI: Entrega exitosa completa',               fn: hp01 },
  { id: 'HP-02',  desc: 'Happy Path COD: Entrega exitosa completa',                fn: hp02 },
  { id: 'CC-01',  desc: 'Cliente cancela en pendiente (DOMI): Reembolso 100%',    fn: cc01 },
  { id: 'CC-02',  desc: 'Cliente cancela en pendiente (COD): Sin movimiento',     fn: cc02 },
  { id: 'CC-03',  desc: 'Cliente cancela en aceptado sin driver (DOMI)',          fn: cc03 },
  { id: 'CC-07',  desc: 'Cliente cancela en listo_despacho con driver (DOMI)',   fn: cc07 },
  { id: 'CC-09',  desc: 'Cliente cancela en en_camino (DOMI)',                   fn: cc09 },
  { id: 'CC-10',  desc: 'Cliente cancela en en_camino (COD): genera deuda',      fn: cc10 },
  { id: 'SC-01',  desc: 'Sede cancela en pendiente/aceptado (DOMI)',             fn: sc01 },
  { id: 'SC-03',  desc: 'Sede cancela en preparando con driver (DOMI)',          fn: sc03 },
  { id: 'DC-01',  desc: 'Repartidor cancela en preparando (orden vuelve a listo)', fn: dc01 },
  { id: 'CON-01', desc: 'Concurrencia: dos pedidos DOMI simultaneos sin doble-gasto', fn: con01 },
];

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const scenarioId = args.includes('--scenario') ? args[args.indexOf('--scenario') + 1] : 'all';
  const doReset    = args.includes('--reset');

  console.log('\n' + '='.repeat(68));
  console.log('  SIMULADOR CICLO DE VIDA - MOTOR DOMI');
  console.log('  (usa datos reales del db_seed.js, sin inventar actores)');
  console.log('='.repeat(68));
  console.log('  API: ' + BASE_URL + '  |  Escenario: ' + scenarioId);
  console.log('='.repeat(68));

  if (doReset) {
    console.log('\n[SETUP] Ejecutando db_reset --only-financial...');
    require('child_process').execSync('node src/scripts/db_reset.js --only-financial', { stdio: 'inherit', cwd: process.cwd() });
  }

  const d = await discoverSeedData();

  // Desactivar modo mantenimiento directamente en Redis antes de autenticar
  try {
    const { createClient } = require('redis');
    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
    const rClient = createClient({ url: redisUrl, password: process.env.REDIS_PASSWORD });
    await rClient.connect();
    await rClient.set('system:maintenance_mode', 'false');
    await rClient.disconnect();
    console.log('  [SETUP] Modo mantenimiento desactivado en Redis para simulación.');
  } catch (redisErr) {
    console.warn('Warning: Could not disable maintenance mode in Redis:', redisErr.message);
  }

  console.log('\n[AUTH] Autenticando actores del seed...');
  const adminSession = await loginAs(SEED_CREDS.root.email, SEED_CREDS.root.password, false);

  const sessions = {
    admin:    adminSession,
    clientA:  await loginAs(SEED_CREDS.clientA.email, SEED_CREDS.clientA.password, true),
    clientB:  await loginAs(SEED_CREDS.clientB.email, SEED_CREDS.clientB.password, true),
    driver:   await loginAs(SEED_CREDS.driver.email,  SEED_CREDS.driver.password, true),
    store:    await loginAs('admin_store_1@trendy.sytes.net', 'admin123', false),
    delivery: await loginAs('admin_delivery_1@trendy.sytes.net', 'admin123', false),
  };
  console.log('  Sesiones: OK');

  const toRun = scenarioId === 'all'
    ? SCENARIOS
    : SCENARIOS.filter(sc => sc.id === scenarioId);

  if (!toRun.length) {
    console.error('Escenario no encontrado: ' + scenarioId);
    console.error('Disponibles: ' + SCENARIOS.map(s => s.id).join(', '));
    process.exit(1);
  }

  for (const sc of toRun) {
    await runScenario(sc.id, sc.desc, sc.fn, d, sessions);
    await sleep(1200);
  }

  const total = _pass + _fail;
  console.log('\n' + '='.repeat(68));
  console.log('  RESULTADO FINAL: ' + _pass + ' PASS / ' + _fail + ' FAIL de ' + total + ' verificaciones');
  if (_fail === 0) {
    console.log('  Todos los invariantes financieros verificados correctamente.');
  } else {
    console.log('  ATENCION: Existen fallas. Revisar los [FAIL] arriba.');
  }
  console.log('='.repeat(68) + '\n');

  await db.end();
  process.exit(_fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('\n[FATAL]');
  console.error(e);
  await db.end().catch(() => {});
  process.exit(1);
});
