import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { getAuthHeaders } from '@/utils/auth';
import { API_URL } from '@/constants';
import { LoadingState, Spinner } from '@/components/Common/UIElements';
import { FinancialSummaryMode, FinancialSummaryResponse } from '@/types/financialSummary';
import { KpiSummaryGrid } from './KpiSummaryGrid';
import { FinancialFiltersBar } from './FinancialFiltersBar';
import { StoreStatsSection } from './StoreStatsSection';
import { MovementsPanel } from './MovementsPanel';

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
  width: 100%;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
  width: 100%;
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

const ActionButton = styled.button`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 8px;
  padding: 0.55rem 1.15rem;
  color: #a7f3d0;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.45);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin: 1.5rem 0 0 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  width: 100%;
`;

const WalletWidget = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 10px;
  padding: 0.45rem 1.6rem;
  min-width: 260px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.05);
`;

const WalletIconWrapper = styled.div`
  background: rgba(16, 185, 129, 0.12);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
  flex-shrink: 0;
`;

const WalletTextContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const WalletLabelText = styled.span`
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
  margin-bottom: 2px;
`;

const WalletValueText = styled.span`
  font-size: 0.95rem;
  font-weight: 700;
  color: #10b981;
  line-height: 1.1;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
`;

const WalletValueCopText = styled.span`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
`;

interface FinancialSummaryShellProps {
  mode: FinancialSummaryMode;
}

export const FinancialSummaryShell: React.FC<FinancialSummaryShellProps> = ({ mode }) => {
  const { user, token } = useAuth();
  const router = useRouter();

  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('day');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Consultar estadísticas de la API dependiendo del modo discriminado
  const { data, isLoading, error } = useQuery<FinancialSummaryResponse>({
    queryKey: ['financialSummary', mode, filterType, selectedMonth],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      let endpoint = '';
      
      if (mode.type === 'commerce') {
        endpoint = `${API_URL}/api/manage/commerces/financial-summary`;
      } else if (mode.type === 'store') {
        endpoint = `${API_URL}/api/manage/store/${mode.storeId}/financial-summary`;
      } else if (mode.type === 'delivery') {
        endpoint = `${API_URL}/api/delivery-company/financial-summary`;
      }

      const res = await axios.get(endpoint, {
        params: {
          filterType,
          selectedMonth: filterType === 'month' ? selectedMonth : undefined
        },
        headers,
        signal
      });
      return res.data;
    },
    enabled: !!token
  });

  // Inicializar selección de mes cuando la API retorna opciones
  useEffect(() => {
    if (data?.monthOptions && data.monthOptions.length > 0 && !selectedMonth) {
      setSelectedMonth(data.monthOptions[0]);
    }
  }, [data, selectedMonth]);

  if (isLoading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando resumen financiero...</p>
      </LoadingState>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorMessage>
          Error al cargar los datos del resumen financiero: {(error as any).message || 'Error desconocido'}
        </ErrorMessage>
      </PageContainer>
    );
  }

  const consolidated = data?.consolidated;
  const stores = data?.stores || [];
  const monthOptions = data?.monthOptions || [];
  const fiatPeg = data?.fiatPeg || 400;

  // Ruta dinámica del botón de movimientos según el modo
  const handleNavigateToMovements = () => {
    if (mode.type === 'commerce') {
      router.push('/commerce/movements');
    } else if (mode.type === 'store') {
      router.push(`/commerce/stores/${mode.storeId}/movements`);
    } else if (mode.type === 'delivery') {
      router.push('/delivery-company/movements');
    }
  };

  const isCommerce = mode.type === 'commerce';

  return (
    <PageContainer>
      <FinancialFiltersBar
        filterType={filterType}
        onFilterChange={setFilterType}
        monthOptions={monthOptions}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        rightContent={
          consolidated?.walletBalanceDomi !== undefined ? (
            <WalletWidget>
              <WalletIconWrapper>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </WalletIconWrapper>
              <WalletTextContainer>
                <WalletLabelText>Disponible en Wallet</WalletLabelText>
                <WalletValueText>
                  {new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(consolidated.walletBalanceDomi)} Ð
                  <WalletValueCopText>
                    ({new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(consolidated.walletBalanceCop || (consolidated.walletBalanceDomi * fiatPeg))})
                  </WalletValueCopText>
                </WalletValueText>
              </WalletTextContainer>
            </WalletWidget>
          ) : undefined
        }
      >
        {isCommerce && (
          <ActionButton onClick={handleNavigateToMovements}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Ver Movimientos
          </ActionButton>
        )}
      </FinancialFiltersBar>

      {/* KPI Consolidados */}
      <KpiSummaryGrid stats={consolidated} mode={mode} />

      {/* Grid de sedes (Sólo para Commerce / comercio multisede) */}
      {isCommerce && (
        <StoreStatsSection stores={stores} fiatPeg={fiatPeg} />
      )}

      {/* Panel de Movimientos integrado (Sólo para Sede Individual y Delivery Company) */}
      {!isCommerce && (
        <>
          <SectionTitle>
            Movimientos de {mode.type === 'store' ? 'Sede' : 'Mensajería'}
          </SectionTitle>
          <MovementsPanel
            ownerType={mode.type === 'store' ? 'store' : 'delivery_company'}
            ownerId={mode.type === 'store' ? mode.storeId : mode.deliveryCompanyId}
            token={token}
          />
        </>
      )}
    </PageContainer>
  );
};
