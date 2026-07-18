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

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #fff 0%, #aaa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const GlassCard = styled.div`
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.6) 0%, rgba(18, 18, 18, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2.25rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
`;

export default function DeliveryCompanyWalletPage() {
  const { user } = useAuth();
  const companyId = user?.deliveryCompanyId || (user as any)?.delivery_company_id;

  return (
    <PageContainer>
      <GlassCard>
        {companyId ? (
          <WalletPanel ownerType="delivery_company" ownerId={companyId} />
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            Cargando identificador de la empresa de reparto...
          </div>
        )}
      </GlassCard>
    </PageContainer>
  );
}
