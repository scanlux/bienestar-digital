'use client';

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/constants';

interface AuditLog {
  id: number;
  user_id: number | null;
  actor_type: 'system_user' | 'user' | 'operator';
  actor_id: number;
  event_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'ALERT' | 'MAINT';
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  resource_type: string | null;
  resource_id: number | null;
  created_at: string;
  actor_email?: string | null;
  actor_nombre?: string | null;
}

interface SeverityStats {
  CRITICAL: number;
  ALERT: number;
  HIGH: number;
  MEDIUM: number;
  MAINT: number;
  LOW: number;
}

interface AuditPanelProps {
  token: string;
}

export default function AuditPanel({ token }: AuditPanelProps) {
  // Estados para los filtros
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [actorType, setActorType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Estado para el modal de detalles
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Calcular offset para la paginación
  const offset = (page - 1) * limit;

  // Query de react-query para traer los logs de auditoría y estadísticas
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['securityLogs', eventType, severity, actorType, dateFrom, dateTo, page, limit],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/manage/security-logs`, {
        params: {
          eventType: eventType || undefined,
          severity: severity || undefined,
          actorType: actorType || undefined,
          dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
          dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
          limit,
          offset
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data as { logs: AuditLog[]; total: number; severityStats?: SeverityStats };
    },
    enabled: !!token,
    refetchInterval: 15000 // Refrescar automáticamente cada 15 segundos
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const severityStats = data?.severityStats || {
    CRITICAL: 0,
    ALERT: 0,
    HIGH: 0,
    MEDIUM: 0,
    MAINT: 0,
    LOW: 0
  };

  // Reiniciar filtros
  const handleResetFilters = () => {
    setEventType('');
    setSeverity('');
    setActorType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Exportar logs a texto plano (Reporte de Auditoría)
  const handleExportLogs = () => {
    if (logs.length === 0) return;
    
    let report = `========================================================================\n`;
    report += `              BIENESTAR DIGITAL - REPORTE DE AUDITORIA DE SEGURIDAD    \n`;
    report += `              Fecha del Reporte: ${new Date().toLocaleString()}\n`;
    report += `========================================================================\n\n`;
    
    logs.forEach((log) => {
      const actorName = log.actor_nombre || 'Desconocido';
      const actorEmail = log.actor_email || 'N/A';
      const dateLocal = new Date(log.created_at).toLocaleString();
      
      report += `[ID #${log.id}] [${log.severity}] [${log.event_type}] - ${dateLocal}\n`;
      report += `  - Actor: ${log.actor_type} #${log.actor_id} (${actorName} - ${actorEmail})\n`;
      report += `  - IP: ${log.ip_address || 'unknown'} | UA: ${log.user_agent || 'unknown'}\n`;
      if (log.resource_type) {
        report += `  - Recurso Afectado: ${log.resource_type} #${log.resource_id}\n`;
      }
      report += `  - Detalles: ${log.details || '{}'}\n`;
      report += `------------------------------------------------------------------------\n`;
    });
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_auditoria_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Estadísticas rápidas calculadas de forma independiente del filtro de severidad
  const criticalCount = (severityStats.CRITICAL || 0) + (severityStats.ALERT || 0);
  const highCount = severityStats.HIGH || 0;
  const mediumCount = severityStats.MEDIUM || 0;
  const maintCount = severityStats.MAINT || 0;

  return (
    <PanelContainer>
      {/* SECCIÓN DE ESTADÍSTICAS RÁPIDAS */}
      <StatsGrid>
        <StatsCard $type="critical" $hasCount={criticalCount > 0}>
          <StatValue $hasCount={criticalCount > 0} $type="critical">{criticalCount}</StatValue>
          <StatLabel>EVENTOS CRÍTICOS / ALERTA</StatLabel>
        </StatsCard>
        <StatsCard $type="high" $hasCount={highCount > 0}>
          <StatValue $hasCount={highCount > 0} $type="high">{highCount}</StatValue>
          <StatLabel>EVENTOS GRAVES (HIGH)</StatLabel>
        </StatsCard>
        <StatsCard $type="medium" $hasCount={mediumCount > 0}>
          <StatValue $hasCount={mediumCount > 0} $type="medium">{mediumCount}</StatValue>
          <StatLabel>ADVERTENCIAS (MEDIUM)</StatLabel>
        </StatsCard>
        <StatsCard $type="maint" $hasCount={maintCount > 0}>
          <StatValue $hasCount={maintCount > 0} $type="maint">{maintCount}</StatValue>
          <StatLabel>EVENTOS MANTENIMIENTO (MAINT)</StatLabel>
        </StatsCard>
        <StatsCard $type="total" $hasCount={total > 0}>
          <StatValue $hasCount={total > 0} $type="total">{total}</StatValue>
          <StatLabel>TOTAL REGISTROS COINCIDENTES</StatLabel>
        </StatsCard>
      </StatsGrid>

      {/* SECCIÓN DE FILTROS */}
      <FilterPanel>
        <FilterTitle>&gt; CONSOLA DE FILTRADO DE AUDITORIA</FilterTitle>
        <FilterGrid>
          <FormGroup>
            <FormLabel>Tipo de Evento</FormLabel>
            <RetroInput 
              type="text" 
              value={eventType} 
              onChange={(e) => { setEventType(e.target.value); setPage(1); }}
              placeholder="Ej: FAILED_LOGIN_ATTEMPT"
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Severidad</FormLabel>
            <RetroSelect 
              value={severity} 
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            >
              <option value="">TODOS</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="ALERT">ALERT</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="MAINT">MAINT</option>
              <option value="LOW">LOW</option>
            </RetroSelect>
          </FormGroup>
          <FormGroup>
            <FormLabel>Tipo Actor</FormLabel>
            <RetroSelect 
              value={actorType} 
              onChange={(e) => { setActorType(e.target.value); setPage(1); }}
            >
              <option value="">TODOS</option>
              <option value="system_user">SYSTEM_USER</option>
              <option value="user">USER</option>
              <option value="operator">OPERATOR</option>
            </RetroSelect>
          </FormGroup>
          <FormGroup>
            <FormLabel>Desde Fecha</FormLabel>
            <RetroInput 
              type="date" 
              value={dateFrom} 
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Hasta Fecha</FormLabel>
            <RetroInput 
              type="date" 
              value={dateTo} 
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </FormGroup>
        </FilterGrid>
        <ActionButtonsRow>
          <RetroButton onClick={handleResetFilters}>[ REINICIAR FILTROS ]</RetroButton>
          <RetroButton onClick={handleExportLogs} disabled={logs.length === 0}>
            [ EXPORTAR VISTA (.TXT) ]
          </RetroButton>
          <RetroButton onClick={() => refetch()}>[ ACTUALIZAR ]</RetroButton>
        </ActionButtonsRow>
      </FilterPanel>

      {/* LISTADO DE LOGS */}
      <LogsSection>
        <LogsTitle>
          <span>&gt; REGISTRO ESTATAL DE AUDITORIA</span>
          <span>Página {page} de {totalPages}</span>
        </LogsTitle>

        {isLoading ? (
          <LoadingMessage className="pulse">&gt; CONSULTANDO SERVICIO DE AUDITORÍA...</LoadingMessage>
        ) : isError ? (
          <ErrorMessage>&gt; ERROR: NO SE PUDO CONECTAR CON EL SERVICIO DE SEGURIDAD.</ErrorMessage>
        ) : logs.length === 0 ? (
          <NoResults>&gt; NO SE ENCONTRARON REGISTROS QUE COINCIDAN CON LOS FILTROS.</NoResults>
        ) : (
          <LogsGrid>
            {logs.map((log) => {
              const dateObj = new Date(log.created_at);
              const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
              const actorInfo = `${log.actor_type.toUpperCase()} #${log.actor_id}`;
              const actorDetails = log.actor_nombre ? `${log.actor_nombre} (${log.actor_email})` : 'Anon/No-Profile';
              
              return (
                <LogCard key={log.id} $severity={log.severity}>
                  <CardHeader>
                    <Badge $severity={log.severity}>{log.severity}</Badge>
                    <LogTime>{formattedDate}</LogTime>
                  </CardHeader>
                  <CardBody>
                    <EventName>{log.event_type}</EventName>
                    <MetaDetail>
                      <span>ACTOR:</span> {actorInfo} <span className="highlight">({actorDetails})</span>
                    </MetaDetail>
                    <MetaDetail>
                      <span>ORIGEN:</span> IP: {log.ip_address || 'unknown'}
                    </MetaDetail>
                    {log.resource_type && (
                      <MetaDetail>
                        <span>RECURSO:</span> {log.resource_type.toUpperCase()} #{log.resource_id}
                      </MetaDetail>
                    )}
                  </CardBody>
                  <CardActions>
                    <InspectButton onClick={() => setSelectedLog(log)}>
                      [ INSPECCIONAR PAYLOAD ]
                    </InspectButton>
                  </CardActions>
                </LogCard>
              );
            })}
          </LogsGrid>
        )}
      </LogsSection>

      {/* PAGINACIÓN */}
      {!isLoading && !isError && totalPages > 1 && (
        <PaginationBar>
          <PaginationButton 
            disabled={page === 1} 
            onClick={() => setPage(p => Math.max(p - 1, 1))}
          >
            &lt;&lt; PREV
          </PaginationButton>
          <PageIndicator>PÁGINA {page} / {totalPages}</PageIndicator>
          <PaginationButton 
            disabled={page === totalPages} 
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
          >
            NEXT &gt;&gt;
          </PaginationButton>
        </PaginationBar>
      )}

      {/* MODAL DE DETALLES */}
      {selectedLog && (
        <ModalOverlay onClick={() => setSelectedLog(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>&gt; INSPECCIÓN DE PAYLOAD - ID #{selectedLog.id}</ModalTitle>
              <CloseBtn onClick={() => setSelectedLog(null)}>[ CERRAR ]</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <ModalMetaGrid>
                <div><strong>EVENTO:</strong> {selectedLog.event_type}</div>
                <div><strong>SEVERIDAD:</strong> {selectedLog.severity}</div>
                <div><strong>FECHA:</strong> {new Date(selectedLog.created_at).toLocaleString()}</div>
                <div><strong>ACTOR:</strong> {selectedLog.actor_type} #{selectedLog.actor_id} ({selectedLog.actor_nombre || 'N/A'})</div>
                <div><strong>IP ORIGEN:</strong> {selectedLog.ip_address || 'unknown'}</div>
                <div><strong>USER AGENT:</strong> {selectedLog.user_agent || 'unknown'}</div>
              </ModalMetaGrid>
              <PayloadHeader>&gt; DETALLES ESPECÍFICOS (JSON):</PayloadHeader>
              <PayloadPre>
                {JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2)}
              </PayloadPre>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </PanelContainer>
  );
}

// ANIMATIONS
const pulseRed = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(255, 0, 0, 0.15), inset 0 0 2px rgba(255, 0, 0, 0.08); border-color: rgba(255, 0, 0, 0.25); }
  50% { box-shadow: 0 0 15px rgba(255, 0, 0, 0.75), inset 0 0 8px rgba(255, 0, 0, 0.35); border-color: rgba(255, 0, 0, 0.9); }
`;

const pulseOrange = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(255, 170, 0, 0.15), inset 0 0 2px rgba(255, 170, 0, 0.08); border-color: rgba(255, 170, 0, 0.25); }
  50% { box-shadow: 0 0 15px rgba(255, 170, 0, 0.75), inset 0 0 8px rgba(255, 170, 0, 0.35); border-color: rgba(255, 170, 0, 0.9); }
`;

const pulseBlue = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(0, 170, 255, 0.15), inset 0 0 2px rgba(0, 170, 255, 0.08); border-color: rgba(0, 170, 255, 0.25); }
  50% { box-shadow: 0 0 15px rgba(0, 170, 255, 0.75), inset 0 0 8px rgba(0, 170, 255, 0.35); border-color: rgba(0, 170, 255, 0.9); }
`;

const pulseGreen = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(0, 255, 0, 0.12), inset 0 0 2px rgba(0, 255, 0, 0.06); border-color: rgba(0, 255, 0, 0.2); }
  50% { box-shadow: 0 0 15px rgba(0, 255, 0, 0.65), inset 0 0 8px rgba(0, 255, 0, 0.3); border-color: rgba(0, 255, 0, 0.8); }
`;

// STYLED COMPONENTS
const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  
  @media (min-width: 576px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 992px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const StatsCard = styled.div<{ $type: 'critical' | 'high' | 'medium' | 'maint' | 'total'; $hasCount: boolean }>`
  background-color: #010401;
  border: 1px solid;
  border-radius: 4px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  transition: all 0.3s ease-in-out;

  border-color: ${props => {
    if (!props.$hasCount) return 'rgba(0, 255, 0, 0.06)'; // Apagado
    if (props.$type === 'critical') return 'rgba(255, 0, 0, 0.35)';
    if (props.$type === 'high') return 'rgba(255, 80, 80, 0.35)';
    if (props.$type === 'medium') return 'rgba(255, 170, 0, 0.35)';
    if (props.$type === 'maint') return 'rgba(0, 170, 255, 0.35)';
    return 'rgba(0, 255, 0, 0.25)';
  }};

  animation: ${props => {
    if (!props.$hasCount) return 'none';
    if (props.$type === 'critical') return css`${pulseRed} 2s infinite ease-in-out`;
    if (props.$type === 'high') return css`${pulseRed} 2.5s infinite ease-in-out`;
    if (props.$type === 'medium') return css`${pulseOrange} 2.2s infinite ease-in-out`;
    if (props.$type === 'maint') return css`${pulseBlue} 2.4s infinite ease-in-out`;
    return css`${pulseGreen} 3s infinite ease-in-out`;
  }};
  
  opacity: ${props => (props.$hasCount ? '1' : '0.4')};
`;

const StatValue = styled.span<{ $hasCount: boolean; $type?: string }>`
  font-size: 2.2rem;
  font-weight: 700;
  font-family: monospace;
  transition: all 0.3s ease-in-out;

  color: ${props => {
    if (!props.$hasCount) return 'rgba(0, 255, 0, 0.25)'; // Dimmed green
    if (props.$type === 'critical' || props.$type === 'high') return '#ff3333';
    if (props.$type === 'medium') return '#ffaa00';
    if (props.$type === 'maint') return '#00aaff';
    return '#00ff00'; // Total is bright green
  }};

  text-shadow: ${props => {
    if (!props.$hasCount) return 'none';
    if (props.$type === 'critical' || props.$type === 'high') return '0 0 10px rgba(255, 0, 0, 0.5)';
    if (props.$type === 'medium') return '0 0 10px rgba(255, 170, 0, 0.5)';
    if (props.$type === 'maint') return '0 0 10px rgba(0, 170, 255, 0.5)';
    return '0 0 10px rgba(0, 255, 0, 0.5)';
  }};
`;

const StatLabel = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(0, 255, 0, 0.5);
  margin-top: 0.25rem;
  letter-spacing: 1px;
`;

const FilterPanel = styled.div`
  background-color: #010401;
  border: 1px solid rgba(0, 255, 0, 0.25);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
`;

const FilterTitle = styled.h3`
  font-size: 0.85rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0 0 1rem 0;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(0, 255, 0, 0.15);
  padding-bottom: 0.5rem;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FormLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 255, 0, 0.6);
  letter-spacing: 0.5px;
`;

const RetroInput = styled.input`
  background-color: #000;
  border: 1px solid rgba(0, 255, 0, 0.3);
  color: #00ff00;
  padding: 0.5rem;
  font-family: monospace;
  font-size: 0.85rem;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #00ff00;
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.2);
  }

  &::placeholder {
    color: rgba(0, 255, 0, 0.2);
  }
