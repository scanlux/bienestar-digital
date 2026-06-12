const saveMenuSchema = {
  nombre: { type: 'string', required: true }
};

const toggleStoreMenuSchema = {
  store_id: { type: 'number', required: true },
  menu_id: { type: 'number', required: true }
};

const saveCategorySchema = {
  nombre: { type: 'string', required: true }
};

const toggleStoreCategorySchema = {
  store_id: { type: 'number', required: true },
  categoria_id: { type: 'number', required: true }
};

const saveProductSchema = {
  nombre: { type: 'string', required: true },
  precio_base: { type: 'number', required: true }
};

const toggleStoreProductSchema = {
  store_id: { type: 'number', required: true },
  product_id: { type: 'number', required: true }
};

const saveIngredientSchema = {
  nombre: { type: 'string', required: true }
};

module.exports = {
  saveMenuSchema,
  toggleStoreMenuSchema,
  saveCategorySchema,
  toggleStoreCategorySchema,
  saveProductSchema,
  toggleStoreProductSchema,
  saveIngredientSchema
};
