/**
 * Utilidades para el cálculo de capacidades y límites proporcionales.
 */

export interface CapacityResult {
  percent: number;
  isExceeded: boolean;
}

/**
 * Calcula de manera modular y proporcional el porcentaje de llenado y si se ha excedido el límite.
 * Si se excede, el porcentaje se calcula como (límite / usado) * 100.
 * Si no se excede, se calcula como (usado / límite) * 100.
 * 
 * @param used Cantidad de recursos consumidos o creados.
 * @param max Límite máximo permitido. Si es null, se considera ilimitado.
 */
export function calculateCapacity(used: number, max: number | null): CapacityResult {
  if (max === null) {
    return { percent: 100, isExceeded: false };
  }
  
  const isExceeded = used > max;
  const percent = isExceeded
    ? (max === 0 ? 0 : (max / used) * 100)
    : (max === 0 ? 0 : (used / max) * 100);
    
  return { percent, isExceeded };
}
