const calculateOrderCostSchema = {
  totalCop: { type: 'number', required: true }
};

const mintDomisSchema = {
  ownerType: { type: 'string', required: true },
  ownerId: { type: 'number', required: true },
  fiatAmount: { type: 'number', required: true }
};

const topupStoreSchema = {
  amountDomis: { type: 'number', required: true }
};

module.exports = {
  calculateOrderCostSchema,
  mintDomisSchema,
  topupStoreSchema
};