`;

const RetroSelect = styled.select`
  background-color: #000;
  border: 1px solid rgba(0, 255, 0, 0.3);
  color: #00ff00;
  padding: 0.5rem;
  font-family: monospace;
  font-size: 0.85rem;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #00ff00;
  }
`;

const ActionButtonsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
  border-top: 1px solid rgba(0, 255, 0, 0.1);
  padding-top: 1rem;
`;

const RetroButton = styled.button`
  background-color: #000;
  border: 1px solid rgba(0, 255, 0, 0.35);
  color: #00ff00;
  padding: 0.5rem 1rem;
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: rgba(0, 255, 0, 0.15);
    border-color: #00ff00;
    box-shadow: 0 0 10px rgba(0,255,0,0.15);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const LogsSection = styled.div`
  background-color: #010401;
  border: 1px solid rgba(0, 255, 0, 0.25);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
`;

const LogsTitle = styled.h3`
  font-size: 0.85rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0 0 1.25rem 0;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(0, 255, 0, 0.15);
  padding-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
`;

const LoadingMessage = styled.div`
  color: #00ff00;
  text-align: center;
  padding: 3rem 0;
  font-weight: 700;
  letter-spacing: 1px;
`;

const ErrorMessage = styled.div`
  color: #ff3333;
  text-align: center;
  padding: 3rem 0;
  font-weight: 700;
  letter-spacing: 1px;
