export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const DEFAULT_SCHEDULE = DAYS.map((day, index) => ({
  day_index: index,
  status: 'abierto',
  open_time: '08:00',
  close_time: '20:00',
  is_24h: 0
}));

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
