import React from 'react';
import styled from 'styled-components';

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>`
  background: ${props => 
    props.$variant === 'primary' ? 'rgba(72, 214, 76, 0.15)' : 
    props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 
    props.$variant === 'ghost' ? 'transparent' : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => 
    props.$variant === 'primary' ? '#48d64c' : 
    props.$variant === 'danger' ? '#ef4444' : '#f1f5f9'};
  border: 1px solid ${props => 
    props.$variant === 'primary' ? 'rgba(72, 214, 76, 0.3)' : 
    props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 
    props.$variant === 'ghost' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 600;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => 
      props.$variant === 'primary' ? 'rgba(72, 214, 76, 0.25)' : 
      props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 
      props.$variant === 'ghost' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)'};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

interface UpgradeActionPanelProps {
  onCreateUpgrade: () => void;
  onGrantUpgrade: () => void;
}

export const UpgradeActionPanel: React.FC<UpgradeActionPanelProps> = ({ onCreateUpgrade, onGrantUpgrade }) => {
  return (
    <HeaderActions>
      <Button onClick={onCreateUpgrade}>
        <PlusIcon /> Crear Mejora
      </Button>
      <Button $variant="primary" onClick={onGrantUpgrade}>
        👥 Otorgar sin Cobro
      </Button>
    </HeaderActions>
  );
};

export default UpgradeActionPanel;
