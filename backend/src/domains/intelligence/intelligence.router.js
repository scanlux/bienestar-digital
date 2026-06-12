const express = require('express');
const router = express.Router();

const intelligenceController = require('./intelligence.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { saveStopWordsSchema, generateTagsSchema } = require('./intelligence.validation');

// Rutas protegidas por autenticación
router.use(auth);

// --- STOP WORDS ---
router.get('/intelligence/stop-words', hasPermission('manage_intelligence'), intelligenceController.getStopWords);
router.post('/intelligence/stop-words', hasPermission('manage_intelligence'), validateBody(saveStopWordsSchema), intelligenceController.createStopWords);
router.delete('/intelligence/stop-words/:id', hasPermission('manage_intelligence'), intelligenceController.deleteStopWord);

// --- GENERACION DE ETIQUETAS ---
router.post('/intelligence/generate-tags', hasPermission('manage_intelligence'), validateBody(generateTagsSchema), intelligenceController.generateTags);

// --- PRODUCT POPULARITY ANALYTICS ---
router.get('/analytics/popularity', hasPermission('view_analytics'), intelligenceController.getPopularityRanking);
router.post('/analytics/trigger', hasPermission('manage_intelligence'), intelligenceController.triggerPopularity);

module.exports = router;

