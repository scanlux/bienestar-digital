import { API_URL } from '@/constants';

export const formatTime = (time: string | null) => {
  if (!time) return 'N/A';
  try {
    const [h, m] = time.split(':');
    const hh = parseInt(h);
    const suffix = hh >= 12 ? 'PM' : 'AM';
    const hour12 = hh % 12 || 12;
    return `${hour12}:${m} ${suffix}`;
  } catch (e) {
    return time;
  }
};

export const getFullImageUrl = (url: string | null | undefined) => {
  if (!url) return '';
  // Si ya es una URL absoluta (http/https), usarla tal cual
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Si es un blob local (previsualización), usarlo directo
  if (url.startsWith('blob:')) return url;
  // Si inicia con /uploads/, anteponer la URL del servidor de medios de Bogotá
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:4001';
    return `${mediaUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  // Ruta relativa estándar: anteponer API_URL
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};
