const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const redisClient = require('../config/redis');

async function run() {
  console.log('Desactivando modo mantenimiento en Redis local...');
  try {
    // Esperar un momento para que redisClient se autoconecte
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    await redisClient.set('system:maintenance_mode', 'false');
    console.log('✅ Modo mantenimiento desactivado exitosamente.');
  } catch (error) {
    console.error('❌ Error al desactivar modo mantenimiento:', error);
  } finally {
    await redisClient.disconnect();
    console.log('Conexión cerrada.');
  }
}

run();
