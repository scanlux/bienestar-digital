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
  margin-bottom: 2rem;
  text-align: center;
  white-space: pre-line;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  width: 100%;
  justify-content: center;
`;

const SecondaryButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  padding: 0.85rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  flex: 1;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const PrimaryButton = styled(SubmitButton)`
  flex: 1;
  margin-top: 0;
`;

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * AlertModal: Componente inteligente para mostrar mensajes de advertencia (Alert)
 * o diálogos de confirmación (Confirm).
 * 
 * Si se proporciona 'onCancel', el modal mostrará automáticamente dos botones.
 */
export const AlertModal: React.FC<AlertModalProps> = ({ 
  isOpen, 
  onClose,
  onConfirm,
  onCancel,
  title = 'Atención', 
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const isConfirm = !!onCancel;

  return createPortal(
    <ModalOverlay onClick={onCancel || onClose} style={{ zIndex: 3000 }}>
      <ModalContent 
        onClick={e => e.stopPropagation()} 
        $maxWidth="450px" 
        style={{ 
          padding: '2.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          boxShadow: '0 0 60px rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <ModalHeader style={{ justifyContent: 'center', marginBottom: '1.5rem', width: '100%' }}>
          <ModalTitle style={{ fontSize: '1.4rem', textAlign: 'center' }}>{title}</ModalTitle>
        </ModalHeader>
        
        <AlertMessage>
          {message}
        </AlertMessage>

        <ButtonGroup>
          {isConfirm && (
            <SecondaryButton onClick={onCancel}>
              {cancelText}
            </SecondaryButton>
          )}
          <PrimaryButton onClick={onConfirm ? handleConfirm : onClose}>
            {confirmText}
          </PrimaryButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};