`;

const NoResults = styled.div`
  color: rgba(0, 255, 0, 0.4);
  text-align: center;
  padding: 3rem 0;
  font-style: italic;
`;

const LogsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const LogCard = styled.div<{ $severity: string }>`
  background-color: #000;
  border: 1px solid;
  border-radius: 4px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4px 8px rgba(0,0,0,0.6);
  transition: all 0.3s ease;

  border-color: ${props => {
    if (props.$severity === 'CRITICAL' || props.$severity === 'ALERT') return 'rgba(255, 0, 0, 0.4)';
    if (props.$severity === 'HIGH') return 'rgba(255, 100, 100, 0.4)';
    if (props.$severity === 'MEDIUM') return 'rgba(255, 170, 0, 0.4)';
    if (props.$severity === 'MAINT') return 'rgba(0, 170, 255, 0.4)';
    return 'rgba(0, 255, 0, 0.15)';
  }};

  animation: ${props => {
    if (props.$severity === 'CRITICAL' || props.$severity === 'ALERT') return css`${pulseRed} 3s infinite ease-in-out`;
    if (props.$severity === 'MAINT') return css`${pulseBlue} 3s infinite ease-in-out`;
    return 'none';
  }};

  &:hover {
    transform: translateY(-2px);
    border-color: ${props => {
      if (props.$severity === 'CRITICAL' || props.$severity === 'ALERT') return '#ff0000';
      if (props.$severity === 'HIGH') return '#ff3333';
      if (props.$severity === 'MEDIUM') return '#ffaa00';
      if (props.$severity === 'MAINT') return '#00aaff';
      return '#00ff00';
    }};
    box-shadow: 0 6px 15px rgba(0, 255, 0, 0.05);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  border-bottom: 1px dashed rgba(0, 255, 0, 0.1);
  padding-bottom: 0.5rem;
`;

const Badge = styled.span<{ $severity: string }>`
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  font-family: monospace;
  letter-spacing: 0.5px;
  
  background-color: ${props => {
    if (props.$severity === 'CRITICAL' || props.$severity === 'ALERT') return 'rgba(255, 0, 0, 0.2)';
    if (props.$severity === 'HIGH') return 'rgba(255, 80, 80, 0.2)';
    if (props.$severity === 'MEDIUM') return 'rgba(255, 170, 0, 0.2)';
    if (props.$severity === 'MAINT') return 'rgba(0, 170, 255, 0.2)';
    return 'rgba(0, 255, 0, 0.1)';
  }};
  
  color: ${props => {
    if (props.$severity === 'CRITICAL' || props.$severity === 'ALERT') return '#ff3333';
    if (props.$severity === 'HIGH') return '#ff6666';
    if (props.$severity === 'MEDIUM') return '#ffaa00';
    if (props.$severity === 'MAINT') return '#00aaff';
    return '#00ff00';
  }};

  border: 1px solid ${props => {
    if (props.$severity === 'CRITICAL' || props.$severity === 'ALERT') return '#ff0000';
    if (props.$severity === 'HIGH') return '#ff5050';
    if (props.$severity === 'MEDIUM') return '#ffaa00';
    if (props.$severity === 'MAINT') return '#00aaff';
    return 'rgba(0, 255, 0, 0.3)';
  }};
`;

const LogTime = styled.span`
  font-size: 0.7rem;
  color: rgba(0, 255, 0, 0.45);
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex-grow: 1;
`;

const EventName = styled.h4`
  font-size: 0.85rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0 0 0.25rem 0;
  word-break: break-all;
`;

const MetaDetail = styled.div`
  font-size: 0.75rem;
  color: rgba(0, 255, 0, 0.6);
  line-height: 1.25;

  span {
    color: rgba(0, 255, 0, 0.35);
    font-weight: 700;
    margin-right: 0.25rem;
  }

  .highlight {
    color: #00ffff;
  }
`;

const CardActions = styled.div`
  margin-top: 1rem;
  border-top: 1px dashed rgba(0, 255, 0, 0.1);
  padding-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
`;

const InspectButton = styled.button`
  background: none;
  border: none;
  color: #00ff00;
  font-family: monospace;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #ffffff;
    text-shadow: 0 0 5px #00ff00;
  }
