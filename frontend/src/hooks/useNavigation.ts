import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';

export interface NavItem {
  id: number;
  parent_id: number | null;
  label: string;
  page_title: string | null;
  path: string | null;
  icon: string | null;
  order_index: number;
  risk_level: 'normal' | 'high' | 'critical';
  isLocked: boolean;
  children?: NavItem[];
}

export function useNavigation() {
  const { token } = useAuth();
  
  return useQuery<NavItem[]>({
    queryKey: ['my-nav'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/auth/my-nav`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    staleTime: 0,
    gcTime: 0,
    enabled: !!token,
    retry: false
  });
}
