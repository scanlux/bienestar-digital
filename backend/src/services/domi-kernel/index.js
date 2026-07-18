const protocol = require('./protocol');
const ledger = require('./ledger');
const wallets = require('./wallets');
const mint = require('./mint');
const burn = require('./burn');
const transfer = require('./transfer');
const charge = require('./charge');
const incidents = require('./incidents');
const cancellationRouter = require('./cancellation-router');

module.exports = {
  // Protocol
  getProtocolRules: protocol.getProtocolRules,
  getTokenRegistry: protocol.getTokenRegistry,
  verifyIntegrity: protocol.verifyIntegrity,
  calculateOrderCost: protocol.calculateOrderCost,

  // Ledger
  appendLedger: ledger.appendLedger,
  generateTxHash: ledger.generateTxHash,

  // Wallets
  getSystemWallet: wallets.getSystemWallet,
  getStoreWallet: wallets.getStoreWallet,
  getCommerceWallet: wallets.getCommerceWallet,
  getUserWallet: wallets.getUserWallet,
  getDeliveryCompanyWallet: wallets.getDeliveryCompanyWallet,

  // Mint
  mintDomis: mint.mintDomis,

  // Burn
  burnDomis: burn.burnDomis,

  // Transfer
  settleOrderPayment: transfer.settleOrderPayment,

  // Charge
  chargeForOrder: charge.chargeForOrder,
  processChargeSync: charge.processChargeSync,
  chargeStoreSubscription: charge.chargeStoreSubscription,
  chargeCommerceSubscription: charge.chargeCommerceSubscription,
  chargeDeliveryCompanyForOrder: charge.chargeDeliveryCompanyForOrder,
  processChargeDeliveryCompanySync: charge.processChargeDeliveryCompanySync,

  // Incidents
  reportIncident: incidents.reportIncident,
  resolvePrePickupIncident: incidents.resolvePrePickupIncident,
  assignRescue: incidents.assignRescue,
  completeRescue: incidents.completeRescue,

  // Cancellation
  routeCancellation: cancellationRouter.routeCancellation
};
