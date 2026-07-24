import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';

export interface AuditFilters {
  eventType: string;
  severity: string;
  actorType?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLog(limit: number = 15) {
  const { token } = useAuth();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({
    eventType: '',
    severity: '',
    actorType: '',
    startDate: '',
    endDate: ''
  });

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      let url = `${API_URL}/api/manage/security-logs?limit=${limit}&offset=${offset}`;
      if (filters.eventType) url += `&eventType=${filters.eventType}`;
      if (filters.severity) url += `&severity=${filters.severity}`;
      if (filters.actorType) url += `&actorType=${filters.actorType}`;
      if (filters.startDate) url += `&startDate=${filters.startDate}`;
      if (filters.endDate) url += `&endDate=${filters.endDate}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching security logs:', error);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const updateFilter = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ eventType: '', severity: '', actorType: '', startDate: '', endDate: '' });
    setPage(1);
  };

  return {
    logs,
    total,
    loading,
    page,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    refetch: fetchLogs
  };
}
