/**
 * Utilidades para manejo de tiempo y zonas horarias, enfocado en lógica de negocio.
 */

/**
 * Determina si una tienda está abierta en este preciso momento, evaluando 
 * su estado global y su horario diario específico en la zona horaria de Bogotá.
 * 
 * @param {string} globalStatus - El estado global de la sede (ej. 'abierto', 'mantenimiento', 'cerrado')
 * @param {Array} scheduleArray - Array con los horarios de la sede (de la tabla store_operating_hours)
 * @returns {boolean} - true si está abierta ahora, false si está cerrada
 */
function isStoreCurrentlyOpen(globalStatus, scheduleArray) {
    // 1. Validación de estado global (Prioridad más alta)
    if (!globalStatus) return false;
    if (globalStatus.toLowerCase() !== 'operativo') {
        return false; // Mantenimiento, cerrado, vacaciones, etc.
    }

    // 2. Si no hay horario detallado configurado pero el estado global es 'operativo',
    // asumimos que está abierta por retrocompatibilidad.
    if (!scheduleArray || !Array.isArray(scheduleArray) || scheduleArray.length === 0) {
        return true;
    }

    // 3. Obtener la hora actual exacta en la zona horaria de operación (Colombia)
    // Se usa el truco de formatear y luego re-parsear para tener un objeto Date ajustado.
    const nowBogotaStr = new Date().toLocaleString("en-US", { timeZone: "America/Bogota" });
    const nowBogota = new Date(nowBogotaStr);
    
    const currentDay = nowBogota.getDay(); // 0 = Domingo, 1 = Lunes...
    
    // Formatear a HH:MM:SS para comparar con la base de datos
    const currentHours = String(nowBogota.getHours()).padStart(2, '0');
    const currentMinutes = String(nowBogota.getMinutes()).padStart(2, '0');
    const currentSeconds = String(nowBogota.getSeconds()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}:${currentSeconds}`;

    // 4. Buscar la configuración específica para el día de hoy
    const todaySchedule = scheduleArray.find(s => s.day_index === currentDay);

    if (!todaySchedule) {
        // No hay configuración para este día en específico
        return true;
    }

    // 5. Verificar el estado específico del día
    if (todaySchedule.status === 'cerrado' || todaySchedule.status === 'vacaciones') {
        return false;
    }

    // 6. Verificar si es 24 horas
    if (todaySchedule.is_24h === 1 || todaySchedule.is_24h === true) {
        return true;
    }

    // 7. Comparar rangos de horas
    const openTime = todaySchedule.open_time; // formato esperado: "08:00:00"
    const closeTime = todaySchedule.close_time; // formato esperado: "20:00:00"

    if (!openTime || !closeTime) {
        return true; // Horario malformado, precaución
    }

    // Manejo de cierres a medianoche (00:00 o 00:00:00)
    // Si la tienda cierra a la medianoche, cualquier hora antes de las 23:59 es válida siempre que sea >= a openTime
    if (closeTime === '00:00' || closeTime === '00:00:00') {
        return (currentTimeStr >= openTime);
    }

    // Como la UI previene cruces de medianoche, podemos hacer comparación directa de strings
    return (currentTimeStr >= openTime && currentTimeStr <= closeTime);
}

module.exports = {
    isStoreCurrentlyOpen
};
