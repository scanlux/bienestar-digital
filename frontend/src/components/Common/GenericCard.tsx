'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ActionButton } from '@/components/Common/UIElements';
import { 
  GenericCardWrapper, CardImageWrapper, StoreImage, 
  CardContent, StoreName, InfoGrid, InfoItem, InfoLabel, InfoValue,
  SedeEstadoBadge, SedeRegresoAlert 
} from './GenericCardStyles';
import { getFullImageUrl, formatTime } from '@/utils';
import { StoreAvailabilityBadge } from './StoreHeroStyles';

interface GenericCardProps {
  store: any;
  isHighlighted?: boolean;
  isQuotaLocked?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
}

export const GenericCard: React.FC<GenericCardProps> = ({
  store,
  isHighlighted = false,
  isQuotaLocked = false,
  onSelect,
  onEdit
}) => {
  const router = useRouter();
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
        {isQuotaLocked && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            zIndex: 10,
            background: '#f59e0b',
            color: 'black',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            🔒 Exceso de Cuota
          </div>
        )}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
          <StoreAvailabilityBadge store={store} />
          {store.estado && (
            <SedeEstadoBadge estado={store.estado}>
              {store.estado}
            </SedeEstadoBadge>
          )}
        </div>
      </CardImageWrapper>
      
      <CardContent>
        <StoreName>{store.nombre_sucursal || `Sede #${store.id}`}</StoreName>
        
        {store.estado !== 'operativo' && store.fecha_regreso && new Date(store.fecha_regreso) <= new Date() && (
          <SedeRegresoAlert onClick={(e) => {
            e.stopPropagation();
            router.push(`/commerce/stores/${store.id}/profile?highlight=fecha_regreso`);
          }}>
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
            <InfoLabel>Administrador:</InfoLabel>
            <InfoValue>
              {store.admin_nombres || store.admin_apellidos
                ? `${store.admin_nombres || ''} ${store.admin_apellidos || ''}`.trim()
                : store.profile_nombres || store.profile_apellidos
                  ? `${store.profile_nombres || ''} ${store.profile_apellidos || ''}`.trim()
                  : store.contacto_directo || 'Sin asignar'}
            </InfoValue>
          </InfoItem>
        </InfoGrid>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
          {onSelect && (
            <ActionButton 
              style={{ flex: 1 }} 
              $variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              Catálogo
            </ActionButton>
          )}
          {onEdit && (
            <ActionButton
              $variant="luminous"
              style={{ flex: 1.2 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Configuración
            </ActionButton>
          )}
        </div>
      </CardContent>
    </GenericCardWrapper>
  );
};

