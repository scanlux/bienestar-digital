import React from 'react';
import styled, { keyframes, css } from 'styled-components';

// --- ANIMACIONES COMUNES ---
export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// --- ESTILOS COMPARTIDOS (MIXINS) ---
export const standardCardHighlight = css`
  border-color: #eab308 !important;
  box-shadow: 0 0 25px rgba(234, 179, 8, 0.4) !important;
  transition: all 0.3s ease;
`;

// --- INDICADORES DE CARGA ---
export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(16, 185, 129, 0.1);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem;
  gap: 1.5rem;
  width: 100%;
  
  p {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.3);
    font-weight: 600;
  }
`;

// --- BOTONES DE ACCION ---
export const ActionButton = styled.button<{ $variant?: 'outline' | 'success-soft' | 'success-solid' | 'success' | 'luminous' }>`
  background: ${p => {
    if (p.$variant === 'success-solid' || p.$variant === 'success') return '#10b981';
    if (p.$variant === 'outline') return 'transparent';
    if (p.$variant === 'success-soft') return 'rgba(72, 214, 76, 0.25)';
    if (p.$variant === 'luminous') return 'rgba(52, 211, 153, 0.15)';
    return 'rgba(72, 214, 76, 0.1)';
  }};
  color: ${p => {
    if (p.$variant === 'success-solid' || p.$variant === 'success') return '#000';
    if (p.$variant === 'outline') return 'rgba(255,255,255,0.6)';
    if (p.$variant === 'luminous') return '#34d399';
    return '#10b981';
  }};
  border: 1px solid ${p => {
    if (p.$variant === 'success-solid' || p.$variant === 'success') return '#10b981';
    if (p.$variant === 'outline') return 'rgba(255,255,255,0.1)';
    if (p.$variant === 'success-soft') return 'rgba(72, 214, 76, 0.4)';
    if (p.$variant === 'luminous') return 'rgba(52, 211, 153, 0.4)';
    return 'rgba(72, 214, 76, 0.2)';
  }};
  padding: ${p => {
    if (p.$variant === 'success') return '0.6rem 2rem';
    if (p.$variant === 'luminous') return '0.70rem 1.25rem';
    return '10px 20px';

  }};
  border-radius: ${p => (p.$variant === 'success' ? '6px' : '10px')};
  font-size: ${p => (p.$variant === 'success' ? '0.9rem' : '0.85rem')};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  backdrop-filter: ${p => p.$variant === 'luminous' ? 'blur(8px)' : 'none'};
  text-shadow: ${p => p.$variant === 'luminous' ? '0 0 10px rgba(52, 211, 153, 0.3)' : 'none'};

  &:hover {
    background: ${p => {
      if (p.$variant === 'success-solid' || p.$variant === 'success') return '#059669';
      if (p.$variant === 'outline') return 'rgba(255,255,255,0.05)';
      if (p.$variant === 'success-soft') return 'rgba(72, 214, 76, 0.35)';
      if (p.$variant === 'luminous') return 'rgba(52, 211, 153, 0.25)';
      return 'rgba(72, 214, 76, 0.2)';
    }};
    border-color: ${p => p.$variant === 'luminous' ? '#34d399' : 'inherit'};
    transform: translateY(-1px);
    box-shadow: ${p => p.$variant === 'luminous' ? '0 0 20px rgba(52, 211, 153, 0.2)' : 'none'};
  }
`;

// --- ESCUDO DE TRANSICION ---
const ShieldWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: ${fadeIn} 0.3s ease-out;

  p {
    margin-top: 1.5rem;
    color: #10b981;
    font-weight: 600;
    font-size: 0.95rem;
  }
`;

interface TransitionShieldProps {
  message?: string;
}

export const TransitionShield: React.FC<TransitionShieldProps> = ({ message = 'Sincronizando...' }) => (
  <ShieldWrapper>
    <Spinner />
    <p>{message}</p>
  </ShieldWrapper>
);
