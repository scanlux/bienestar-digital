import React from 'react';
import styled, { keyframes } from 'styled-components';

export const toastIn = keyframes`
  from { 
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }
  to { 
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
`;

// === UNIFIED CENTERED TOAST SYSTEM ===

const ToastContainer = styled.div<{ $type: 'success' | 'error' }>`
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.$type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)'};
  color: #fff;
  padding: 14px 28px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  box-shadow: 0 10px 30px ${props => props.$type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
  z-index: 15000; /* Incrementado para estar SIEMPRE arriba */
  animation: ${toastIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .icon {
    width: 22px;
    height: 22px;
    background: #fff;
    color: ${props => props.$type === 'success' ? '#10b981' : '#ef4444'};
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 14px;
    font-weight: 900;
    flex-shrink: 0;
  }
`;

interface ToastProps {
  message?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const FloatingSuccessToast: React.FC<ToastProps> = ({ message, onClose, children }) => (
  <ToastContainer $type="success" onClick={onClose}>
    <span className="icon">✓</span>
    {message || children}
  </ToastContainer>
);

export const FloatingErrorToast: React.FC<ToastProps> = ({ message, onClose, children }) => (
  <ToastContainer $type="error" onClick={onClose}>
    <span className="icon">✕</span>
    {message || children}
  </ToastContainer>
);

// Aliases
export const SuccessToast = FloatingSuccessToast;
export const ErrorToast = FloatingErrorToast;
