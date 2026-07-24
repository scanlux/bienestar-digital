import React from 'react';
import styled from 'styled-components';

interface Props {
  logs: any[];
  loading: boolean;
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  total: number;
  limit: number;
  onInspect: (log: any) => void;
}

const EVENT_TYPES = [
  { id: '', label: 'Todos los eventos' },
  { id: 'BOLA_ATTEMPT', label: 'Intento BOLA / IDOR' },
  { id: 'UNAUTHORIZED_ROUTE_ACCESS', label: 'Acceso no autorizado a ruta' },
  { id: 'FAILED_LOGIN_ATTEMPT', label: 'Fallo de inicio de sesión' },
  { id: 'SUCCESSFUL_LOGIN', label: 'Inicio de sesión exitoso' }
];

export const getSeverityColor = (sev: string) => {
  switch (sev) {
    case 'CRITICAL': return 'linear-gradient(135deg, #ff3b30 0%, #ff2d55 100%)';
    case 'HIGH': return 'linear-gradient(135deg, #ff9500 0%, #ff3b30 100%)';
    case 'MEDIUM': return 'linear-gradient(135deg, #ffcc00 0%, #ff9500 100%)';
    case 'LOW': return 'linear-gradient(135deg, #34c759 0%, #00c7be 100%)';
    default: return 'rgba(255, 255, 255, 0.1)';
  }
};

export const getEventLabel = (type: string) => {
  const matched = EVENT_TYPES.find(e => e.id === type);
  return matched ? matched.label : type;
};

export default function SecurityAuditTable({ logs, loading, page, setPage, total, limit, onInspect }: Props) {
  const totalPages = Math.ceil(total / limit) || 1;

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Obteniendo registros de seguridad...</p>
      </LoadingState>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.15 }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p>No se encontraron eventos de seguridad registrados con los filtros actuales.</p>
      </EmptyState>
    );
  }

  return (
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
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
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
                  {log.actor_email || log.actor_id ? (
                    <>
                      <UserEmail>{log.actor_email || 'Sin correo'}</UserEmail>
                      <UserDetail>
                        {log.actor_type?.toUpperCase()} #{log.actor_id}
                        {log.actor_nombre && ` | ${log.actor_nombre}`}
                      </UserDetail>
                    </>
                  ) : (
                    <UserEmail style={{ color: 'rgba(255,255,255,0.3)' }}>ANÓNIMO / SISTEMA</UserEmail>
                  )}
                </td>
                <td>{log.ip_address || 'Sin IP'}</td>
                <td style={{ textAlign: 'center' }}>
                  <ActionButton onClick={() => onInspect(log)}>Inspeccionar</ActionButton>
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
  );
}

const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 24px; overflow: hidden;
`;
const Table = styled.table`
  width: 100%; border-collapse: collapse;
  th, td { padding: 16px 20px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
  th { background: rgba(255, 255, 255, 0.02); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: rgba(255, 255, 255, 0.4); letter-spacing: 0.05em; }
  tbody tr { transition: background-color 0.2s; &:hover { background: rgba(255, 255, 255, 0.02); } }
`;
const EventText = styled.div` font-size: 0.9rem; font-weight: 600; color: white; `;
const EventCode = styled.div` font-size: 0.7rem; color: rgba(255, 255, 255, 0.3); font-family: monospace; margin-top: 2px; `;
const SeverityBadge = styled.span<{ $background: string }>`
  background: ${props => props.$background}; color: white; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.2);
`;
const UserEmail = styled.div` font-size: 0.9rem; font-weight: 600; color: white; `;
const UserDetail = styled.div` font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); margin-top: 2px; `;
const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.75); padding: 6px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.07); border-color: rgba(255, 255, 255, 0.15); color: white; }
`;
const Pagination = styled.div` display: flex; justify-content: space-between; align-items: center; padding: 10px 0; `;
const PageButton = styled.button`
  background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); color: white; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
  &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.05); } &:disabled { opacity: 0.3; cursor: not-allowed; }
`;
const PageInfo = styled.span` font-size: 0.85rem; color: rgba(255, 255, 255, 0.4); font-weight: 500; `;
const LoadingState = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; gap: 16px;
  p { font-size: 0.9rem; color: rgba(255, 255, 255, 0.3); font-weight: 600; }
`;
const Spinner = styled.div`
  width: 32px; height: 32px; border: 2px solid rgba(72, 214, 76, 0.1); border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;
const EmptyState = styled.div`
  text-align: center; padding: 60px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 24px;
  p { color: rgba(255, 255, 255, 0.3); font-size: 0.95rem; font-weight: 600; }
`;
