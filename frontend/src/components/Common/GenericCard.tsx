'use client';
import React from 'react';
import { ActionButton } from '@/components/Common/UIElements';
import { 
  GenericCardWrapper, CardImageWrapper, StoreImage, 
  CardContent, StoreName, InfoGrid, InfoItem, InfoLabel, InfoValue,
  SedeEstadoBadge, SedeRegresoAlert 
} from './GenericCardStyles';
import { getFullImageUrl, formatTime } from '@/utils';

interface GenericCardProps {
  store: any;
  isHighlighted?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
}

export const GenericCard: React.FC<GenericCardProps> = ({
  store,
  isHighlighted = false,
  onSelect,
  onEdit
}) => {
  if (!store) return null;

  // Formatear horario de hoy
  const todayScheduleString = (() => {
    const currentDay = new Date().getDay();
    const todaySchedule = store.schedule?.find((s: any) => s.day_index === currentDay);
    
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
  })();

  const imageSrc = getFullImageUrl(store.image_url) || 'https://via.placeholder.com/300x200?text=Sin+Imagen';

  return (
    <GenericCardWrapper 
      id={`store-card-${store.id}`}
      $isHighlighted={isHighlighted}
    >
      <CardImageWrapper>
        <StoreImage 
          src={imageSrc} 
          alt={store.nombre_sucursal || `Sede #${store.id}`} 
        />
        {store.estado && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
            <SedeEstadoBadge estado={store.estado}>
              {store.estado}
            </SedeEstadoBadge>
          </div>
        )}
      </CardImageWrapper>
      
      <CardContent>
        <StoreName>{store.nombre_sucursal || `Sede #${store.id}`}</StoreName>
        
        {store.estado !== 'operativo' && store.fecha_regreso && new Date(store.fecha_regreso) <= new Date() && (
          <SedeRegresoAlert>
            <span>⚠️</span>
            ¡DEBE ABRIR HOY! ({new Date(store.fecha_regreso).toLocaleDateString()})
          </SedeRegresoAlert>
        )}

        <InfoGrid>
          <InfoItem>
            <InfoLabel>Dirección:</InfoLabel>
            <InfoValue title={store.direccion}>{store.direccion || 'No especificada'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Teléfono:</InfoLabel>
            <InfoValue>{store.telefono || 'N/A'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Horario:</InfoLabel>
            <InfoValue title={todayScheduleString}>{todayScheduleString}</InfoValue>
          </InfoItem>
        </InfoGrid>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
          {onEdit && (
            <ActionButton 
              style={{ flex: 1 }} 
              $variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Editar Datos
            </ActionButton>
          )}
          {onSelect && (
            <ActionButton
              $variant="luminous"
              style={{ flex: 1.2 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              Entrar Sede
            </ActionButton>
          )}
        </div>
      </CardContent>
    </GenericCardWrapper>
  );
};

