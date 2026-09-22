/**
 * DOMI Domain - Owner Types Constants
 * SSOT (Single Source of Truth) para tipos de propietarios de billeteras en el ecosistema.
 */

const OWNER_TYPES = Object.freeze({
  USER:             'user',
  STORE:            'store',
  COMMERCE:         'commerce',
  DELIVERY_COMPANY: 'delivery_company',
  SYSTEM:           'system'
});

// Subconjunto de tipos que pueden iniciar una compra/recarga de DOMIs
const PURCHASABLE_OWNER_TYPES = Object.freeze([
  OWNER_TYPES.USER,
  OWNER_TYPES.STORE,
  OWNER_TYPES.COMMERCE,
  OWNER_TYPES.DELIVERY_COMPANY
]);

module.exports = {
  OWNER_TYPES,
  PURCHASABLE_OWNER_TYPES
};
