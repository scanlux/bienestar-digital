const fs = require('fs');
const path = require('path');
require('dotenv').config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const videosDir = path.join(UPLOAD_DIR, 'videos');

async function runCleanup() {
  console.log('Iniciando limpieza automatica de videos antiguos de mas de 5 dias...');
  
  if (!fs.existsSync(videosDir)) {
    console.log(`El directorio de videos no existe: ${videosDir}. Finalizando.`);
    process.exit(0);
  }

  try {
    const files = fs.readdirSync(videosDir);
    const now = Date.now();
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(videosDir, file);
      const stat = fs.statSync(filePath);
      
      // Solo procesar archivos (omitir directorios)
      if (stat.isFile()) {
        const ageMs = now - stat.mtimeMs;
        if (ageMs > FIVE_DAYS_MS) {
          fs.unlinkSync(filePath);
          console.log(`Eliminado archivo antiguo: ${file} (Antiguedad: ${(ageMs / (24 * 60 * 60 * 1000)).toFixed(1)} dias)`);
          deletedCount++;
        }
      }
    }
    
    console.log(`SUCCESS: Limpieza de videos completada. Se eliminaron ${deletedCount} archivos.`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR: Error en la limpieza de videos:', err);
    process.exit(1);
  }
}

runCleanup();
