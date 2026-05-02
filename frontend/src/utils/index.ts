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
  return url;
};
