const createCommerceSchema = {
  nombre: { type: 'string', required: true },
  nit: { type: 'string', required: true },
  telefono: { type: 'string', required: true },
  ciudad: { type: 'string', required: true },
  direccion: { type: 'string', required: true }
};

const updateCommerceSchema = {
  nombre: { type: 'string', required: true },
  nit: { type: 'string', required: true },
  telefono: { type: 'string', required: true },
  ciudad: { type: 'string', required: true },
  direccion: { type: 'string', required: true }
};

const updateStatusSchema = {
  status: { type: 'string', required: true }
};

module.exports = {
  createCommerceSchema,
  updateCommerceSchema,
  updateStatusSchema
};
