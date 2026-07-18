'use client';

import React from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { ActionButton } from '@/components/Common/UIElements';

export interface SystemRestrictionCardProps {
  title?: string;
  message?: string;
  upgradeKey?: string;
  onBackClick?: () => void;
  showBack?: boolean;
}

const CardContainer = styled.div`
  background: rgba(20, 25, 22, 0.4);
  border: 1px solid rgba(16, 185, 129, 0.12);
  border-radius: 20px;
  padding: 48px 32px;
  max-width: 650px;
  width: 100%;
  text-align: center;
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  margin: 32px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #10b981;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
  z-index: 1;
`;

const CardTitle = styled.h2`
  font-size: 1.35rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
  z-index: 1;
`;

const CardMessage = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  max-width: 480px;
  line-height: 1.6;
  margin: 0 auto 32px auto;
  z-index: 1;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  z-index: 1;
`;

export const SystemRestrictionCard: React.FC<SystemRestrictionCardProps> = ({
  title = 'Plan Premium Requerido: Gestión de Catálogo',
  message = 'Esta funcionalidad requiere activar el plan Empresarial o poseer el rol de Administrador Comercial. Para más detalles, ponte en contacto con la gerencia de tu comercio.',
  upgradeKey = 'estado_empresarial',
  onBackClick,
  showBack = true
}) => {
  const router = useRouter();

  const handleUpgradeClick = () => {
    router.push('/commerce/upgrades');
  };

  return (
    <CardContainer>
      <IconWrapper>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </IconWrapper>
      <CardTitle>{title}</CardTitle>
      <CardMessage>{message}</CardMessage>
      <ButtonGroup>
        {showBack && onBackClick && (
          <ActionButton $variant="outline" onClick={onBackClick}>
            Volver
          </ActionButton>
        )}
        <ActionButton $variant="luminous" onClick={handleUpgradeClick}>
          Adquirir Plan
        </ActionButton>
      </ButtonGroup>
    </CardContainer>
  );
};
