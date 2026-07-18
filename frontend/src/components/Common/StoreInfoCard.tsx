'use client';

import React from 'react';
import styled from 'styled-components';
import { CapacityProgressBar } from '@/components/Common/CapacityProgressBar';

interface StoreInfoCardProps {
  storeData: any;
  formatTime: (time: string | null) => string;
  menusCount: number;
  categoriesCount: number;
  maxProductsInSingleCategory: number;
}

export const StoreInfoCard: React.FC<StoreInfoCardProps> = ({ 
  storeData, 
  menusCount,
  categoriesCount,
  maxProductsInSingleCategory
}) => {
  if (!storeData) return null;

  const isBusiness = !!storeData.has_business_status;

  // Límites máximos
  const menusLimit = isBusiness ? null : (storeData.limits?.menus ?? 1);
  const categoriesLimit = isBusiness ? null : (storeData.limits?.categories ?? 3);
  const productsLimit = isBusiness ? null : (storeData.limits?.products ?? 3);

  return (
    <InfoContainer>
      <div className="info-header">
        <span className="info-label">Plan de Sede</span>
        <span className="plan-badge" style={{ 
          background: isBusiness ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: isBusiness ? '#10b981' : '#f59e0b',
          border: `1px solid ${isBusiness ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
        }}>
          {isBusiness ? 'Empresarial' : 'Estándar (Free)'}
        </span>
      </div>

      <div className="divider" />

      <CapacityProgressBar 
        label="Menús Creados" 
        used={menusCount} 
        max={menusLimit} 
      />

      <CapacityProgressBar 
        label="Categorías por Menú" 
        used={categoriesCount} 
        max={categoriesLimit} 
      />

      <CapacityProgressBar 
        label="Productos por Categoría" 
        used={maxProductsInSingleCategory} 
        max={productsLimit} 
      />

      <div className="divider" />

      <div className="info-footer">
        <span className="info-label">Estado Sede</span>
        <span className="status-value" style={{ 
          color: storeData.estado === 'operativo' || storeData.estado === 'abierto' ? '#10b981' : '#ef4444' 
        }}>
          {storeData.estado?.replace('_', ' ') || 'No disponible'}
        </span>
      </div>
    </InfoContainer>
  );
};

const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: rgba(10, 15, 12, 0.85);
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  min-width: 330px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  .info-header, .info-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .plan-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-value {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    width: 100%;
  }
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ProgressBarLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 700;
`;

const LifeBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const LifeBarFill = styled.div<{ $percent: number; $isLimit: boolean; $isUnlimited?: boolean }>`
  width: ${p => p.$percent}%;
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${p => {
    if (p.$isUnlimited) {
      return 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)';
    }
    if (p.$isLimit) {
      return 'linear-gradient(90deg, #ef4444 0%, #ef4444 100%)';
    }
    return 'linear-gradient(90deg, #10b981 0%, #10b981 100%)';
  }};
  box-shadow: ${p => p.$isUnlimited ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'};
`;
