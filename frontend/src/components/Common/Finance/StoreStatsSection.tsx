import React from 'react';
import styled from 'styled-components';
import { StoreFinancialDetails } from '@/types/financialSummary';

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin: 1.5rem 0 0 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StoresGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1.5rem;
`;

const StoreCard = styled.div`
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.55) 0%, rgba(15, 15, 15, 0.75) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(16, 185, 129, 0.4);
  }
`;

const StoreHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 0.75rem;
`;

const StoreName = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
`;

const StatusBadge = styled.span<{ $status: string }>`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: ${props => {
    switch (props.$status) {
      case 'operativo': return 'rgba(16, 185, 129, 0.15)';
      case 'mantenimiento': return 'rgba(245, 158, 11, 0.15)';
      case 'no_disponible': return 'rgba(239, 68, 68, 0.15)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'operativo': return '#10b981';
      case 'mantenimiento': return '#f59e0b';
      case 'no_disponible': return '#ef4444';
      default: return '#fff';
    }
  }};
`;

const StoreWallet = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const WalletItem = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const WalletLabel = styled.span<{ $blue?: boolean }>`
  font-size: 0.78rem;
  color: ${props => props.$blue ? 'rgba(96, 165, 250, 0.8)' : 'rgba(52, 211, 153, 0.8)'};
  font-weight: 500;
`;

const WalletBalance = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const BalanceDomi = styled.span<{ $blue?: boolean }>`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${props => props.$blue ? '#60a5fa' : '#34d399'};
`;

const BalanceCop = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
`;

const WalletDivider = styled.div`
  width: 1px;
  align-self: stretch;
  background: rgba(255, 255, 255, 0.08);
`;

const StatsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 0.6rem 0.5rem;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  &:last-child {
    border-bottom: none;
  }
`;

const TableCellLabel = styled.td`
  padding: 0.75rem 0.5rem;
  font-size: 0.85rem;
  color: #fff;
  font-weight: 600;
`;

const TableCellValue = styled.td`
  padding: 0.75rem 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  text-align: right;
`;

interface StoreStatsSectionProps {
  stores: StoreFinancialDetails[];
  fiatPeg: number;
}

export const StoreStatsSection: React.FC<StoreStatsSectionProps> = ({ stores, fiatPeg }) => {
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

  return (
    <>
      <SectionTitle>Estadísticas por Sede</SectionTitle>

      {stores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255, 255, 255, 0.4)' }}>
          No se encontraron sedes registradas para este comercio.
        </div>
      ) : (
        <StoresGrid>
          {stores.map((store) => (
            <StoreCard key={store.storeId}>
              <StoreHeader>
                <StoreName>{store.nombreSucursal}</StoreName>
                <StatusBadge $status={store.estado}>
                  {store.estado === 'operativo' ? 'Abierto' :
                   store.estado === 'mantenimiento' ? 'Mantenimiento' :
                   store.estado === 'no_disponible' ? 'Cerrado' :
                   (store.estado as string).charAt(0).toUpperCase() + (store.estado as string).slice(1).replace('_', ' ')}
                </StatusBadge>
              </StoreHeader>

              <StoreWallet>
                <WalletItem>
                  <WalletLabel>Disponible en Wallet</WalletLabel>
                  <WalletBalance>
                    <BalanceDomi>{formatDOMI(store.balanceCustodyDomi)}</BalanceDomi>
                    <BalanceCop>{formatCOP(store.balanceCustodyCop)}</BalanceCop>
                  </WalletBalance>
                </WalletItem>
                <WalletDivider />
                <WalletItem>
                  <WalletLabel $blue>Reembolso en Cola</WalletLabel>
                  <WalletBalance>
                    <BalanceDomi $blue>{formatDOMI(store.contingentRefundsDomi || 0)}</BalanceDomi>
                    <BalanceCop>{formatCOP(store.contingentRefundsCop || 0)}</BalanceCop>
                  </WalletBalance>
                </WalletItem>
              </StoreWallet>

              <StatsTable>
                <thead>
                  <tr>
                    <TableHeader>Campo</TableHeader>
                    <TableHeader style={{ textAlign: 'right' }}>Valor</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  <TableRow>
                    <TableCellLabel>Ventas de Productos</TableCellLabel>
                    <TableCellValue>{formatCOP(store.stats.totalSalesCop)}</TableCellValue>
                  </TableRow>
                  <TableRow>
                    <TableCellLabel>Pedidos Entregados</TableCellLabel>
                    <TableCellValue>{store.stats.completedOrdersCount}</TableCellValue>
                  </TableRow>
                  <TableRow>
                    <TableCellLabel>Pedidos Rechazados</TableCellLabel>
                    <TableCellValue style={{ color: '#f87171' }}>{store.stats.rejectedOrdersCount}</TableCellValue>
                  </TableRow>
                  <TableRow>
                    <TableCellLabel>Cancelados por Usuarios</TableCellLabel>
                    <TableCellValue style={{ color: '#f87171' }}>{store.stats.cancelledOrdersCount}</TableCellValue>
                  </TableRow>
                  <TableRow>
                    <TableCellLabel>Costos de Pedidos</TableCellLabel>
                    <TableCellValue>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: '#6ee7b7', fontWeight: '600' }}>{formatDOMI(store.stats.commissionsPaidDomi)}</span>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {formatCOP(store.stats.commissionsPaidDomi * fiatPeg)}
                        </span>
                      </div>
                    </TableCellValue>
                  </TableRow>
                </tbody>
              </StatsTable>
            </StoreCard>
          ))}
        </StoresGrid>
      )}
    </>
  );
};
