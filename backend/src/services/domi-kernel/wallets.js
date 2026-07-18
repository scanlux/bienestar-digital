const db = require('../../config/db');

async function getSystemWallet(conn) {
  const queryExecutor = conn || db;
  const [rows] = await queryExecutor.query("SELECT * FROM wallets WHERE is_system = 1");
  if (rows.length === 0) throw new Error('DOMI_ENGINE: Billetera del sistema no encontrada.');
  return rows[0];
}

async function getStoreWallet(conn, storeId) {
  const queryExecutor = conn || db;
  const [storeRows] = await queryExecutor.query("SELECT usuario_id FROM stores WHERE id = ?", [storeId]);
  if (storeRows.length === 0) throw new Error(`DOMI_ENGINE: Sede (storeId: ${storeId}) no encontrada.`);
  const userId = storeRows[0].usuario_id;
  const [rows] = await queryExecutor.query("SELECT * FROM wallets WHERE user_id = ?", [userId]);
  if (rows.length === 0) throw new Error(`DOMI_ENGINE: Wallet de sede (storeId: ${storeId}, administrador: ${userId}) no encontrada en DB.`);
  return rows[0];
}

async function getCommerceWallet(conn, commerceId) {
  const queryExecutor = conn || db;
  const [commerceRows] = await queryExecutor.query("SELECT usuario_id FROM commerces WHERE id = ?", [commerceId]);
  if (commerceRows.length === 0) throw new Error(`DOMI_ENGINE: Comercio (commerceId: ${commerceId}) no encontrado.`);
  const userId = commerceRows[0].usuario_id;
  const [rows] = await queryExecutor.query("SELECT * FROM wallets WHERE user_id = ?", [userId]);
  if (rows.length === 0) throw new Error(`DOMI_ENGINE: Wallet de comercio (commerceId: ${commerceId}, administrador: ${userId}) no encontrada en DB.`);
  return rows[0];
}

async function getUserWallet(conn, userId) {
  const queryExecutor = conn || db;
  const [rows] = await queryExecutor.query("SELECT * FROM wallets WHERE user_id = ?", [userId]);
  if (rows.length === 0) throw new Error(`DOMI_ENGINE: Wallet de usuario (userId: ${userId}) no encontrada en DB.`);
  return rows[0];
}

async function getDeliveryCompanyWallet(conn, deliveryCompanyId) {
  const queryExecutor = conn || db;
  const [dcRows] = await queryExecutor.query("SELECT usuario_id FROM delivery_companies WHERE id = ?", [deliveryCompanyId]);
  if (dcRows.length === 0) throw new Error(`DOMI_ENGINE: Empresa de reparto (deliveryCompanyId: ${deliveryCompanyId}) no encontrada.`);
  const userId = dcRows[0].usuario_id;
  const [rows] = await queryExecutor.query("SELECT * FROM wallets WHERE user_id = ?", [userId]);
  if (rows.length === 0) throw new Error(`DOMI_ENGINE: Wallet de empresa de reparto (deliveryCompanyId: ${deliveryCompanyId}, administrador: ${userId}) no encontrada en DB.`);
  return rows[0];
}

module.exports = {
  getSystemWallet,
  getStoreWallet,
  getCommerceWallet,
  getUserWallet,
  getDeliveryCompanyWallet
};


