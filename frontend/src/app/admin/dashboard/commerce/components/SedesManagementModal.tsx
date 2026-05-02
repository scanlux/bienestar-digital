'use client';
import React from 'react';
import { createPortal } from 'react-dom';
import { 
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, ModalSubtitle, CloseButton 
} from '@/components/Common/ModalStyles';
import { 
  SedesGrid, SedeCard, SedeCardHeader, SedeEstadoBadge, SedeNombre, 
  SedeInfo, SedeInfoRow, SedeInfoIcon, SedeEditBtn, SedeGhostCard 
} from './CommerceStyles';

interface SedesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCommerce: any;
  sedes: any[];
  highlightedSedeId?: number | null;
  modalTarget: HTMLElement | null;
  getFullImageUrl: (url: string | null | undefined) => string;
  formatTime: (time: string | null) => string;
  onEditSede: (sede: any) => void;
  onNewSede: () => void;
  onSelectSede: (sedeId: number) => void;
}

export const SedesManagementModal: React.FC<SedesManagementModalProps> = ({
  isOpen,
  onClose,
  selectedCommerce,
  sedes,
  highlightedSedeId,
  modalTarget,
  getFullImageUrl,
  formatTime,
  onEditSede,
  onNewSede,
  onSelectSede
}) => {
  if (!isOpen || !selectedCommerce || !modalTarget) return null;

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="780px">
        <ModalHeader>
          <div>
            <ModalTitle>Sedes de {selectedCommerce.nombre}</ModalTitle>
            <ModalSubtitle>Selecciona una sede para administrarla</ModalSubtitle>
          </div>
          <CloseButton onClick={onClose}>✕</CloseButton>
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
                <SedeCardHeader style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                <SedeEditBtn onClick={(e) => { e.stopPropagation(); onEditSede(sede); }}>
                  Editar Datos &rarr;
                </SedeEditBtn>
              </div>
            </SedeCard>
          ))}
          
          <SedeGhostCard onClick={onNewSede}>
            <span className="icon">+</span>
            <span className="label">Nueva Sede</span>
          </SedeGhostCard>
        </SedesGrid>
      </ModalContent>
    </ModalOverlay>,
    modalTarget
  );
};
