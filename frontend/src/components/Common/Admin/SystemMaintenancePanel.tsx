'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/constants';
import AuditPanel from './AuditPanel';

interface Diagnostics {
  database: 'OK' | 'FAILED';
  redis: 'OK' | 'FAILED';
}

interface SystemStatus {
  maintenanceMode: boolean;
  maintenanceState?: string;
  details: {
    message: string;
    estimated_end?: string;
    started_at?: string;
  } | null;
  globalRevocationEpoch: number | null;
  diagnostics: Diagnostics;
}

export default function SystemMaintenancePanel() {
  const { token, user } = useAuth();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'audit'>('console');
  const isRoot = user?.actorType === 'system_user' && user?.rol === 'root';

  const [logs, setLogs] = useState<string[]>([]);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>('Mantenimiento programado de infraestructura.');
  const [durationMinutes, setDurationMinutes] = useState<string>('2'); // 2 minutos por defecto
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [panicConfirmed, setPanicConfirmed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState<boolean>(true);
  const logContentRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // Query: Status
  const { data: statusData, error: statusError } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: async ({ signal }) => {
      const res = await axios.get(`${API_URL}/api/manage/system/maintenance/status`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      return res.data;
    },
    enabled: !!token,
    refetchInterval: 5000 // Polling cada 5 segundos
  });

  // Query: Logs
  const { data: logsData } = useQuery({
    queryKey: ['systemLogs'],
    queryFn: async ({ signal }) => {
      const res = await axios.get(`${API_URL}/api/manage/system/maintenance/logs`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      return res.data.logs;
    },
    enabled: !!token && autoRefreshLogs,
    refetchInterval: 4000 // Polling cada 4 segundos para logs
  });

  // Sync Status
  useEffect(() => {
    if (statusData) {
      setStatus(statusData);
      setErrorMsg(null);
    }
  }, [statusData]);

  // Sync Logs
  useEffect(() => {
    if (logsData) {
      setLogs(logsData);
    }
  }, [logsData]);

  // Handle status error
  useEffect(() => {
    if (statusError) {
      const err = statusError as any;
      console.error('Error fetching system status:', err);
      setErrorMsg(err.response?.data?.error || 'No se pudo conectar con el endpoint de diagnostico.');
    }
  }, [statusError]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContentRef.current) {
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [logs]);

  // Mutation: Habilitar mantenimiento
  const enableMutation = useMutation({
    mutationFn: async ({ message, durationMinutes }: { message: string; durationMinutes: number }) => {
      return axios.post(
        `${API_URL}/api/manage/system/maintenance/enable`,
        { message, durationMinutes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: (res) => {
      setSuccessMsg(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
      queryClient.invalidateQueries({ queryKey: ['systemLogs'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Error al activar modo mantenimiento.');
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  // Mutation: Deshabilitar mantenimiento
  const disableMutation = useMutation({
    mutationFn: async () => {
      return axios.post(
        `${API_URL}/api/manage/system/maintenance/disable`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: (res) => {
      setSuccessMsg(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
      queryClient.invalidateQueries({ queryKey: ['systemLogs'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Error al desactivar modo mantenimiento.');
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  // Mutation: Botón de Pánico
  const panicMutation = useMutation({
    mutationFn: async () => {
      return axios.post(
        `${API_URL}/api/manage/system/maintenance/panic`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: (res) => {
      setSuccessMsg(res.data.message);
      setPanicConfirmed(false);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Error al ejecutar revocacion critica.');
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  // Acciones de la consola
  const handleEnableMaintenance = async () => {
    if (!token) return;
    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      setErrorMsg('La duracion debe ser un numero de minutos valido mayor a cero.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    enableMutation.mutate({ message: maintenanceMessage, durationMinutes: duration });
  };

  const handleDisableMaintenance = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    disableMutation.mutate();
  };

  const handlePanicRevocation = async () => {
    if (!token || !panicConfirmed) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    panicMutation.mutate();
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const isLocked = status?.maintenanceMode ?? false;
  const currentState = status?.maintenanceState || (status?.maintenanceMode ? 'true' : 'false');

  return (
    <HudContainer>
      {/* Definición de gradiente SVG para el radar */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="radar-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#00ff00" stopOpacity="0.3" />
            <stop offset="90%" stopColor="#005500" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Mensajes temporales de éxito/error */}
      {errorMsg && (
        <MessageBar $type="error" onClick={() => setErrorMsg(null)}>
          [ SYSTEM ALERT ] {errorMsg} (Click para descartar)
        </MessageBar>
      )}
      {successMsg && (
        <MessageBar $type="success" onClick={() => setSuccessMsg(null)}>
          [ TELEMETRY STATUS ] {successMsg} (Click para descartar)
        </MessageBar>
      )}

      <HudTabs>
        <HudTab $active={activeTab === 'console'} onClick={() => setActiveTab('console')}>
          ESTADO Y CONTROL
        </HudTab>
        {isRoot && (
          <HudTab $active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>
            AUDITORÍA DE SEGURIDAD
          </HudTab>
        )}
      </HudTabs>

      {activeTab === 'console' ? (
        <>
          <GridPanel>
            {/* PANEL IZQUIERDO: RADAR SVG Y TELEMETRIA */}
            <Column>
              <PanelCard>
                <PanelTitle>&gt; RADAR DE CICLO DE VIDA</PanelTitle>
                <RadarWrapper>
                  <RadarSvg viewBox="0 0 200 200">
                    {/* Círculos concéntricos del radar */}
                    <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0, 255, 0, 0.15)" strokeWidth="1" />
                    <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(0, 255, 0, 0.1)" strokeWidth="1" />
                    <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(0, 255, 0, 0.1)" strokeWidth="1" />
                    <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(0, 255, 0, 0.08)" strokeWidth="1" />
                    
                    {/* Líneas de ejes en cruz */}
                    <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(0, 255, 0, 0.15)" strokeWidth="1" />
                    <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(0, 255, 0, 0.15)" strokeWidth="1" />

                    {/* Sweep del radar (Rotación constante) */}
                    <RadarSweep cx="100" cy="100" r="85" $active={isLocked} />

                    {/* Marcador central */}
                    <RadarCenter cx="100" cy="100" r="6" $active={isLocked} />
                  </RadarSvg>
                  <RadarStatusText $active={isLocked}>
                    {isLocked ? 'SYSTEM_LOCKED' : 'SYSTEM_OPERATIONAL'}
                  </RadarStatusText>
                </RadarWrapper>
              </PanelCard>

              <PanelCard>
                <PanelTitle>&gt; TELEMETRIA DE SERVICIOS</PanelTitle>
                <TelemetryList>
                  <TelemetryRow>
                    <TelemetryLabel>Base de datos MariaDB</TelemetryLabel>
                    <TelemetryBadge $state={status?.diagnostics.database === 'OK' ? 'online' : 'error'}>
                      {status?.diagnostics.database === 'OK' ? '[ ONLINE ]' : '[ OFFLINE ]'}
                    </TelemetryBadge>
                  </TelemetryRow>
                  <TelemetryRow>
                    <TelemetryLabel>Caché en Redis</TelemetryLabel>
                    <TelemetryBadge $state={status?.diagnostics.redis === 'OK' ? 'online' : 'error'}>
                      {status?.diagnostics.redis === 'OK' ? '[ ONLINE ]' : '[ OFFLINE ]'}
                    </TelemetryBadge>
                  </TelemetryRow>
                  
                  <Divider />

                  <TelemetryRow>
                    <TelemetryLabel>Fuerza del Núcleo</TelemetryLabel>
                    <BarWrapper>
                      <BarFill $width={status?.diagnostics.database === 'OK' ? '100%' : '10%'} $color="#00ff00" />
                    </BarWrapper>
                  </TelemetryRow>
                  <TelemetryRow>
                    <TelemetryLabel>Tráfico API Local</TelemetryLabel>
                    <BarWrapper>
                      <BarFill $width="35%" $color="#00ffff" />
                    </BarWrapper>
                  </TelemetryRow>
                  <TelemetryRow>
                    <TelemetryLabel>Carga de Memoria</TelemetryLabel>
                    <BarWrapper>
                      <BarFill $width="58%" $color="#ffaa00" />
                    </BarWrapper>
                  </TelemetryRow>
                </TelemetryList>
              </PanelCard>
            </Column>

            {/* PANEL CENTRAL: DECK DE ACCIONES Y BOTONES */}
            <Column className="span-2">
              <PanelCard $height="100%">
                <PanelTitle>&gt; CONSOLA DE ACCIONES DE ARRANQUE Y CONTROL</PanelTitle>
                
                <ActionDeck>
                  <FormGroup>
                    <FormLabel>Mensaje del Modo Mantenimiento</FormLabel>
                    <RetroTextInput 
                      type="text" 
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="Escribe el mensaje que verán los usuarios..."
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>Duración del Mantenimiento</FormLabel>
                    <PresetGrid>
                      {['2', '15', '30', '60', '120'].map((time) => (
                        <PresetBtn 
                          key={time}
                          type="button" 
                          $selected={!isCustomDuration && durationMinutes === time}
                          onClick={() => {
                            setIsCustomDuration(false);
                            setDurationMinutes(time);
                          }}
                        >
                          {time === '2' ? '2m (Dev)' : time === '60' ? '1h' : time === '120' ? '2h' : `${time}m`}
                        </PresetBtn>
                      ))}
                      <PresetBtn 
                        type="button" 
                        $selected={isCustomDuration}
                        onClick={() => setIsCustomDuration(true)}
                      >
                        Manual
                      </PresetBtn>
                    </PresetGrid>

                    {isCustomDuration && (
                      <CustomDurationWrapper>
                        <RetroTextInput 
                          type="number" 
                          min="1"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(e.target.value)}
                          placeholder="Minutos de mantenimiento"
                        />
                        <span className="unit">MINUTOS</span>
                      </CustomDurationWrapper>
                    )}
                  </FormGroup>

                  <Divider />

                  <ArcadeButtonConsole>
                    {/* Botón Iniciar Mantenimiento */}
                    <ArcadeButtonWrapper>
                      <ArcadeButton 
                        onClick={handleEnableMaintenance}
                        disabled={loading || isLocked}
                        $color="amber"
                      >
                        Iniciar Mantenimiento
                      </ArcadeButton>
                      <ArcadeLabel>ACTIVATE LOCK</ArcadeLabel>
                    </ArcadeButtonWrapper>

                    {/* Botón Restablecer Conexión */}
                    <ArcadeButtonWrapper>
                      <ArcadeButton 
                        onClick={handleDisableMaintenance}
                        disabled={loading || !isLocked}
                        $color="green"
                        $active={!isLocked}
                        $blinking={isLocked}
                      >
                        Restablecer Conexión
                      </ArcadeButton>
                      <ArcadeLabel>OPEN SYSTEM</ArcadeLabel>
                    </ArcadeButtonWrapper>

                    {/* Botón de Pánico */}
                    <ArcadeButtonWrapper className="panic-wrapper">
                      <PanicSafetyLock>
                        <input 
                          type="checkbox" 
                          id="safety-lock" 
                          checked={panicConfirmed}
                          onChange={(e) => setPanicConfirmed(e.target.checked)}
                        />
                        <label htmlFor="safety-lock">Desbloquear Pánico</label>
                      </PanicSafetyLock>
                      <ArcadeButton 
                        onClick={handlePanicRevocation}
                        disabled={loading || !panicConfirmed}
                        $color="red"
                        className={panicConfirmed ? 'panic-pulsing' : ''}
                      >
                        Botón de Pánico
                      </ArcadeButton>
                      <ArcadeLabel>KILL SESSIONS</ArcadeLabel>
                    </ArcadeButtonWrapper>
                  </ArcadeButtonConsole>

                  <LEDConsole>
                    <LEDUnit>
                      <LEDLamp $state="green" $active={currentState === 'false'} />
                      <span>ONLINE</span>
                    </LEDUnit>
                    <LEDUnit>
                      <LEDLamp $state="orange" $active={currentState === 'quiescing'} />
                      <span>QUIESCING</span>
                    </LEDUnit>
                    <LEDUnit>
                      <LEDLamp $state="red" $active={currentState === 'true'} />
                      <span>LOCKED</span>
                    </LEDUnit>
                  </LEDConsole>

                  <LockMetadataPanel>
                    <MetaRow>
                      <span>Mantenimiento Activo:</span>
                      <span className={isLocked ? 'glow-red' : 'glow-green'}>
                        {isLocked ? 'SI (ACCESO BLOQUEADO)' : 'NO (ACCESO PUBLICO)'}
                      </span>
                    </MetaRow>
                    <MetaRow>
                      <span>Último Arranque Epoch:</span>
                      <span>{status?.globalRevocationEpoch ? `${status.globalRevocationEpoch} (${new Date(status.globalRevocationEpoch * 1000).toLocaleTimeString()})` : 'N/A'}</span>
                    </MetaRow>
                    {status?.details && (
                      <>
                        <MetaRow>
                          <span>Inicio Mantenimiento:</span>
                          <span>{status.details.started_at ? new Date(status.details.started_at).toLocaleString() : 'N/A'}</span>
                        </MetaRow>
                        <MetaRow>
                          <span>Final estimado Mantenimiento:</span>
                          <span>{status.details.estimated_end ? new Date(status.details.estimated_end).toLocaleString() : 'N/A'}</span>
                        </MetaRow>
                      </>
                    )}
                  </LockMetadataPanel>
                </ActionDeck>
              </PanelCard>
            </Column>
          </GridPanel>

          {/* REGISTRO DE LOGS DE INICIALIZACION (LIVE LOG READER) */}
          <PanelCard className="margin-top">
            <PanelTitle>
              <span>&gt; CONSOLA STDOUT EN VIVO (logs/combined.log)</span>
              <LogControls>
                <LogControlBtn onClick={() => queryClient.invalidateQueries({ queryKey: ['systemLogs'] })}>Refrescar Logs</LogControlBtn>
                <LogControlBtn onClick={clearLogs}>Limpiar Vista</LogControlBtn>
                <LogAutoLabel>
                  <input 
                    type="checkbox" 
                    checked={autoRefreshLogs}
                    onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                  />
                  Auto-Refrescar (4s)
                </LogAutoLabel>
              </LogControls>
            </PanelTitle>
            <TerminalLogContent ref={logContentRef}>
              {logs.length === 0 ? (
                <TerminalLine className="dim">&gt; No hay registros disponibles en el búfer local.</TerminalLine>
              ) : (
                logs.map((log, idx) => (
                  <TerminalLine key={idx} className={log.includes('[ERROR]') ? 'err' : log.includes('[WARN]') ? 'wrn' : ''}>
                    {log}
                  </TerminalLine>
                ))
              )}
              <TerminalLine className="pulse">&gt; LECTURA ACTIVA DE ARCHIVO LOGS...</TerminalLine>
            </TerminalLogContent>
          </PanelCard>
        </>
      ) : (
        <AuditPanel token={token || ''} />
      )}
    </HudContainer>
  );
}

// Keyframes
const rotateSweep = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulseRed = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;

const pulsePanic = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(255, 0, 0, 0.4), inset 0 0 10px rgba(255, 0, 0, 0.3); }
  50% { box-shadow: 0 0 25px rgba(255, 0, 0, 0.95), inset 0 0 15px rgba(255, 0, 0, 0.7); }
`;

const pulseGreen = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 0, 0.4), inset 0 0 5px rgba(0, 255, 0, 0.3); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.95), inset 0 0 10px rgba(0, 255, 0, 0.7); }
`;

const pulseOrange = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(255, 170, 0, 0.4), inset 0 0 5px rgba(255, 170, 0, 0.3); }
  50% { box-shadow: 0 0 20px rgba(255, 170, 0, 0.95), inset 0 0 10px rgba(255, 170, 0, 0.7); }
`;

const pulseRedGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(255, 51, 51, 0.4), inset 0 0 5px rgba(255, 51, 51, 0.3); }
  50% { box-shadow: 0 0 20px rgba(255, 51, 51, 0.95), inset 0 0 10px rgba(255, 51, 51, 0.7); }
`;

const textBlink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const openBlink = keyframes`
  0%, 94.4% {
    opacity: 0.35;
    box-shadow: none;
  }
  94.5%, 100% {
    opacity: 1;
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.95), inset 0 0 10px rgba(0, 255, 0, 0.7);
  }
`;

const HudTabs = styled.div`
  display: flex;
  gap: 1.5rem;
  border-bottom: 1px solid rgba(0, 255, 0, 0.2);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
`;

const HudTab = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  color: ${props => props.$active ? '#00ff00' : 'rgba(0, 255, 0, 0.4)'};
  font-family: monospace;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.5rem 1rem;
  transition: all 0.2s;
  position: relative;

  &:hover {
    color: #00ff00;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -9px;
    left: 0;
    right: 0;
    height: 2px;
    background: #00ff00;
    display: ${props => props.$active ? 'block' : 'none'};
    box-shadow: 0 0 10px #00ff00;
  }
`;

const HudContainer = styled.div`
  background-color: #030803;
  color: #00ff00;
  font-family: monospace;
  padding: 1.5rem;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
`;

const MessageBar = styled.div<{ $type: 'success' | 'error' }>`
  background: ${props => props.$type === 'error' ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 255, 0, 0.15)'};
  border: 1px solid ${props => props.$type === 'error' ? '#ff0000' : '#00ff00'};
  color: ${props => props.$type === 'error' ? '#ff3333' : '#00ff00'};
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  letter-spacing: 1px;
  text-shadow: 0 0 5px ${props => props.$type === 'error' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.5)'};
`;

const GridPanel = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 992px) {
    grid-template-columns: 1fr 2fr;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &.span-2 {
    @media (min-width: 992px) {
      grid-column: span 1;
    }
  }
`;

const PanelCard = styled.div<{ $height?: string }>`
  background-color: #010401;
  border: 1px solid rgba(0, 255, 0, 0.25);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(0, 255, 0, 0.03);
  display: flex;
  flex-direction: column;
  height: ${props => props.$height || 'auto'};

  &.margin-top {
    margin-top: 0.5rem;
  }
`;

const PanelTitle = styled.h2`
  font-size: 0.9rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0 0 1.25rem 0;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(0, 255, 0, 0.15);
  padding-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const RadarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
`;

const RadarSvg = styled.svg`
  width: 170px;
  height: 170px;
  background-color: #000a00;
  border-radius: 50%;
  border: 1px solid rgba(0, 255, 0, 0.3);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.1);
  position: relative;
`;

const RadarSweep = styled.circle<{ $active: boolean }>`
  transform-origin: 100px 100px;
  animation: ${rotateSweep} 4s linear infinite;
  fill: url(#radar-gradient);
  stroke: ${props => props.$active ? '#ff0000' : '#00ff00'};
  stroke-width: 0.5;
  stroke-dasharray: 2 100;
  
  ${props => props.$active 
    ? css`stroke: #ff0000; filter: drop-shadow(0 0 4px rgba(255,0,0,0.8));`
    : css`stroke: #00ff00; filter: drop-shadow(0 0 4px rgba(0,255,0,0.8));`
  }
`;

const RadarCenter = styled.circle<{ $active: boolean }>`
  fill: ${props => props.$active ? '#ff0000' : '#00ff00'};
  box-shadow: 0 0 8px ${props => props.$active ? '#ff0000' : '#00ff00'};
  animation: ${pulseRed} 2s infinite ease-in-out;
  
  ${props => props.$active 
    ? css`fill: #ff3333;`
    : css`fill: #00ff00;`
  }
`;

const RadarStatusText = styled.div<{ $active: boolean }>`
  margin-top: 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 2px;
  animation: ${textBlink} 2s infinite step-end;
  color: ${props => props.$active ? '#ff3333' : '#00ff00'};
  text-shadow: 0 0 8px ${props => props.$active ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,0,0.5)'};
`;

const TelemetryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TelemetryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
`;

const TelemetryLabel = styled.span`
  color: rgba(0, 255, 0, 0.7);
`;

const TelemetryBadge = styled.span<{ $state: 'online' | 'error' }>`
  font-weight: 700;
  font-size: 0.85rem;
  color: ${props => props.$state === 'online' ? '#00ff00' : '#ff3333'};
  text-shadow: 0 0 5px ${props => props.$state === 'online' ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.5)'};
`;

const Divider = styled.div`
  height: 1px;
  background-color: rgba(0, 255, 0, 0.15);
  margin: 0.25rem 0;
`;

const BarWrapper = styled.div`
  width: 100px;
  height: 10px;
  background: rgba(0, 255, 0, 0.05);
  border: 1px solid rgba(0, 255, 0, 0.2);
  border-radius: 2px;
  overflow: hidden;
`;

const BarFill = styled.div<{ $width: string; $color: string }>`
  height: 100%;
  width: ${props => props.$width};
  background-color: ${props => props.$color};
  box-shadow: 0 0 5px ${props => props.$color}80;
  transition: width 0.5s ease;
`;

const ActionDeck = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ArcadeButtonConsole = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1.5rem;
  padding: 0.5rem 0;
`;

const ArcadeButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const ArcadeLabel = styled.span`
  font-size: 0.65rem;
  color: rgba(0, 255, 0, 0.4);
  letter-spacing: 1.5px;
  font-weight: 700;
`;

const ArcadeButton = styled.button<{ $color: 'amber' | 'green' | 'red'; $active?: boolean; $blinking?: boolean }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 4px solid #111;
  cursor: pointer;
  outline: none;
  font-size: 0px; /* Esconder texto para el look arcade redondo */
  transition: all 0.15s ease;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 4px;
    border-radius: 50%;
    filter: blur(1px);
    transition: all 0.15s;
  }

  ${props => props.$blinking && css`
    animation: ${openBlink} 1.8s infinite linear;
  `}

  /* Colores */
  ${props => props.$color === 'amber' && css`
    background: radial-gradient(circle, #ffaa00 20%, #885500 100%);
    box-shadow: 0 4px 10px rgba(255, 170, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.4);
    &::before { background: rgba(255, 170, 0, 0.25); }
    &:hover {
      box-shadow: 0 6px 15px rgba(255, 170, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
  `}

  ${props => props.$color === 'green' && css`
    background: radial-gradient(circle, #00ff00 20%, #006600 100%);
    box-shadow: 0 4px 10px rgba(0, 255, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.4);
    &::before { background: rgba(0, 255, 0, 0.25); }
    &:hover {
      box-shadow: 0 6px 15px rgba(0, 255, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
  `}

  ${props => props.$color === 'red' && css`
    background: radial-gradient(circle, #ff3333 20%, #660000 100%);
    box-shadow: 0 4px 10px rgba(255, 51, 51, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.4);
    &::before { background: rgba(255, 51, 51, 0.25); }
    &:hover {
      box-shadow: 0 6px 15px rgba(255, 51, 51, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
    &.panic-pulsing {
      animation: ${pulsePanic} 1s infinite ease-in-out;
    }
  `}

  &:active {
    transform: translateY(2px) !important;
    box-shadow: 0 2px 5px rgba(0,0,0,0.5) !important;
  }

  &:disabled {
    opacity: ${props => props.$active ? '1' : '0.35'};
    cursor: not-allowed;
    transform: none !important;
    box-shadow: ${props => props.$active ? '' : 'none !important'};
  }
`;

const PanicSafetyLock = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
  font-size: 0.7rem;
  color: #ff3333;

  input {
    cursor: pointer;
  }
  label {
    cursor: pointer;
    font-weight: 700;
  }
`;

const LEDConsole = styled.div`
  display: flex;
  gap: 2rem;
  justify-content: center;
  align-items: center;
  background: #000;
  border: 1px solid rgba(0, 255, 0, 0.15);
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  margin-bottom: 1rem;
`;

const LEDUnit = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
`;

const LEDLamp = styled.div<{ $state: 'green' | 'orange' | 'red'; $active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #222;
  transition: all 0.3s;

  ${props => !props.$active && css`
    background-color: #112211;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.8);
    opacity: 0.4;
  `}

  ${props => props.$active && props.$state === 'green' && css`
    background-color: #00ff00;
    box-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, inset 0 2px 2px rgba(255, 255, 255, 0.5);
    animation: ${pulseGreen} 1.5s infinite ease-in-out;
  `}

  ${props => props.$active && props.$state === 'orange' && css`
    background-color: #ffaa00;
    box-shadow: 0 0 10px #ffaa00, 0 0 20px #ffaa00, inset 0 2px 2px rgba(255, 255, 255, 0.5);
    animation: ${pulseOrange} 1s infinite ease-in-out;
  `}

  ${props => props.$active && props.$state === 'red' && css`
    background-color: #ff3333;
    box-shadow: 0 0 10px #ff3333, 0 0 20px #ff3333, inset 0 2px 2px rgba(255, 255, 255, 0.5);
    animation: ${pulseRedGlow} 1s infinite ease-in-out;
  `}
`;

const LockMetadataPanel = styled.div`
  background: rgba(0, 255, 0, 0.02);
  border: 1px solid rgba(0, 255, 0, 0.15);
  border-radius: 4px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  .glow-green {
    color: #00ff00;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
  }

  .glow-red {
    color: #ff3333;
    text-shadow: 0 0 5px rgba(255, 51, 51, 0.5);
    font-weight: 700;
  }
`;

const LogControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const LogControlBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(0, 255, 0, 0.4);
  color: #00ff00;
  font-family: monospace;
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 255, 0, 0.15);
    border-color: #00ff00;
  }
`;

const LogAutoLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: rgba(0, 255, 0, 0.6);
  cursor: pointer;

  input {
    cursor: pointer;
  }
`;

const TerminalLogContent = styled.div`
  height: 250px;
  background-color: #000;
  border: 1px solid rgba(0, 255, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #000;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 0, 0.3);
    border-radius: 3px;
  }
`;

const TerminalLine = styled.div`
  color: rgba(0, 255, 0, 0.85);
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-all;

  &.dim {
    color: rgba(0, 255, 0, 0.4);
  }

  &.err {
    color: #ff3333;
    background: rgba(255, 0, 0, 0.05);
    padding: 0.1rem 0.25rem;
    border-radius: 2px;
  }

  &.wrn {
    color: #ffaa00;
  }

  &.pulse {
    color: rgba(0, 255, 0, 0.5);
    animation: ${textBlink} 1.5s infinite ease-in-out;
  }
`;

const CustomDurationWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;

  input {
    max-width: 150px;
  }

  .unit {
    font-size: 0.8rem;
    color: rgba(0, 255, 0, 0.6);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FormLabel = styled.label`
  font-size: 0.75rem;
  color: rgba(0, 255, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
`;

const RetroTextInput = styled.input`
  background: #000;
  border: 1px solid rgba(0, 255, 0, 0.35);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  color: #00ff00;
  font-family: monospace;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: #00ff00;
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.2);
  }

  &::placeholder {
    color: rgba(0, 255, 0, 0.25);
  }
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.5rem;
`;

const PresetBtn = styled.button<{ $selected: boolean }>`
  background-color: ${props => props.$selected ? 'rgba(0, 255, 0, 0.2)' : '#000'};
  border: 1px solid ${props => props.$selected ? '#00ff00' : 'rgba(0, 255, 0, 0.35)'};
  color: #00ff00;
  padding: 0.5rem;
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(0, 255, 0, 0.1);
    border-color: #00ff00;
  }
`;
