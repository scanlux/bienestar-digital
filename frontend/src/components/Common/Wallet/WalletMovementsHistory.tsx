import React from 'react';
import styled from 'styled-components';
import { LedgerEntry, WalletOwnerType } from './WalletTypes';
import RecentMovementsList from '../RecentMovementsList';

const TransactionsContainer = styled.div`
  background: rgba(15, 20, 18, 0.85);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
`;

interface WalletMovementsHistoryProps {
  history: LedgerEntry[];
  loadingHistory: boolean;
  ownerType: WalletOwnerType;
  ownerId?: number;
  walletId?: number;
  isCustomerView?: boolean;
  fiatPeg?: number;
}

export function WalletMovementsHistory({
  history,
  loadingHistory,
  ownerType,
  ownerId,
  walletId,
  isCustomerView = false,
  fiatPeg = 400
}: WalletMovementsHistoryProps) {
  return (
    <TransactionsContainer>
      <SectionTitle style={{ marginBottom: '1.25rem' }}>Movimientos Recientes</SectionTitle>
      <RecentMovementsList
        history={history}
        loadingHistory={loadingHistory}
        ownerType={ownerType}
        ownerId={ownerId}
        walletId={walletId}
        isCustomerView={isCustomerView}
        fiatPeg={fiatPeg}
      />
    </TransactionsContainer>
  );
}
export default WalletMovementsHistory;
