import React from 'react';
import styled from 'styled-components';
import { ConsolidatedStats, FinancialSummaryMode } from '@/types/financialSummary';

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(16, 185, 129, 0.3);
  }
`;

const StatLabel = styled.span`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 500;
`;

const StatValue = styled.span<{ $color?: string }>`
  font-size: 1.45rem;
  font-weight: 700;
  color: ${props => props.$color || '#fff'};
`;

const SmallCop = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
`;

interface KpiSummaryGridProps {
  stats?: ConsolidatedStats;
  mode: FinancialSummaryMode;
}

export const KpiSummaryGrid: React.FC<KpiSummaryGridProps> = ({ stats, mode }) => {
  const fiatPeg = stats?.fiatPeg || 400;

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDOMI = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(val) + ' DOMI';
  };

  const isDelivery = mode.type === 'delivery';

  // Primer KPI: "Ventas de Productos" o "Ingresos por Entregas"
  const firstKpiLabel = isDelivery ? 'Ingresos por Entregas' : 'Ventas de Productos';
  const firstKpiValue = isDelivery
    ? formatCOP(stats?.totalEarningsCop || 0)
    : formatCOP(stats?.totalSalesCop || 0);

  return (
    <StatsGrid>
      <StatCard>
        <StatLabel>{firstKpiLabel}</StatLabel>
        <StatValue $color="#fff">{firstKpiValue}</StatValue>
      </StatCard>

      {!isDelivery && (
        <StatCard>
          <StatLabel>Costos de Pedidos</StatLabel>
          <StatValue $color="#6ee7b7">{formatDOMI(stats?.totalCommissionsPaidDomi || 0)}</StatValue>
          <SmallCop>{formatCOP((stats?.totalCommissionsPaidDomi || 0) * fiatPeg)}</SmallCop>
        </StatCard>
      )}

      <StatCard>
        <StatLabel>Pedidos Completados</StatLabel>
        <StatValue>{stats?.totalCompletedOrders || 0}</StatValue>
      </StatCard>

      <StatCard>
        <StatLabel>Pedidos Rechazados</StatLabel>
        <StatValue $color="#f87171">{stats?.totalRejectedOrders || 0}</StatValue>
      </StatCard>

      <StatCard>
        <StatLabel>Pedidos Cancelados por Usuarios</StatLabel>
        <StatValue $color="#f87171">{stats?.totalCancelledOrders || 0}</StatValue>
      </StatCard>

      {!isDelivery && (
        <StatCard>
          <StatLabel>Reembolso en Cola de Liquidación</StatLabel>
          <StatValue $color="#3b82f6">{formatDOMI(stats?.totalContingentRefundsDomi || 0)}</StatValue>
          <SmallCop>{formatCOP((stats?.totalContingentRefundsDomi || 0) * fiatPeg)}</SmallCop>
        </StatCard>
      )}
    </StatsGrid>
  );
};
