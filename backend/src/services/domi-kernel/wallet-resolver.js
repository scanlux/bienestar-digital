const wallets = require('./wallets');
const { OWNER_TYPES } = require('./owner-type.constants');

/**
 * Tabla de despacho (dispatch table) para la resolución de billeteras por ownerType.
 * Centraliza la lógica de mapeo entre el tipo de entidad y su respectiva wallet.
 */
const WALLET_RESOLVERS = {
  [OWNER_TYPES.USER]:             (conn, id) => wallets.getUserWallet(conn, id),
  [OWNER_TYPES.STORE]:            (conn, id) => wallets.getStoreWallet(conn, id),
  [OWNER_TYPES.COMMERCE]:         (conn, id) => wallets.getCommerceWallet(conn, id),
  [OWNER_TYPES.DELIVERY_COMPANY]: (conn, id) => wallets.getDeliveryCompanyWallet(conn, id),
  [OWNER_TYPES.SYSTEM]:           (conn)     => wallets.getSystemWallet(conn),
};

/**
 * Resuelve la wallet física correspondiente para un tipo y ID de propietario.
 * Lanza un error explícito de tipo CRITICAL_FINANCIAL_ERR si el ownerType no está soportado.
 * 
 * @param {Object} conn Conexión o pool de base de datos
 * @param {string} ownerType Tipo de propietario
 * @param {number|null} ownerId ID de la entidad propietaria (opcional para tipo SYSTEM)
 * @returns {Promise<Object>} Fila de la wallet de base de datos
 */
async function resolveWallet(conn, ownerType, ownerId) {
  const resolver = WALLET_RESOLVERS[ownerType];
  if (!resolver) {
    throw new Error(`[CRITICAL_FINANCIAL_ERR] ownerType '${ownerType}' no está registrado en el dominio de propietarios.`);
  }
  return resolver(conn, ownerId);
}

module.exports = {
  resolveWallet
};
