'use client';

import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/constants';

interface CronHistoryEntry {
  timestamp: string;
  status: 'success' | 'failure' | 'unknown';
  message: string | null;
}

interface CronJob {
  name: string;
  description: string;
  schedule: string;
  script: string;
  lastRun: string | null;
  status: 'success' | 'failure' | 'unknown';
  message: string | null;
  history: CronHistoryEntry[];
}

export default function SystemCronJobsPage() {
  const { user, token } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [selectedJobForHistory, setSelectedJobForHistory] = useState<CronJob | null>(null);

  // Sincronizar reloj de cabecera en tiempo de Bogotá / Local
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      setCurrentTime(new Intl.DateTimeFormat('es-CO', options).format(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isRoot = user?.actorType === 'system_user' && user?.rol === 'root';

  // Query para obtener el estado de los cronjobs
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['systemCronjobs'],
    queryFn: async ({ signal }) => {
      const res = await axios.get(`${API_URL}/api/manage/system/maintenance/cronjobs`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      return res.data.cronjobs as CronJob[];
    },
    enabled: !!token && isRoot,
    refetchInterval: 10000 // Refrescar cada 10 segundos
  });

  const handleOpenHistory = (job: CronJob) => {
    setSelectedJobForHistory(job);
  };

  const handleCloseHistory = () => {
    setSelectedJobForHistory(null);
  };

  // Si no tiene acceso root
  if (!isRoot) {
    return (
      <HudContainer>
        <MessageBar $type="error">
          [ SYSTEM SECURITY WARNING ] ACCESO NO AUTORIZADO. PRIVILEGIOS DE ROOT REQUERIDOS.
        </MessageBar>
        <PanelCard style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
          <PanelTitle style={{ justifyContent: 'center' }}>&gt; ACCESO DENEGADO</PanelTitle>
          <ErrorSymbol>☣</ErrorSymbol>
          <div style={{ color: '#ff3333', fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
            ERROR 403: PRIVILEGIOS DE ROOT INSUFICIENTES
          </div>
          <p style={{ color: 'rgba(0, 255, 0, 0.6)', fontSize: '0.85rem', lineHeight: '1.6', fontFamily: 'monospace', textAlign: 'left' }}>
            La consola de visualización de tareas cron, ciclos de sincronización de mejoras de comercio, optimización del catálogo y cálculos de popularidad están restringidos exclusivamente a la cuenta principal de administración del sistema (sys root).
          </p>
          <Divider style={{ margin: '1.5rem 0' }} />
          <p style={{ color: 'rgba(255, 51, 51, 0.6)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            Este evento ha sido reportado en la bitácora de auditoría de seguridad del ecosistema.
          </p>
        </PanelCard>
      </HudContainer>
    );
  }

  return (
    <HudContainer>
      <HeaderBlock>
        <HeaderTitle>&gt; CONSOLA MAESTRA DE CRONJOBS (ROOT ONLY)</HeaderTitle>
        <HeaderInfo>
          <span>NODO: ARM-USA</span>
          <Separator>|</Separator>
          <span>HORA (COLOMBIA): {currentTime}</span>
        </HeaderInfo>
      </HeaderBlock>

      {error && (
        <MessageBar $type="error" onClick={() => refetch()}>
          [ ALERTA DE SISTEMA ] Error al consultar telemetría de cronjobs: {(error as any).message || 'Desconocido'}. Haz clic para reintentar.
        </MessageBar>
      )}

      <GridContainer>
        {/* PANEL RESUMEN - Ocupa toda la primera fila */}
        <PanelCard>
          <PanelTitle>&gt; ESTADO GENERAL DE HILOS</PanelTitle>
          <TelemetryOverview>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <OverviewItem style={{ flex: '1 1 200px' }}>
                <OverviewLabel>Tareas Registradas:</OverviewLabel>
                <OverviewVal>3</OverviewVal>
              </OverviewItem>
              <OverviewItem style={{ flex: '1 1 200px' }}>
                <OverviewLabel>Hilos Activos:</OverviewLabel>
                <OverviewVal $color="#00ff00">
                  {data ? data.filter(c => c.status === 'success').length : 0} OK
                </OverviewVal>
              </OverviewItem>
              <OverviewItem style={{ flex: '1 1 200px' }}>
                <OverviewLabel>Hilos Fallidos:</OverviewLabel>
                <OverviewVal $color={data && data.some(c => c.status === 'failure') ? '#ff3333' : '#00ff00'}>
                  {data ? data.filter(c => c.status === 'failure').length : 0} ERR
                </OverviewVal>
              </OverviewItem>
            </div>
            <Divider style={{ margin: '1rem 0' }} />
            <OverviewInstructions>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <span className="blink">&gt; MONITOREO ACTIVO DESDE REDIS</span>
                <ManualRefBtn onClick={() => refetch()}>
                  [ SOLICITAR TELEMETRÍA EN VIVO ]
                </ManualRefBtn>
              </div>
            </OverviewInstructions>
          </TelemetryOverview>
        </PanelCard>

        {/* LISTADO DE CRONJOBS - Ocupan todo el ancho abajo uno de otro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          {isLoading ? (
            <PanelCard>
              <LoadingText className="pulse">&gt; LEYENDO CLAVES DE REDIS EN ARM-USA...</LoadingText>
            </PanelCard>
          ) : data && data.length > 0 ? (
            data.map((job) => (
              <PanelCard key={job.name}>
                <PanelTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <span>&gt; SCRIPT: {job.script}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <HistoryBtn onClick={() => handleOpenHistory(job)}>
                      [ VER HISTORIAL DE EJECUCIONES ]
                    </HistoryBtn>
                    <StatusBadge $status={job.status}>
                      [{job.status.toUpperCase()}]
                    </StatusBadge>
                  </div>
                </PanelTitle>
                
                <JobDetailsGrid>
                  <DetailRow>
                    <DetailKey>Identificador:</DetailKey>
                    <DetailValue>{job.name}</DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailKey>Frecuencia Programada:</DetailKey>
                    <DetailValue className="highlight">{job.schedule}</DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailKey>Última Ejecución (UTC):</DetailKey>
                    <DetailValue>
                      {job.lastRun ? new Date(job.lastRun).toISOString().replace('T', ' ').substring(0, 19) : 'NUNCA'}
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailKey>Última Ejecución (Bogotá):</DetailKey>
                    <DetailValue>
                      {job.lastRun 
                        ? new Date(job.lastRun).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) 
                        : 'NUNCA'}
                    </DetailValue>
                  </DetailRow>
                </JobDetailsGrid>

                <JobDescription>
                  <strong>Función:</strong> {job.description}
                </JobDescription>

                <TerminalLogsBlock>
                  <TerminalHeader>
                    <span>CONSOLA SALIDA stdout ({job.name})</span>
                  </TerminalHeader>
                  <TerminalBody className={job.status === 'failure' ? 'err' : ''}>
                    {job.message ? `> ${job.message}` : '> Ningún mensaje registrado en el búfer de Redis.'}
                  </TerminalBody>
                </TerminalLogsBlock>
              </PanelCard>
            ))
          ) : (
            <PanelCard>
              <p style={{ color: 'rgba(0, 255, 0, 0.5)' }}>&gt; No se encontraron cronjobs configurados.</p>
            </PanelCard>
          )}
        </div>
      </GridContainer>

      {/* VENTANA MODAL DEL HISTORIAL */}
      {selectedJobForHistory && (
        <ModalBackdrop onClick={handleCloseHistory}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>&gt; HISTORIAL DE EJECUCIONES: {selectedJobForHistory.script}</ModalTitle>
              <ModalCloseBtn onClick={handleCloseHistory}>[ CERRAR ]</ModalCloseBtn>
            </ModalHeader>
            <ModalBody>
              {selectedJobForHistory.history && selectedJobForHistory.history.length > 0 ? (
                <HistoryTableContainer>
                  <HistoryTable>
                    <thead>
                      <tr>
                        <Th>FECHA (COLOMBIA / UTC)</Th>
                        <Th>ESTADO</Th>
                        <Th>MENSAJE DE SALIDA</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedJobForHistory.history.map((run: any, idx: number) => {
                        const bogotaTime = new Date(run.timestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
                        const utcTime = new Date(run.timestamp).toISOString().replace('T', ' ').substring(0, 19);
                        return (
                          <tr key={idx}>
                            <Td className="date-col">
                              <div>{bogotaTime}</div>
                              <div style={{ fontSize: '0.65rem', color: 'rgba(0, 255, 0, 0.4)', marginTop: '2px' }}>UTC: {utcTime}</div>
                            </Td>
                            <Td className="status-col">
                              <StatusBadge $status={run.status}>
                                [{run.status.toUpperCase()}]
                              </StatusBadge>
                            </Td>
                            <Td className="msg-col">
                              {run.message || 'Sin mensaje de salida.'}
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </HistoryTable>
                </HistoryTableContainer>
              ) : (
                <div style={{ padding: '3rem 0', textAlign: 'center', color: 'rgba(0, 255, 0, 0.5)', fontFamily: 'monospace' }}>
                  &gt; Ningún registro histórico de ejecución en el búfer de Redis para este cronjob.
                </div>
              )}
            </ModalBody>
          </ModalContent>
        </ModalBackdrop>
      )}
    </HudContainer>
  );
}

// Keyframes
const pulseColor = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const blinkText = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

// Styled Components
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

const PanelCard = styled.div`
  background-color: #010401;
  border: 1px solid rgba(0, 255, 0, 0.25);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(0, 255, 0, 0.03);
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const PanelTitle = styled.h2`
  font-size: 0.9rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0 0 1.25rem 0;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(0, 255, 0, 0.15);
  padding-bottom: 0.5rem;
`;

const HeaderBlock = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #00ff00;
  padding-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderTitle = styled.h1`
  font-size: 1.1rem;
  margin: 0;
  font-weight: 900;
  letter-spacing: 1.5px;
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
`;

const HeaderInfo = styled.div`
  font-size: 0.8rem;
  color: rgba(0, 255, 0, 0.75);
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Separator = styled.span`
  color: rgba(0, 255, 0, 0.3);
`;

const GridContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

const TelemetryOverview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const OverviewItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  border: 1px dashed rgba(0, 255, 0, 0.15);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  background: rgba(0, 255, 0, 0.01);
`;

const OverviewLabel = styled.span`
  color: rgba(0, 255, 0, 0.7);
`;

const OverviewVal = styled.span<{ $color?: string }>`
  font-weight: bold;
  color: ${props => props.$color || '#00ff00'};
  text-shadow: 0 0 4px ${props => props.$color || '#00ff00'}80;
`;

const Divider = styled.div`
  height: 1px;
  background-color: rgba(0, 255, 0, 0.15);
  margin: 0.5rem 0;
`;

const OverviewInstructions = styled.div`
  font-size: 0.8rem;
  color: rgba(0, 255, 0, 0.6);
  line-height: 1.5;

  .blink {
    font-weight: bold;
    display: inline-block;
    color: #00ff00;
    animation: ${blinkText} 2.5s infinite step-end;
  }
`;

const ManualRefBtn = styled.button`
  background: none;
  border: none;
  color: #00ff00;
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  text-align: left;
  transition: opacity 0.2s;

  &:hover {
    text-decoration: underline;
    opacity: 0.8;
  }
`;

const LoadingText = styled.div`
  color: rgba(0, 255, 0, 0.7);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
  animation: ${pulseColor} 1.5s infinite ease-in-out;
`;

const StatusBadge = styled.span<{ $status: 'success' | 'failure' | 'unknown' }>`
  font-weight: bold;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  
  ${props => {
    switch (props.$status) {
      case 'success':
        return css`
          color: #00ff00;
          text-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
        `;
      case 'failure':
        return css`
          color: #ff3333;
          text-shadow: 0 0 5px rgba(255, 0, 0, 0.7);
        `;
      default:
        return css`
          color: #888888;
          text-shadow: 0 0 5px rgba(136, 136, 136, 0.7);
        `;
    }
  }}
`;

const HistoryBtn = styled.button`
  background: none;
  border: 1px solid rgba(0, 255, 0, 0.4);
  color: #00ff00;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0.35rem 0.85rem;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(0, 255, 0, 0.1);
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
  }
`;

const JobDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;

  @media (min-width: 576px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const DetailRow = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
`;

const DetailKey = styled.span`
  color: rgba(0, 255, 0, 0.55);
`;

const DetailValue = styled.span`
  color: #ffffff;
  
  &.highlight {
    color: #00ffff;
    text-shadow: 0 0 3px rgba(0, 255, 255, 0.5);
  }
`;

const JobDescription = styled.div`
  font-size: 0.8rem;
  color: rgba(0, 255, 0, 0.85);
  background: rgba(0, 255, 0, 0.03);
  border: 1px solid rgba(0, 255, 0, 0.1);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  line-height: 1.4;
`;

const TerminalLogsBlock = styled.div`
  border: 1px solid rgba(0, 255, 0, 0.2);
  border-radius: 4px;
  overflow: hidden;
  background-color: #000500;
`;

const TerminalHeader = styled.div`
  background-color: #011401;
  border-bottom: 1px solid rgba(0, 255, 0, 0.2);
  padding: 0.4rem 0.75rem;
  font-size: 0.7rem;
  color: rgba(0, 255, 0, 0.7);
  font-weight: bold;
`;

const TerminalBody = styled.div`
  padding: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  color: #00ff00;
  max-height: 120px;
  overflow-y: auto;

  &.err {
    color: #ff4444;
  }
`;

const ErrorSymbol = styled.div`
  font-size: 4rem;
  color: #ff3333;
  text-shadow: 0 0 15px rgba(255, 0, 0, 0.5);
  margin-bottom: 1rem;
`;

// Styled Components para el Modal
const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
`;

const ModalContent = styled.div`
  background-color: #010401;
  border: 2px solid #00ff00;
  border-radius: 8px;
  width: 100%;
  max-width: 850px;
  max-height: 85vh;
  box-shadow: 0 0 35px rgba(0, 255, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  background-color: #011401;
  border-bottom: 2px solid #00ff00;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h3`
  font-size: 0.95rem;
  margin: 0;
  color: #00ff00;
  font-weight: bold;
  letter-spacing: 1px;
`;

const ModalCloseBtn = styled.button`
  background: none;
  border: none;
  color: #ff3333;
  font-family: monospace;
  font-weight: bold;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover {
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.7);
    text-decoration: underline;
  }
`;

const ModalBody = styled.div`
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const HistoryTableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const HistoryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  text-align: left;
`;

const Th = styled.th`
  border-bottom: 1px solid rgba(0, 255, 0, 0.3);
  color: rgba(0, 255, 0, 0.7);
  padding: 0.75rem 0.5rem;
  font-weight: bold;
`;

const Td = styled.td`
  border-bottom: 1px solid rgba(0, 255, 0, 0.1);
  color: #ffffff;
  padding: 0.75rem 0.5rem;
  vertical-align: top;
  
  &.date-col {
    color: #00ffff;
    width: 30%;
  }
  
  &.status-col {
    width: 15%;
  }
  
  &.msg-col {
    font-family: monospace;
    color: rgba(255, 255, 255, 0.9);
    white-space: pre-wrap;
    word-break: break-all;
  }
`;
