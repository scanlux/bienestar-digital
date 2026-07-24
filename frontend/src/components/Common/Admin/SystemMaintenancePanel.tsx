'use client';
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';

import MaintenanceModeCard from './MaintenanceModeCard';
import BypassRulesTable from './BypassRulesTable';

const HudContainer = styled.div`
  background-color: #030803; color: #00ff00; font-family: monospace;
  padding: 1.5rem; min-height: 100%; display: flex; flex-direction: column; gap: 1.5rem;
  box-sizing: border-box;
  * { box-sizing: border-box; }
`;

const HudTabs = styled.div`
  display: flex; gap: 1.5rem; border-bottom: 1px solid rgba(0, 255, 0, 0.2); margin-bottom: 1.5rem; padding-bottom: 0.5rem;
`;

const HudTab = styled.button<{ $active?: boolean }>`
  background: none; border: none; color: ${props => props.$active ? '#00ff00' : 'rgba(0, 255, 0, 0.4)'};
  font-family: monospace; font-size: 1rem; font-weight: 700; cursor: pointer; padding: 0.5rem 1rem;
  transition: all 0.2s;
  position: relative;
  &:hover { color: #00ff00; }
  &::after {
    content: ''; position: absolute; bottom: -9px; left: 0; right: 0; height: 2px;
    background: #00ff00; display: ${props => props.$active ? 'block' : 'none'};
    box-shadow: 0 0 10px #00ff00;
  }
`;

const MessageBar = styled.div<{ $type: 'success' | 'error' }>`
  background: ${props => props.$type === 'error' ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 255, 0, 0.15)'};
  border: 1px solid ${props => props.$type === 'error' ? '#ff0000' : '#00ff00'};
  color: ${props => props.$type === 'error' ? '#ff3333' : '#00ff00'};
  padding: 0.75rem 1rem; border-radius: 4px; font-size: 0.85rem; cursor: pointer;
  letter-spacing: 1px; text-shadow: 0 0 5px ${props => props.$type === 'error' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.5)'};
`;

export default function SystemMaintenancePanel() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'console' | 'bypass'>('console');

  const [logs, setLogs] = useState<string[]>([]);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Mantenimiento programado de infraestructura.');
  const [durationMinutes, setDurationMinutes] = useState('2');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [panicConfirmed, setPanicConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
  const logContentRef = useRef<HTMLDivElement>(null);

  const { data: statusData, error: statusError } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => (await axios.get(`${API_URL}/api/manage/system/maintenance/status`, { headers: { Authorization: `Bearer ${token}` } })).data,
    enabled: !!token, refetchInterval: 5000
  });

  const { data: logsData } = useQuery({
    queryKey: ['systemLogs'],
    queryFn: async () => (await axios.get(`${API_URL}/api/manage/system/maintenance/logs`, { headers: { Authorization: `Bearer ${token}` } })).data.logs,
    enabled: !!token && autoRefreshLogs, refetchInterval: 4000
  });

  useEffect(() => {
    if (logsData) setLogs(logsData);
  }, [logsData]);

  useEffect(() => {
    if (statusError) {
      const err = statusError as any;
      setErrorMsg(err.response?.data?.error || 'No se pudo conectar con el endpoint de diagnóstico.');
    }
  }, [statusError]);

  useEffect(() => {
    if (logContentRef.current) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [logs]);

  const enableMutation = useMutation({
    mutationFn: async ({ message, duration }: { message: string; duration: number }) => 
      axios.post(`${API_URL}/api/manage/system/maintenance/enable`, { message, durationMinutes: duration }, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: (res) => {
      setSuccessMsg(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
      queryClient.invalidateQueries({ queryKey: ['systemLogs'] });
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.error || err.message || 'Error al activar modo mantenimiento.')
  });

  const disableMutation = useMutation({
    mutationFn: async () => axios.post(`${API_URL}/api/manage/system/maintenance/disable`, {}, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: (res) => {
      setSuccessMsg(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
      queryClient.invalidateQueries({ queryKey: ['systemLogs'] });
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.error || 'Error al desactivar modo mantenimiento.')
  });

  const panicMutation = useMutation({
    mutationFn: async () => axios.post(`${API_URL}/api/manage/system/maintenance/panic`, {}, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: (res) => {
      setSuccessMsg(res.data.message);
      setPanicConfirmed(false);
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.error || 'Error al ejecutar revocación crítica.')
  });

  const handleEnableMaintenance = () => {
    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      setErrorMsg('La duración debe ser un número de minutos válido mayor a cero.');
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    enableMutation.mutate({ message: maintenanceMessage, duration });
  };

  const handleDisableMaintenance = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    disableMutation.mutate();
  };

  const handlePanicRevocation = () => {
    if (!panicConfirmed) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    panicMutation.mutate();
  };

  const clearLogs = () => setLogs([]);

  const isLocked = statusData?.maintenanceMode ?? false;
  const isLoadingMutations = enableMutation.isPending || disableMutation.isPending || panicMutation.isPending;

  return (
    <HudContainer>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="radar-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#00ff00" stopOpacity="0.3" />
            <stop offset="90%" stopColor="#005500" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {errorMsg && <MessageBar $type="error" onClick={() => setErrorMsg(null)}>[ SYSTEM ALERT ] {errorMsg} (Click para descartar)</MessageBar>}
      {successMsg && <MessageBar $type="success" onClick={() => setSuccessMsg(null)}>[ TELEMETRY STATUS ] {successMsg} (Click para descartar)</MessageBar>}

      <HudTabs>
        <HudTab $active={activeTab === 'console'} onClick={() => setActiveTab('console')}>ESTADO Y CONTROL</HudTab>
        <HudTab $active={activeTab === 'bypass'} onClick={() => setActiveTab('bypass')}>REGLAS BYPASS</HudTab>
      </HudTabs>

      {activeTab === 'console' && (
        <MaintenanceModeCard 
          status={statusData}
          logs={logs}
          maintenanceMessage={maintenanceMessage}
          setMaintenanceMessage={setMaintenanceMessage}
          durationMinutes={durationMinutes}
          setDurationMinutes={setDurationMinutes}
          isCustomDuration={isCustomDuration}
          setIsCustomDuration={setIsCustomDuration}
          panicConfirmed={panicConfirmed}
          setPanicConfirmed={setPanicConfirmed}
          autoRefreshLogs={autoRefreshLogs}
          setAutoRefreshLogs={setAutoRefreshLogs}
          handleEnableMaintenance={handleEnableMaintenance}
          handleDisableMaintenance={handleDisableMaintenance}
          handlePanicRevocation={handlePanicRevocation}
          clearLogs={clearLogs}
          loading={isLoadingMutations}
          logContentRef={logContentRef}
          queryClient={queryClient}
        />
      )}

      {activeTab === 'bypass' && <BypassRulesTable />}
    </HudContainer>
  );
}
