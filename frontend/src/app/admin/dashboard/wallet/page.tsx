'use client';

import React from 'react';
import styled from 'styled-components';
import { useAuth } from '@/context/AuthContext';
import { WalletPanel } from '@/components/Common/WalletPanel';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  padding: 1.5rem;
  color: #fff;
  min-height: 80vh;
`;

const GlassCard = styled.div`
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.6) 0%, rgba(18, 18, 18, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0;
  background: linear-gradient(90deg, #fff 0%, #aaa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const PageSubtitle = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const AccessDeniedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 4rem 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 0, 0, 0.1);
  border-radius: 12px;
  max-width: 500px;
  margin: 4rem auto;
`;

const DeniedTitle = styled.h2`
  color: #ef4444;
  margin: 0;
  font-size: 1.5rem;
`;

const DeniedText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 0.95rem;
`;

export default function GlobalWalletPage() {
  const { user } = useAuth();

  const hasAccess = user?.permissions && user.permissions.includes('view_ledger');

  if (!hasAccess) {
    return (
      <PageContainer>
        <AccessDeniedContainer>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <DeniedTitle>Acceso Restringido</DeniedTitle>
          <DeniedText>
            No tienes los permisos requeridos para auditar la billetera del sistema. Por favor, contacta al administrador de seguridad si crees que esto es un error.
          </DeniedText>
        </AccessDeniedContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <GlassCard>
        <WalletPanel ownerType="system" />
      </GlassCard>
    </PageContainer>
  );
}
