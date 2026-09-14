const fs = require('fs').promises;
const path = require('path');

const BASE_DATA_DIR = process.env.DATA_STORAGE_PATH || (
    process.platform === 'win32' 
        ? path.join(process.cwd(), 'data', 'devices') 
        : '/data/devices'
);

async function ensureDeviceDir(deviceId) {
    if (!deviceId) {
        throw new Error('deviceId is required');
    }
    const safeDeviceId = path.basename(deviceId);
    const deviceDir = path.join(BASE_DATA_DIR, safeDeviceId);
    const uploadsDir = path.join(deviceDir, 'uploads');
    
    await fs.mkdir(deviceDir, { recursive: true });
    await fs.mkdir(uploadsDir, { recursive: true });
    return deviceDir;
}

async function readJson(deviceId, fileName, defaultValue = null) {
    try {
        const safeDeviceId = path.basename(deviceId);
        const safeFileName = path.basename(fileName);
        const filePath = path.join(BASE_DATA_DIR, safeDeviceId, safeFileName);
        
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return defaultValue;
        }
        throw err;
    }
}

async function writeJson(deviceId, fileName, data) {
    const safeDeviceId = path.basename(deviceId);
    const safeFileName = path.basename(fileName);
    
    const deviceDir = await ensureDeviceDir(safeDeviceId);
    const targetPath = path.join(deviceDir, safeFileName);
    const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;

    
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempPath, targetPath);
}

module.exports = {
    ensureDeviceDir,
    readJson,
    writeJson,
    BASE_DATA_DIR
};
