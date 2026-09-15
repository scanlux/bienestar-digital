const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!JWT_SECRET) {
  console.error('[CRITICAL] JWT_SECRET is not set in environment variables');
  process.exit(1);
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const DATASET_DIR = process.env.DATASET_DIR || '/var/www/bienestar/dataset_nlp';

const TELEMETRY_API_KEY = process.env.TELEMETRY_API_KEY || 'TECLA_NLP_SECRET_KEY_2026';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
const INTERNAL_BACKEND_URL = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://100.127.144.125:4000';

const EXPECTED_SESSION_HASH = crypto.createHash('sha256').update('Olmedo:Fghju/6tGhjU7y6TgFr&y7u(I').digest('hex');

// Ensure uploads directory structure exists
const ensureUploadDirs = () => {
  const types = ['stores', 'commerces', 'products', 'videos', 'requests', 'apks'];
  types.forEach(t => {
    const dir = path.join(UPLOAD_DIR, t);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

module.exports = {
  PORT,
  JWT_SECRET,
  REDIS_URL,
  UPLOAD_DIR,
  DATASET_DIR,
  TELEMETRY_API_KEY,
  INTERNAL_API_KEY,
  INTERNAL_BACKEND_URL,
  BACKEND_URL,
  EXPECTED_SESSION_HASH,
  ensureUploadDirs
};
