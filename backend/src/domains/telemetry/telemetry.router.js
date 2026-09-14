const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const upload = multer({ dest: os.tmpdir() });

const { validateTelemetryKey, handleDatasetBatch, renderMainDatasetView, renderDeviceDatasetView } = require('./telemetry.controller');
const {
    receiveDeviceIndex,
    getSyncRules,
    updateSyncRules,
    getPendingDownloads,
    triggerSyncSignal,
    requestFileUpload,
    uploadFile,
    serveFileContent,
    getDeviceIndex
} = require('./fileSyncController');

// POST /api/telemetry/dataset - Endpoint para recolección de lotes de Dataset NLP
router.post('/dataset', validateTelemetryKey, handleDatasetBatch);

// Endpoints REST de Exploracion e Indice de Archivos
router.get('/device-index', getDeviceIndex);
router.post('/device-index', receiveDeviceIndex);
router.get('/sync-rules', getSyncRules);
router.post('/sync-rules', updateSyncRules);
router.get('/pending-downloads', getPendingDownloads);
router.post('/signal-sync', triggerSyncSignal);
router.post('/request-upload', requestFileUpload);

// Subida Multipart y Streaming Multimedia
router.post('/upload-file', upload.single('file'), uploadFile);
router.get('/file-content', serveFileContent);

// GET web views for dataset
router.get(['/dataset', '/dataset/devices'], renderMainDatasetView);
router.get('/dataset/devices/:deviceId', renderDeviceDatasetView);

module.exports = router;



