import React, { useState } from 'react';
import {
  RequestList, RequestItem, TypeBadge, ActionBtn
} from '../../AdminDashboardStyles';
import { EmptyState } from '@/components/Common/EmptyState';
import { RegistrationRequest } from '../types';
import styled from 'styled-components';

const StatusBadge = styled.span`
  font-size: 9px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &.aprobado {
    background: rgba(72, 214, 76, 0.1);
    color: var(--emerald, #10b981);
    border: 1px solid rgba(72, 214, 76, 0.2);
  }
  
  &.rechazado {
    background: rgba(255, 95, 95, 0.1);
    color: #ff5f5f;
    border: 1px solid rgba(255, 95, 95, 0.2);
  }

  &.espera_informacion {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }
`;

interface RequestsTableProps {
  requests: RegistrationRequest[];
  activeTab: 'pending' | 'processed';
  onViewDetails: (request: RegistrationRequest) => void;
}

export default function RequestsTable({ requests, activeTab, onViewDetails }: RequestsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const paginatedRequests = requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon="✔"
        message={activeTab === 'pending' ? "Todo al día. No hay solicitudes de registro pendientes." : "No hay registro de solicitudes procesadas en el historial."}
      />
    );
  }

  const getCardBorderStyle = (estado?: string) => {
    if (activeTab !== 'pending') return undefined;
    if (estado === 'espera_informacion') {
      return {
        border: '1px solid #3b82f6',
        boxShadow: '0 0 10px rgba(59, 130, 246, 0.15)',
        background: 'rgba(59, 130, 246, 0.01)'
      };
    }
    return {
      border: '1px solid #ef4444',
      boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)',
      background: 'rgba(239, 68, 68, 0.01)'
    };
  };

  return (
    <>
      <RequestList>
        {paginatedRequests.map((req) => (
          <RequestItem 
            key={req.id} 
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px', ...getCardBorderStyle(req.estado) }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div 
                className="b-info"
                style={{ cursor: 'pointer', flex: 1 }}
                onClick={() => onViewDetails(req)}
              >
                <div className="b-logo">
                  {req.tipo_solicitud === 'commerce' ? '🏪' : '🛵'}
                </div>
                <div className="b-text">
                  <div className="b-name-row">
                    <p className="b-name">{req.razon_social}</p>
                    <TypeBadge className={req.tipo_solicitud}>
                      {req.tipo_solicitud === 'commerce' ? 'Comercio' : 'Mensajería'}
                    </TypeBadge>
                    {req.estado && req.estado !== 'pendiente' && (
                      <StatusBadge className={req.estado}>
                        {req.estado === 'aprobado' ? 'Aprobado' : req.estado === 'rechazado' ? 'Rechazado' : 'Espera Info'}
                      </StatusBadge>
                    )}
                  </div>
                  <p className="b-desc">
                    NIT: {req.nit} {req.nit_dv ? ` - ${req.nit_dv}` : ''} | Contacto: {req.nombres_contacto} {req.apellidos_contacto}
                  </p>
                  <p className="b-contact-info">
                    Correo: {req.email_contacto} | Celular: {req.celular_contacto}
                  </p>
                </div>
              </div>
              <div className="b-actions" style={{ marginLeft: '16px' }}>
                 <ActionBtn
                   $variant="approve"
                   style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                   onClick={() => onViewDetails(req)}
                 >
                   {activeTab === 'pending' ? 'Auditar' : 'Detalles'}
                 </ActionBtn>
              </div>
            </div>
          </RequestItem>
        ))}
      </RequestList>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            Anterior
          </button>
          <span style={{ color: '#fff', padding: '8px' }}>Página {currentPage} de {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}
