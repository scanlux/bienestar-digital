'use client';

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MovementsPanel } from '@/components/Common/Finance/MovementsPanel';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: ${fadeIn} 0.3s ease;
  color: #fff;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Title = styled.h1`
  font-size: 1.85rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #fff 0%, #a7f3d0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.95rem;
  margin: 0;
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.15);
  }
`;

export default function DeliveryMovementsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const deliveryCompanyId = user?.deliveryCompanyId || 0;

  return (
    <PageContainer>
      <HeaderSection>
        <HeaderTitleGroup>
          <Title>Movimientos de Delivery</Title>
          <Subtitle>Historial de transacciones, liquidaciones y cobros de comisiones de reparto.</Subtitle>
        </HeaderTitleGroup>
        <BackButton onClick={() => router.push('/delivery-company/financial-summary')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Resumen
        </BackButton>
      </HeaderSection>

      <MovementsPanel
        ownerType="delivery_company"
        ownerId={deliveryCompanyId}
        token={token}
      />
    </PageContainer>
  );
}
