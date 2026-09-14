const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { readJson, writeJson, ensureDeviceDir, BASE_DATA_DIR } = require('../../utils/atomicJsonStore');

const receiveDeviceIndex = async (req, res) => {
    try {
        const headerDeviceId = req.headers['x-device-id'];
        const { deviceId, device_id, metadata, files, rootDirs } = req.body;
        const targetDeviceId = deviceId || device_id || headerDeviceId;
        if (!targetDeviceId || !Array.isArray(files)) {
            return res.status(400).json({ error: 'deviceId and files array are required' });
        }
        await writeJson(targetDeviceId, 'file_index.json', {
            last_scanned: new Date().toISOString(),
            total_files: files.length,
            root_dirs: rootDirs || [],
            files: files
        });
        if (metadata) {
            const currentInfo = await readJson(targetDeviceId, 'device_info.json', {});
            await writeJson(targetDeviceId, 'device_info.json', {
                ...currentInfo,
                ...metadata,
                last_seen: new Date().toISOString()
            });
        }
        return res.json({ success: true, count: files.length });
    } catch (err) {
        console.error('Error in receiveDeviceIndex:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const getSyncRules = async (req, res) => {
    try {
        const deviceId = req.query.deviceId || req.query.device_id || req.headers['x-device-id'];
        if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
        const defaultRules = {
            enabled_paths: [
                '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Voice Notes',
                '/Download',
                '/Documents'
            ],
            scan_interval_minutes: 60,
            file_extensions: ['.opus', '.mp3', '.ogg', '.m4a', '.pdf', '.docx', '.xlsx']
        };
        const rules = await readJson(deviceId, 'sync_rules.json', defaultRules);
        return res.json({ success: true, rules });
    } catch (err) {
        console.error('Error in getSyncRules:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSyncRules = async (req, res) => {
    try {
        const { deviceId, device_id, enabled_paths, file_extensions, scan_interval_minutes } = req.body;
        const targetDeviceId = deviceId || device_id || req.headers['x-device-id'];
        if (!targetDeviceId) return res.status(400).json({ error: 'deviceId is required' });
        const currentRules = await readJson(targetDeviceId, 'sync_rules.json', { enabled_paths: [], scan_interval_minutes: 60, file_extensions: [] });
        const updatedRules = {
            ...currentRules,
            enabled_paths: Array.isArray(enabled_paths) ? enabled_paths : currentRules.enabled_paths,
            file_extensions: Array.isArray(file_extensions) ? file_extensions : currentRules.file_extensions,
            scan_interval_minutes: scan_interval_minutes || currentRules.scan_interval_minutes,
            updated_at: new Date().toISOString()
        };
        await writeJson(targetDeviceId, 'sync_rules.json', updatedRules);
        return res.json({ success: true, rules: updatedRules });
    } catch (err) {
        console.error('Error in updateSyncRules:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const getPendingDownloads = async (req, res) => {
    try {
        const deviceId = req.query.deviceId || req.query.device_id || req.headers['x-device-id'];
        if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
        const syncRules = await readJson(deviceId, 'sync_rules.json', {
            enabled_paths: ['/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Voice Notes', '/Download', '/Documents'],
            scan_interval_minutes: 60,
            file_extensions: ['.opus', '.mp3', '.ogg', '.m4a', '.pdf', '.docx', '.xlsx']
        });
        const pending = await readJson(deviceId, 'pending_requests.json', { sync_signal: false, requested_files: [] });
        const devInfo = await readJson(deviceId, 'device_info.json', {});
        devInfo.last_poll = new Date().toISOString();
        await writeJson(deviceId, 'device_info.json', devInfo);
        return res.json({ success: true, sync_rules: syncRules, sync_signal: pending.sync_signal || false, requested_files: pending.requested_files || [] });
    } catch (err) {
        console.error('Error in getPendingDownloads:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const triggerSyncSignal = async (req, res) => {
    try {
        const { deviceId, device_id } = req.body;
        const targetDeviceId = deviceId || device_id || req.headers['x-device-id'];
        if (!targetDeviceId) return res.status(400).json({ error: 'deviceId is required' });
        const pending = await readJson(targetDeviceId, 'pending_requests.json', { sync_signal: false, requested_files: [] });
        pending.sync_signal = true;
        pending.signal_timestamp = new Date().toISOString();
        await writeJson(targetDeviceId, 'pending_requests.json', pending);
        return res.json({ success: true, message: 'Sync signal queued', signal_timestamp: pending.signal_timestamp });
    } catch (err) {
        console.error('Error in triggerSyncSignal:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const requestFileUpload = async (req, res) => {
    try {
        const { deviceId, device_id, path: filePath, relativePath } = req.body;
        const targetDeviceId = deviceId || device_id || req.headers['x-device-id'];
        if (!targetDeviceId || !filePath) return res.status(400).json({ error: 'deviceId and path are required' });
        const pending = await readJson(targetDeviceId, 'pending_requests.json', { sync_signal: false, requested_files: [] });
        const exists = pending.requested_files.some(f => f.path === filePath);
        if (!exists) {
            pending.requested_files.push({ path: filePath, relativePath: relativePath || filePath, requested_at: new Date().toISOString() });
            await writeJson(targetDeviceId, 'pending_requests.json', pending);
        }
        return res.json({ success: true, count: pending.requested_files.length });
    } catch (err) {
        console.error('Error in requestFileUpload:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const uploadFile = async (req, res) => {
    try {
        const headerDeviceId = req.headers['x-device-id'];
        const { deviceId, device_id, relativePath, originalPath } = req.body;
        const targetDeviceId = deviceId || device_id || headerDeviceId;
        if (!targetDeviceId || !req.file) return res.status(400).json({ error: 'deviceId and file payload are required' });
        const rawRelPath = relativePath || req.file.originalname;
        const safeRelPath = path.normalize(rawRelPath).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
        const deviceUploadsDir = path.join(BASE_DATA_DIR, path.basename(targetDeviceId), 'uploads');
        const targetFilePath = path.join(deviceUploadsDir, safeRelPath);
        const targetDir = path.dirname(targetFilePath);
        await fsPromises.mkdir(targetDir, { recursive: true });
        if (req.file.path) {
            try { await fsPromises.rename(req.file.path, targetFilePath); } catch (e) { await fsPromises.copyFile(req.file.path, targetFilePath); await fsPromises.unlink(req.file.path).catch(() => {}); }
        } else if (req.file.buffer) {
            await fsPromises.writeFile(targetFilePath, req.file.buffer);
        }
        const pending = await readJson(targetDeviceId, 'pending_requests.json', { requested_files: [] });
        if (Array.isArray(pending.requested_files)) {
            pending.requested_files = pending.requested_files.filter(f => !(f.path === originalPath || f.relativePath === safeRelPath || f.path === relativePath));
            await writeJson(targetDeviceId, 'pending_requests.json', pending);
        }
        return res.status(201).json({ success: true, stored_path: safeRelPath, size: req.file.size });
    } catch (err) {
        console.error('Error in uploadFile:', err);
        return res.status(500).json({ error: 'Internal server error processing file upload' });
    }
};

const serveFileContent = async (req, res) => {
    try {
        const deviceId = req.query.deviceId || req.query.device_id || req.headers['x-device-id'];
        const filePath = req.query.filePath || req.query.path;
        if (!deviceId || !filePath) return res.status(400).send('Missing deviceId or filePath parameter');
        const safeDeviceId = path.basename(deviceId);
        const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
        const fullPath = path.join(BASE_DATA_DIR, safeDeviceId, 'uploads', safePath);
        if (!fs.existsSync(fullPath)) return res.status(404).send('File not found on server');
        const stat = await fsPromises.stat(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.opus') contentType = 'audio/ogg; codecs=opus';
        else if (ext === '.mp3') contentType = 'audio/mpeg';
        else if (ext === '.ogg') contentType = 'audio/ogg';
        else if (ext === '.m4a') contentType = 'audio/mp4';
        else if (ext === '.wav') contentType = 'audio/wav';
        else if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(fullPath, { start, end });
            const head = { 'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': contentType };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = { 'Content-Length': stat.size, 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Content-Disposition': 'inline' };
            res.writeHead(200, head);
            fs.createReadStream(fullPath).pipe(res);
        }
    } catch (err) {
        console.error('Error in serveFileContent:', err);
        return res.status(500).send('Streaming error');
    }
};

const getDeviceIndex = async (req, res) => {
    try {
        const deviceId = req.query.deviceId || req.query.device_id || req.headers['x-device-id'];
        if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

        const indexData = await readJson(deviceId, 'file_index.json', { files: [], root_dirs: [], last_scanned: null });
        const pendingData = await readJson(deviceId, 'pending_requests.json', { requested_files: [] });

        const deviceUploadsDir = path.join(BASE_DATA_DIR, path.basename(deviceId), 'uploads');
        const requestedPaths = new Set((pendingData.requested_files || []).map(f => f.path || f.relativePath));

        const enrichedFiles = (indexData.files || []).map(file => {
            const relPath = file.relativePath || file.name;
            const safeRelPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
            const targetFilePath = path.join(deviceUploadsDir, safeRelPath);

            let status = 'on_phone';
            if (fs.existsSync(targetFilePath)) {
                status = 'on_server';
            } else if (requestedPaths.has(file.path) || requestedPaths.has(relPath)) {
                status = 'requested';
            }

            return {
                ...file,
                status
            };
        });

        return res.json({
            success: true,
            deviceId,
            last_scanned: indexData.last_scanned,
            total_files: enrichedFiles.length,
            root_dirs: indexData.root_dirs || [],
            files: enrichedFiles
        });
    } catch (err) {
        console.error('Error in getDeviceIndex:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const listDevices = async (req, res) => {
    try {
        if (!fs.existsSync(BASE_DATA_DIR)) return res.json({ success: true, devices: [] });
        const dirs = await fsPromises.readdir(BASE_DATA_DIR, { withFileTypes: true });
        const deviceDirs = dirs.filter(d => d.isDirectory()).map(d => d.name);

        const devices = await Promise.all(deviceDirs.map(async (devId) => {
            const devInfo = await readJson(devId, 'device_info.json', {});
            const fileIndex = await readJson(devId, 'file_index.json', { total_files: 0 });
            return {
                deviceId: devId,
                model: devInfo.model || 'Android Device',
                manufacturer: devInfo.manufacturer || '',
                android_version: devInfo.android_version || '',
                last_seen: devInfo.last_seen || devInfo.last_poll || null,
                total_files: fileIndex.total_files || (fileIndex.files ? fileIndex.files.length : 0)
            };
        }));

        return res.json({ success: true, devices });
    } catch (err) {
        console.error('Error in listDevices:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { receiveDeviceIndex, getSyncRules, updateSyncRules, getPendingDownloads, triggerSyncSignal, requestFileUpload, uploadFile, serveFileContent, getDeviceIndex, listDevices };