const calculateOrderCostSchema = {
  totalCop: { type: 'number', required: true },
  distanceKm: { type: 'number', required: false },
  distance_km: { type: 'number', required: false }
};

const mintDomisSchema = {
  ownerType: { type: 'string', required: true },
  ownerId: { type: 'number', required: true },
  fiatAmount: { type: 'number', required: true }
};

const topupStoreSchema = {
  amountDomis: { type: 'number', required: true }
};

const transferSchema = {
  fromType: { type: 'string', required: true },
  fromId: { type: 'number', required: true },
  toType: { type: 'string', required: false },
  toId: { type: 'number', required: false },
  toAlias: { type: 'string', required: false },
  amountDomis: { type: 'number', required: true }
};

const mintManualSchema = {
  ownerType: { type: 'string', required: true },
  ownerId: { type: 'number', required: true },
  amountDomis: { type: 'number', required: true }
};

const burnManualSchema = {
  ownerType: { type: 'string', required: true },
  ownerId: { type: 'number', required: true },
  amountDomis: { type: 'number', required: true }
};

const checkoutSessionSchema = {
  amountDomis: { type: 'number', required: true },
  ownerType:   { type: 'string', required: true },
  ownerId:     { type: 'number', required: true }
};

const createAliasSchema = {
  alias: { type: 'string', required: true }
};

const declareReserveSchema = {
  reservaCop: { type: 'number', required: true },
  notas: { type: 'string', required: false }
};

const mintCashSchema = {
  ownerType: { type: 'string', required: true },
  ownerId: { type: 'number', required: true },
  amountDomis: { type: 'number', required: true }
};

const proposeYieldAdjustmentSchema = {
  certifiedYieldCop: { type: 'number', required: true },
  investedPeriodDays: { type: 'number', required: true }
};

const applyYieldAdjustmentSchema = {
  certifiedYieldCop: { type: 'number', required: true },
  investedPeriodDays: { type: 'number', required: true }
};

const applyNewPegSchema = {
  newPegCop: { type: 'number', required: true },
  reason: { type: 'string', required: false }
};

const processWithdrawalSchema = {
  action: { type: 'string', required: true },
  notes: { type: 'string', required: false }
};

module.exports = {
  calculateOrderCostSchema,
  mintDomisSchema,
  topupStoreSchema,
  transferSchema,
  mintManualSchema,
  burnManualSchema,
  checkoutSessionSchema,
  createAliasSchema,
  declareReserveSchema,
  mintCashSchema,
  proposeYieldAdjustmentSchema,
  applyYieldAdjustmentSchema,
  applyNewPegSchema,
  processWithdrawalSchema
};
