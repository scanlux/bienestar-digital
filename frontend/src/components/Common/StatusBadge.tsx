import React from 'react';
import styled from 'styled-components';

export type BadgeStatus = 
  | 'pendiente'
  | 'preparando'
  | 'listo'
  | 'listo_despacho'
  | 'listo_para_envio'
  | 'en_camino'
  | 'entregado'
  | 'cancelado'
  | 'asignado'
  | 'commerce'
  | 'delivery_company'
  | 'operativo'
  | 'mantenimiento';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  children?: React.ReactNode;
  className?: string;
}

const StyledBadge = styled.span<{ $status: string }>`
  font-size: 10px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  white-space: nowrap;

  ${props => {
    switch (props.$status) {
      case 'pendiente':
        return `
          background: rgba(255, 95, 95, 0.08);
          color: #ff5f5f;
          border-color: rgba(255, 95, 95, 0.1);
        `;
      case 'preparando':
        return `
          background: rgba(16, 185, 129, 0.08);
          color: var(--emerald);
          border-color: rgba(16, 185, 129, 0.15);
        `;
      case 'listo':
      case 'listo_para_envio':
        return `
          background: rgba(16, 185, 129, 0.08);
          color: var(--emerald);
          border-color: rgba(16, 185, 129, 0.15);
        `;
      case 'listo_despacho':
        return `
          background: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.15);
        `;
      case 'en_camino':
        return `
          background: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.1);
        `;
      case 'entregado':
        return `
          background: rgba(72, 214, 76, 0.08);
          color: #48d64c;
          border-color: rgba(72, 214, 76, 0.1);
        `;
      case 'cancelado':
        return `
          background: rgba(255, 95, 95, 0.08);
          color: #ff5f5f;
          border-color: rgba(255, 95, 95, 0.1);
        `;
      case 'asignado':
        return `
          background: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.1);
        `;
      case 'commerce':
        return `
          background: rgba(249, 115, 22, 0.1);
          color: #f97316;
          border-color: rgba(249, 115, 22, 0.2);
        `;
      case 'delivery_company':
        return `
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.2);
        `;
      case 'operativo':
        return `
          background: rgba(16, 185, 129, 0.08);
          color: var(--emerald);
          border-color: rgba(16, 185, 129, 0.15);
        `;
      case 'mantenimiento':
        return `
          background: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.1);
        `;
      default:
        return `
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          border-color: rgba(255, 255, 255, 0.1);
        `;
    }
  }}
`;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children, className }) => {
  return (
    <StyledBadge $status={status} className={className}>
      {children || status.replace('_', ' ')}
    </StyledBadge>
  );
};
