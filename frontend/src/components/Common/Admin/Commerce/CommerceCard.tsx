'use client';
import React from 'react';
import { ActionButton } from '@/components/Common/UIElements';
import { 
  CommerceCardWrapper, CardImageWrapper, CommerceImage, Badge, 
  CardContent, CommerceName, InfoGrid, InfoItem, InfoLabel, InfoValue 
} from './CommerceStyles';

interface CommerceCardProps {
  commerce: any;
  isHighlighted: boolean;
  getFullImageUrl: (url: string | null | undefined) => string;
  onEdit: (commerce: any) => void;
  onManageSedes: (commerce: any) => void;
  isLoadingSedes: boolean;
  isSelected: boolean;
}

export const CommerceCard: React.FC<CommerceCardProps> = ({ 
  commerce, 
  isHighlighted, 
  getFullImageUrl, 
  onEdit, 
  onManageSedes, 
  isLoadingSedes,
  isSelected
}) => {
  const displayNit = commerce.nit ? (commerce.nit_dv ? `${commerce.nit}-${commerce.nit_dv}` : commerce.nit) : 'Sin registro';

  return (
    <CommerceCardWrapper 
      id={`commerce-card-${commerce.id}`}
      $isHighlighted={isHighlighted}
    >
      <CardImageWrapper>
        <CommerceImage 
          src={getFullImageUrl(commerce.logo_url) || 'https://via.placeholder.com/300x200?text=Sin+Imagen'} 
          alt={commerce.nombre} 
        />
        <Badge>{commerce.type}</Badge>
      </CardImageWrapper>
      
      <CardContent>
        <CommerceName>{commerce.nombre}</CommerceName>
        
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Ciudad:</InfoLabel>
            <InfoValue>{commerce.ciudad || 'No definida'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>NIT:</InfoLabel>
            <InfoValue>{displayNit}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Dirección:</InfoLabel>
            <InfoValue title={commerce.direccion}>{commerce.direccion || 'No especificada'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Teléfono:</InfoLabel>
            <InfoValue>{commerce.telefono || 'N/A'}</InfoValue>
          </InfoItem>
        </InfoGrid>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <ActionButton 
            style={{ flex: 1 }} 
            $variant="outline" 
            onClick={() => onEdit(commerce)}
          >
            Editar Datos
          </ActionButton>
          <ActionButton
            $variant="luminous"
            style={{ flex: 1.2 }}
            onClick={() => onManageSedes(commerce)}
            disabled={isLoadingSedes && isSelected}
          >
            {isLoadingSedes && isSelected ? 'Cargando...' : 'Gestionar Sedes'}
          </ActionButton>
        </div>
      </CardContent>
    </CommerceCardWrapper>
  );
};
