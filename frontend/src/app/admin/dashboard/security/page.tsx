'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';


const EVENT_TYPES = [
  { id: '', label: 'Todos los eventos' },
  { id: 'BOLA_ATTEMPT', label: 'Intento BOLA / IDOR' },
  { id: 'UNAUTHORIZED_ROUTE_ACCESS', label: 'Acceso no autorizado a ruta' },
  { id: 'FAILED_LOGIN_ATTEMPT', label: 'Fallo de inicio de sesión' },
  { id: 'SUCCESSFUL_LOGIN', label: 'Inicio de sesión exitoso' }
];

const SEVERITIES = [
  { id: '', label: 'Todas las gravedades' },
  { id: 'LOW', label: 'Baja (LOW)' },
  { id: 'MEDIUM', label: 'Media (MEDIUM)' },
  { id: 'HIGH', label: 'Alta (HIGH)' },
  { id: 'CRITICAL', label: 'Crítica (CRITICAL)' }
];

export default function SecurityAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  
  const limit = 15;
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchLogs();
    }
  }, [token, eventType, severity, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      let url = `${API_URL}/api/manage/security-logs?limit=${limit}&offset=${offset}`;
      if (eventType) url += `&eventType=${eventType}`;
      if (severity) url += `&severity=${severity}`;

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
  };

  const handleResetFilters = () => {
    setEventType('');
    setSeverity('');
    setPage(1);
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'linear-gradient(135deg, #ff3b30 0%, #ff2d55 100%)';
      case 'HIGH':
        return 'linear-gradient(135deg, #ff9500 0%, #ff3b30 100%)';
      case 'MEDIUM':
        return 'linear-gradient(135deg, #ffcc00 0%, #ff9500 100%)';
      case 'LOW':
        return 'linear-gradient(135deg, #34c759 0%, #00c7be 100%)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const getEventLabel = (type: string) => {
    const matched = EVENT_TYPES.find(e => e.id === type);
    return matched ? matched.label : type;
  };

  const formatDetails = (detailsStr: any) => {
    if (!detailsStr) return 'Sin detalles disponibles.';
    try {
      const parsed = typeof detailsStr === 'string' ? JSON.parse(detailsStr) : detailsStr;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(detailsStr);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <Container>
      <Header>
        <TitleGroup>
          <Subtitle>Panel de Monitoreo —</Subtitle>
          <Title>Auditoría de Seguridad y Eventos Críticos</Title>
        </TitleGroup>
      </Header>

      {/* Filters bar */}
      <FilterBar>
        <FilterGroup>
          <Label>Tipo de Evento</Label>
          <Select value={eventType} onChange={e => { setEventType(e.target.value); setPage(1); }}>
            {EVENT_TYPES.map(e => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label>Severidad</Label>
          <Select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }}>
            {SEVERITIES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </FilterGroup>

        <Button onClick={handleResetFilters} secondary style={{ alignSelf: 'flex-end', height: '42px' }}>
          Limpiar Filtros
        </Button>
      </FilterBar>

      {/* Data presentation */}
      {loading ? (
        <LoadingState>
          <Spinner />
          <p>Obteniendo registros de seguridad...</p>
        </LoadingState>
      ) : logs.length === 0 ? (
        <EmptyState>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.15 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>No se encontraron eventos de seguridad registrados con los filtros actuales.</p>
        </EmptyState>
      ) : (
        <>
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Evento</th>
                  <th>Severidad</th>
                  <th>Usuario</th>
                  <th>IP</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      {new Date(log.created_at).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td>
                      <EventText>{getEventLabel(log.event_type)}</EventText>
                      <EventCode>{log.event_type}</EventCode>
                    </td>
                    <td>
                      <SeverityBadge $background={getSeverityColor(log.severity)}>
                        {log.severity}
                      </SeverityBadge>
                    </td>
                    <td>
                      {log.user_id ? (
                        <>
                          <UserEmail>{log.user_email}</UserEmail>
                          <UserDetail>ID: {log.user_id} | {log.user_nombre}</UserDetail>
                        </>
                      ) : (
                        <UserEmail style={{ color: 'rgba(255,255,255,0.3)' }}>ANÓNIMO / SISTEMA</UserEmail>
                      )}
                    </td>
                    <td>{log.ip_address || 'Sin IP'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <ActionButton onClick={() => setSelectedLog(log)}>Inspeccionar</ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>

          <Pagination>
            <PageButton onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
              &larr; Anterior
            </PageButton>
            <PageInfo>Pág. {page} de {totalPages} ({total} eventos totales)</PageInfo>
            <PageButton onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
              Siguiente &rarr;
            </PageButton>
          </Pagination>
        </>
      )}

      {/* Inspection Modal Portal */}
      {selectedLog && typeof window !== 'undefined' && document.getElementById('modal-portal-root') && 
        createPortal(
          <ModalOverlay onClick={() => setSelectedLog(null)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <div>
                  <ModalTitle>Detalle del Evento de Seguridad</ModalTitle>
                  <ModalSubtitle>Log #{selectedLog.id} &bull; Gravedad: {selectedLog.severity}</ModalSubtitle>
                </div>
                <CloseButton onClick={() => setSelectedLog(null)}>&times;</CloseButton>
              </ModalHeader>
              <ModalBody>
                <DetailGrid>
                  <DetailItem>
                    <DetailLabel>Tipo de Evento</DetailLabel>
                    <DetailValue>{getEventLabel(selectedLog.event_type)} ({selectedLog.event_type})</DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Severidad</DetailLabel>
                    <SeverityBadge $background={getSeverityColor(selectedLog.severity)} style={{ display: 'inline-block' }}>
                      {selectedLog.severity}
                    </SeverityBadge>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Marca de Tiempo</DetailLabel>
                    <DetailValue>{new Date(selectedLog.created_at).toLocaleString('es-ES')}</DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Dirección IP</DetailLabel>
                    <DetailValue>{selectedLog.ip_address || 'No disponible'}</DetailValue>
                  </DetailItem>
                  <DetailItem style={{ gridColumn: 'span 2' }}>
                    <DetailLabel>User Agent</DetailLabel>
                    <DetailValue style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{selectedLog.user_agent || 'No disponible'}</DetailValue>
                  </DetailItem>
                </DetailGrid>
                <div style={{ marginTop: '1.5rem' }}>
                  <DetailLabel>Datos Adicionales y Contexto (JSON)</DetailLabel>
                  <JsonViewer>
                    {formatDetails(selectedLog.details)}
                  </JsonViewer>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button onClick={() => setSelectedLog(null)}>Cerrar</Button>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>,
          document.getElementById('modal-portal-root')!
        )
      }
    </Container>
  );
}

// Styled components consistent with Premium Dark layout
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #ffffff;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
`;

const TitleGroup = styled.div`
  .subtitle {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 6px;
  }
`;

const Subtitle = styled.p``;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 20px;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 200px;
`;

const Label = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Select = styled.select`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 10px 14px;
  border-radius: 10px;
  outline: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: var(--emerald);
  }
  option {
    background: #141414;
    color: white;
  }
`;

const Button = styled.button<{ secondary?: boolean }>`
  background: ${props => props.secondary ? 'rgba(255, 255, 255, 0.05)' : 'var(--emerald)'};
  color: ${props => props.secondary ? '#ffffff' : '#000000'};
  border: 1px solid ${props => props.secondary ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.secondary ? 'rgba(255, 255, 255, 0.1)' : 'rgba(72, 214, 76, 0.85)'};
    transform: translateY(-1px);
  }
`;

const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 24px;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 16px 20px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  
  th {
    background: rgba(255, 255, 255, 0.02);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.05em;
  }
  
  tbody tr {
    transition: background-color 0.2s;
    &:hover {
      background: rgba(255, 255, 255, 0.02);
    }
  }
`;

const EventText = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
`;

const EventCode = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  font-family: monospace;
  margin-top: 2px;
`;

const SeverityBadge = styled.span<{ $background: string }>`
  background: ${props => props.$background};
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
`;

const UserEmail = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
`;

const UserDetail = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.15);
    color: white;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
`;

const PageButton = styled.button`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
  }
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 16px;
  p { font-size: 0.9rem; color: rgba(255, 255, 255, 0.3); font-weight: 600; }
`;

const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 2px solid rgba(72, 214, 76, 0.1);
  border-top-color: var(--emerald);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 24px;
  .icon { font-size: 2.5rem; opacity: 0.2; }
  p { color: rgba(255, 255, 255, 0.3); font-size: 0.95rem; font-weight: 600; }
`;

// Portal Modal elements
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
`;

const ModalContent = styled.div`
  background: #0d0d0d;
  border-radius: 24px;
  width: 650px;
  max-width: 95%;
  color: white;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(255, 255, 255, 0.01);
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
`;

const ModalSubtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  margin-top: -5px;
  
  &:hover {
    color: white;
  }
`;

const ModalBody = styled.div`
  padding: 32px;
  max-height: 60vh;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 0.4rem;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
  }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DetailLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const DetailValue = styled.span`
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
`;

const JsonViewer = styled.pre`
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px;
  border-radius: 12px;
  overflow-x: auto;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  color: #00c7be;
  margin-top: 8px;
`;

const ModalFooter = styled.div`
  padding: 20px 32px;
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex;
  justify-content: flex-end;
  background: rgba(255, 255, 255, 0.01);
`;
