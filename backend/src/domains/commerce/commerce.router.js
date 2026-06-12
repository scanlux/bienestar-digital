const express = require('express');
const router = express.Router();

const commerceController = require('./commerce.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { createCommerceSchema, updateCommerceSchema, updateStatusSchema } = require('./commerce.validation');

// Todos los endpoints de administración de comercios requieren autenticación base
router.use(auth);

// Obtener todos los comercios (con filtrado BOLA a nivel de servicio)
router.get('/', hasPermission('view_commerces'), commerceController.getCommerces);

// Obtener un comercio por ID (con filtrado BOLA a nivel de servicio)
router.get('/:id', hasPermission('view_commerces'), commerceController.getCommerceById);

// Crear un nuevo comercio
router.post('/', hasPermission('create_commerce'), validateBody(createCommerceSchema), commerceController.createCommerce);

// Actualizar comercio (con filtrado BOLA a nivel de servicio)
router.put('/:id', hasPermission('edit_commerce'), validateBody(updateCommerceSchema), commerceController.updateCommerce);

// Cambiar estado de comercio
router.patch('/:id/status', hasPermission('edit_commerce'), validateBody(updateStatusSchema), commerceController.updateCommerceStatus);

module.exports = router;

