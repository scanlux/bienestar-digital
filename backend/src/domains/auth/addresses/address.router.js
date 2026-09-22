const express = require('express');
const router = express.Router();
const addressController = require('./address.controller');
const { auth } = require('../../../middleware/auth');
const { validateBody } = require('../../../utils/validator');
const { createAddressSchema, updateAddressSchema } = require('../auth.validation');

// @route   GET /api/auth/addresses
// @desc    Obtener todas las direcciones del usuario autenticado
router.get('/', auth, addressController.getAddresses);

// @route   POST /api/auth/addresses
// @desc    Crear una nueva dirección
router.post('/', auth, validateBody(createAddressSchema), addressController.createAddress);

// @route   PUT /api/auth/addresses/:id
// @desc    Actualizar detalles de una dirección
router.put('/:id', auth, validateBody(updateAddressSchema), addressController.updateAddress);

// @route   PATCH /api/auth/addresses/:id/default
// @desc    Establecer una dirección como predeterminada
router.patch('/:id/default', auth, addressController.setDefaultAddress);

// @route   DELETE /api/auth/addresses/:id
// @desc    Eliminar una dirección
router.delete('/:id', auth, addressController.deleteAddress);

module.exports = router;
