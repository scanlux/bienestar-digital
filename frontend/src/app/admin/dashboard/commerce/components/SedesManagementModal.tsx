'use client';
import React from 'react';
import { createPortal } from 'react-dom';
import { 
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, ModalSubtitle, CloseButton 
} from '@/components/Common/ModalStyles';
import styled from 'styled-components';
import { ActionButton, standardCardHighlight } from '@/components/Common/UIElements';
import { SedeEstadoBadge } from '@/components/Common/StoreHeroStyles';
import { getFullImageUrl, formatTime } from '@/utils';

// Styled Components locales para restaurar la vista compacta original
const SedesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    padding: 0 10px;
  }
`;

const SedeCard = styled.div<{ $bgImage?: string; $isHighlighted?: boolean }>`
  position: relative;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background-color: #111;
  background-image: ${p => p.$bgImage ? `url("${p.$bgImage}")` : 'none'};
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  
  .card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%);
    z-index: 1;
    transition: all 0.3s;
  }

  .card-content {
    position: relative;
    z-index: 2;
    padding: 1.25rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: var(--emerald);
    .card-overlay {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0.9) 100%);
    }
  }

  ${props => props.$isHighlighted && standardCardHighlight}
`;

const SedeGhostCard = styled.div`
  height: 200px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.3);
  transition: all 0.2s;

  .icon { font-size: 2rem; }
  .label { font-size: 0.9rem; font-weight: 600; }

  &:hover {
    border-color: var(--emerald);
    background: rgba(16, 185, 129, 0.05);
    color: var(--emerald);
  }
`;

const SedeCardHeader = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  display: flex;
  gap: 8px;
  align-items: center;
`;

const SedeNombre = styled.h4`
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
`;

const SedeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const SedeInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.2;
`;

const SedeInfoIcon = styled.svg`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.4);
`;

const SedeRegresoAlert = styled.div`
  background: #EF4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
`;

const SedeEditBtn = styled(ActionButton).attrs({ $variant: 'luminous' })`
  font-size: 0.75rem;
  padding: 0.4rem 0.8rem;
  width: fit-content;
`;

const SedeEnterBtn = styled.button`
  background: var(--emerald);
  color: #000;
  border: none;
  border-radius: 10px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  width: fit-content;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(72, 214, 76, 0.3);
  }
`;

interface SedesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCommerce: any;
  sedes: any[];
  highlightedSedeId?: number | null;
  modalTarget?: HTMLElement | null;
  getFullImageUrl?: (url: string | null | undefined) => string;
  formatTime?: (time: string | null) => string;
  onEditSede?: (sede: any) => void;
  onNewSede?: () => void;
  onSelectSede: (sedeId: number) => void;
}

export const SedesManagementModal: React.FC<SedesManagementModalProps> = ({
  isOpen,
  onClose,
  selectedCommerce,
  sedes,
  highlightedSedeId,
  modalTarget,
  onEditSede,
  onNewSede,
  onSelectSede
}) => {
  const target = modalTarget || (typeof window !== 'undefined' ? document.getElementById('modal-portal-root') : null);
  if (!isOpen || !selectedCommerce || !target) return null;

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="780px">
        <ModalHeader>
          <div>
            <ModalTitle>Sedes de {selectedCommerce.nombre}</ModalTitle>
            <ModalSubtitle>Selecciona una sede para administrarla</ModalSubtitle>
          </div>
          <CloseButton onClick={onClose}>X</CloseButton>
        </ModalHeader>

        <SedesGrid>
          {sedes.map(sede => (
            <SedeCard 
              key={sede.id} 
              $bgImage={getFullImageUrl(sede.image_url)} 
              $isHighlighted={highlightedSedeId === sede.id}
              onClick={() => onSelectSede(sede.id)}
            >
              <div className="card-overlay" />
              <div className="card-content">
                <SedeCardHeader>
                  {typeof sede.is_currently_open === 'boolean' && (
                    <SedeEstadoBadge estado={sede.is_currently_open ? 'operativo' : 'no_disponible'}>
                      {sede.is_currently_open ? 'Abierto Ahora' : 'Cerrado'}
                    </SedeEstadoBadge>
                  )}
                  <SedeEstadoBadge estado={sede.estado}>
                    {sede.estado}
                  </SedeEstadoBadge>
                </SedeCardHeader>
                <SedeNombre>{sede.nombre_sucursal || `Sede #${sede.id}`}</SedeNombre>
                
                {sede.estado !== 'operativo' && sede.fecha_regreso && new Date(sede.fecha_regreso) <= new Date() && (
                  <SedeRegresoAlert>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    ¡DEBE ABRIR HOY! ({new Date(sede.fecha_regreso).toLocaleDateString()})
                  </SedeRegresoAlert>
                )}

                <SedeInfo>
                  <SedeInfoRow>
                    <SedeInfoIcon viewBox="0 0 24 24">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm5.88 15.54l-1.41 1.41-5.11-5.11V7h2v6.13l4.52 4.41z" fill="currentColor"/>
                    </SedeInfoIcon>
                    <span>
                      {(() => {
                         const currentDay = new Date().getDay();
                         const todaySchedule = sede.schedule?.find((s: any) => s.day_index === currentDay);
                         
                         if (!todaySchedule) return 'Sin horario asignado';
                         if (todaySchedule.status !== 'abierto') return 'Cerrado hoy';
                         if (todaySchedule.is_24h) {
                           const hasMaintenance = todaySchedule.open_time && todaySchedule.close_time && todaySchedule.open_time !== todaySchedule.close_time;
                           return hasMaintenance 
                             ? `24 Horas (Mant: ${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)})`
                             : '24 Horas';
                         }
                         if (todaySchedule.open_time && todaySchedule.close_time) {
                           return `${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)}`;
                         }
                         return 'Sin horario definido';
                      })()}
                    </span>
                  </SedeInfoRow>
                </SedeInfo>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <SedeEnterBtn onClick={(e) => { e.stopPropagation(); onSelectSede(sede.id); }}>
                    Gestionar Sede
                  </SedeEnterBtn>
                  {onEditSede && (
                    <SedeEditBtn onClick={(e) => { e.stopPropagation(); onEditSede(sede); }}>
                      Editar Datos &rarr;
                    </SedeEditBtn>
                  )}
                </div>
              </div>
            </SedeCard>
          ))}
          
          {onNewSede && (
            <SedeGhostCard onClick={onNewSede}>
              <span className="icon">+</span>
              <span className="label">Nueva Sede</span>
            </SedeGhostCard>
          )}
        </SedesGrid>
      </ModalContent>
    </ModalOverlay>,
    target
  );
};
