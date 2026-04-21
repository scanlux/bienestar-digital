'use client';

import React from 'react';
import styled from 'styled-components';
import { useModalScroll } from '@/hooks/useModalScroll';
import { 
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, 
  ModalSubtitle, SubmitButton, GeoButton 
} from './ModalStyles';

interface GeoPermissionProps {
  status: 'prompt' | 'denied' | 'default';
  onContinue: () => void;
  onClose: () => void;
}

export default function GeoPermissionModal({ status, onContinue, onClose }: GeoPermissionProps) {
  useModalScroll(true);
  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="450px" style={{ textAlign: 'center', padding: '3rem 2.5rem' }}>
        
        <IconWrapper $isError={status === 'denied'}>
          {status === 'denied' ? (
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path d="M12 2c-4.2 0-8 3.22-8 8.2c0 3.32 2.67 7.25 8 11.8c5.33-4.55 8-8.48 8-11.8C20 5.22 16.2 2 12 2zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2z" fill="currentColor"/>
            </svg>
          )}
        </IconWrapper>

        <ModalTitle style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
          {status === 'denied' ? 'Ubicación Bloqueada' : 'Activar Ubicación'}
        </ModalTitle>
        
        <ModalSubtitle style={{ fontSize: '1rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
          {status === 'denied' ? (
            <>
              Parece que has bloqueado el acceso a la ubicación. <br/>
              Para continuar, haz click en el <strong>icono del candado</strong> en la barra de direcciones y selecciona <strong>"Permitir"</strong>.
            </>
          ) : (
            'Necesitamos acceso a tu ubicación para situar la sede de forma precisa en el mapa y facilitar las entregas.'
          )}
        </ModalSubtitle>

        <ButtonGroup>
          {status !== 'denied' ? (
            <>
              <SubmitButton onClick={onContinue}>
                Entendido, Continuar
              </SubmitButton>
              <SecondaryButton onClick={onClose}>
                Tal vez luego
              </SecondaryButton>
            </>
          ) : (
            <SubmitButton onClick={onClose}>
              Entendido
            </SubmitButton>
          )}
        </ButtonGroup>

      </ModalContent>
    </ModalOverlay>
  );
}

const IconWrapper = styled.div<{ $isError?: boolean }>`
  width: 80px;
  height: 80px;
  background: ${props => props.$isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
  color: ${props => props.$isError ? '#ef4444' : '#10b981'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  
  svg {
    filter: drop-shadow(0 0 8px ${props => props.$isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'});
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SecondaryButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  padding: 0.85rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
`;
