'use client';
import React from 'react';
import styled from 'styled-components';

const StyledBadge = styled.span<{ estado: string }>`
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  letter-spacing: 0.5px;
  display: inline-block;
  text-align: center;
  min-width: 90px;
  backdrop-filter: blur(10px) brightness(0.6);
  -webkit-backdrop-filter: blur(10px) brightness(0.6);
  background: ${({ estado }) =>
    estado === 'operativo' ? 'rgba(16, 185, 129, 0.25)' :
    estado === 'mantenimiento' ? 'rgba(234, 179, 8, 0.25)' :
    estado === 'vacaciones' ? 'rgba(249, 115, 22, 0.25)' :
    'rgba(239, 68, 68, 0.25)'};
  border: 1px solid ${({ estado }) =>
    estado === 'operativo' ? 'rgba(16, 185, 129, 0.6)' :
    estado === 'mantenimiento' ? 'rgba(234, 179, 8, 0.6)' :
    estado === 'vacaciones' ? 'rgba(249, 115, 22, 0.6)' :
    'rgba(239, 68, 68, 0.6)'};
  color: ${({ estado }) =>
    estado === 'operativo' ? '#00ff80' :
    estado === 'mantenimiento' ? '#fde047' :
    estado === 'vacaciones' ? '#fdba74' :
    '#ff8080'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.55);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.75);
`;

export const SedeEstadoBadge: React.FC<{ estado: string; children?: React.ReactNode }> = ({ estado, children }) => {
  const getLabel = (est: string) => {
    if (children) return children;
    switch (est) {
      case 'operativo':
        return 'Operativo';
      case 'mantenimiento':
        return 'En Mantenimiento';
      case 'vacaciones':
        return 'Vacaciones';
      case 'no_disponible':
        return 'No disponible';
      default:
        return est;
    }
  };

  return <StyledBadge estado={estado}>{getLabel(estado)}</StyledBadge>;
};

export const StoreAvailabilityBadge: React.FC<{ store: any }> = ({ store }) => {
  if (!store || typeof store.is_currently_open !== 'boolean') return null;
  return (
    <SedeEstadoBadge estado={store.is_currently_open ? 'operativo' : 'no_disponible'}>
      {store.is_currently_open ? 'ABIERTO' : 'CERRADO'}
    </SedeEstadoBadge>
  );
};

export const getStatusBorderColor = (estado?: string, fallback = 'rgba(255, 255, 255, 0.05)') => {
  if (estado === 'operativo') return '#10b981';
  if (estado === 'mantenimiento') return '#f97316';
  if (estado === 'vacaciones') return '#eab308';
  if (estado === 'no_disponible') return '#ef4444';
  return fallback;
};

export const getStatusBoxShadow = (estado?: string, fallback = 'none') => {
  if (estado === 'operativo') return '0 0 15px rgba(16, 185, 129, 0.25)';
  if (estado === 'mantenimiento') return '0 0 15px rgba(249, 115, 22, 0.25)';
  if (estado === 'vacaciones') return '0 0 15px rgba(234, 179, 8, 0.25)';
  if (estado === 'no_disponible') return '0 0 15px rgba(239, 68, 68, 0.25)';
  return fallback;
};

export const StoreHeroCard = styled.div<{ $bgImage?: string; $estado?: string }>`
  position: relative;
  width: 100%;
  min-height: 200px;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 20px;
  display: flex;
  background-color: #111;
  background-image: ${p => p.$bgImage ? `url("${p.$bgImage}")` : 'none'};
  background-size: cover;
  background-position: top;
  border: 1px solid ${p => getStatusBorderColor(p.$estado)};
  box-shadow: ${p => getStatusBoxShadow(p.$estado)};
  transition: all 0.3s ease;

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(13, 33, 16, 0.85) 100%);
    z-index: 1;
  }

  .hero-content {
    position: relative;
    z-index: 2;
    padding: 30px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 30px;
  }

  .hero-left {
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;

    .super-title {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      letter-spacing: -0.01em;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
  }

  @media (max-width: 768px) {
    .hero-content { flex-direction: column; align-items: flex-start; }
  }
`;