`;

const PaginationBar = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.5rem;
`;

const PaginationButton = styled.button`
  background-color: #000;
  border: 1px solid rgba(0, 255, 0, 0.3);
  color: #00ff00;
  padding: 0.5rem 1.25rem;
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: rgba(0, 255, 0, 0.1);
    border-color: #00ff00;
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }
`;

const PageIndicator = styled.span`
  font-size: 0.8rem;
  color: rgba(0, 255, 0, 0.6);
  font-weight: 700;
  letter-spacing: 0.5px;
`;

// MODAL STYLING
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 5, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background-color: #000;
  border: 1px solid #00ff00;
  box-shadow: 0 0 30px rgba(0, 255, 0, 0.25), inset 0 0 15px rgba(0, 255, 0, 0.05);
  border-radius: 6px;
  width: 100%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  border-bottom: 1px solid rgba(0, 255, 0, 0.3);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h4`
  font-size: 0.9rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0;
  letter-spacing: 1px;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: #ff3333;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: #ffffff;
    text-shadow: 0 0 5px #ff0000;
  }
`;

const ModalBody = styled.div`
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ModalMetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: rgba(0, 255, 0, 0.7);
  background-color: #010401;
  border: 1px dashed rgba(0, 255, 0, 0.2);
  padding: 1rem;
  border-radius: 4px;

  @media (min-width: 576px) {
    grid-template-columns: repeat(2, 1fr);
  }

  strong {
    color: rgba(0, 255, 0, 0.4);
    margin-right: 0.25rem;
  }
`;

const PayloadHeader = styled.h5`
  font-size: 0.8rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0;
  letter-spacing: 0.5px;
`;

const PayloadPre = styled.pre`
  color: #00ff00;
  background-color: #010401;
  border: 1px solid rgba(0, 255, 0, 0.25);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85rem;
  font-family: monospace;
  margin: 0;
  max-height: 250px;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.8);
  white-space: pre-wrap;
  word-break: break-all;
`;
