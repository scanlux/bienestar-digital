const saveStoreSchema = {
  nombre_sucursal: { type: 'string', required: true },
  direccion: { type: 'string', required: true },
  estado: { type: 'string', required: true }
};

const updateOrderAcceptanceSchema = {
  acceptanceMode: { type: 'string', required: true }
};

const saveVideoSchema = {
  storeId: { type: 'number', required: true },
  url: { type: 'string', required: true }
};

module.exports = {
  saveStoreSchema,
  updateOrderAcceptanceSchema,
  saveVideoSchema
};
