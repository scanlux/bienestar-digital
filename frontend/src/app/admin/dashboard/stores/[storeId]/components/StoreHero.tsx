'use client';

import React from 'react';
import { ActionButton } from '@/components/Common/UIElements';
import { StoreHeroCard, SedeEstadoBadge } from './StoreDetailStyles';
import { StoreInfoCard } from '@/components/Common/StoreInfoCard';

interface StoreHeroProps {
  storeData: any;
  getFullImageUrl: (url: string | null | undefined) => string;
  formatTime: (time: string | null) => string;
  onEdit: () => void;
}

export const StoreHero: React.FC<StoreHeroProps> = ({ 
  storeData, 
  getFullImageUrl, 
  formatTime, 
  onEdit 
}) => {
  if (!storeData) return null;

  return (
    <StoreHeroCard $bgImage={getFullImageUrl(storeData?.image_url)}>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="hero-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
            <h1 className="super-title" style={{ marginBottom: 0 }}>
              {storeData.commerce_nombre} - {storeData.nombre_sucursal}
            </h1>
            <SedeEstadoBadge estado={storeData.estado}>
              {storeData.estado}
            </SedeEstadoBadge>
          </div>
          <div className="header-buttons">
            <ActionButton $variant="success-solid" onClick={onEdit}>
              Editar Sede
            </ActionButton>
          </div>
        </div>

        <StoreInfoCard 
          storeData={storeData} 
          formatTime={formatTime} 
        />
      </div>
    </StoreHeroCard>
  );
};
