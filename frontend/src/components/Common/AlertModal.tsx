'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { 
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, SubmitButton 
} from './ModalStyles';

const AlertMessage = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  text-align: center;
`;

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

/**
 * AlertModal: Componente estandarizado para mostrar mensajes rápidos de advertencia
 * o información al usuario con un único botón de confirmación.
 */
export const AlertModal: React.FC<AlertModalProps> = ({ 
  isOpen, 
  onClose, 
  title = 'Atención', 
  message 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay onClick={onClose} style={{ zIndex: 3000 }}>
      <ModalContent 
        onClick={e => e.stopPropagation()} 
        $maxWidth="420px" 
        style={{ 
          padding: '2.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          boxShadow: '0 0 50px rgba(0,0,0,0.6)'
        }}
      >
        <ModalHeader style={{ justifyContent: 'center', marginBottom: '1.5rem', width: '100%' }}>
          <ModalTitle style={{ fontSize: '1.4rem' }}>{title}</ModalTitle>
        </ModalHeader>
        
        <AlertMessage>
          {message}
        </AlertMessage>

        <SubmitButton 
          onClick={onClose} 
          style={{ width: '100%', maxWidth: '200px' }}
        >
          Aceptar
        </SubmitButton>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};
