import React, { useState } from 'react';
import styled from 'styled-components';
import { Spinner } from '@/components/Common/UIElements';

const TransactionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TransactionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #181818;
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  transition: background-color 0.2s;

  &:hover {
    background: #1c1c1c;
  }
`;

const TxInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
`;

const TxIcon = styled.div<{ $isIncome: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: ${p => p.$isIncome ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'};
  color: ${p => p.$isIncome ? '#10b981' : '#ef4444'};
  flex-shrink: 0;
`;

const TxDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 70%;
  min-width: 0;
`;

const TxTitle = styled.span`
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
`;

const TxNotes = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TxMeta = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const StoreBadge = styled.span`
  background: rgba(16, 185, 129, 0.1);
  color: #a7f3d0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
`;

const TxValueContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
`;

const TxAmount = styled.span<{ $isIncome: boolean }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${p => p.$isIncome ? '#10b981' : '#ef4444'};
`;

const TxEquivalent = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
`;

const ViewHistoryButton = styled.button`
  background: none;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.75rem;
  width: 100%;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1.25rem;

  &:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

export interface Transaction {
  id: number;
  tx_hash: string;
  tx_type: string;
  from_wallet_id: number | null;
  to_wallet_id: number | null;
  from_owner_type?: string | null;
  from_owner_id?: number | string | null;
  to_owner_type?: string | null;
  to_owner_id?: number | string | null;
  amount_domis: string;
  amount_fiat_cop: string;
  notes: string;
  created_at: string;
  from_store_name?: string;
  to_store_name?: string;
}

interface RecentMovementsListProps {
  history: Transaction[];
  loadingHistory: boolean;
  ownerType: string;
  ownerId?: number | string;
  walletId?: number;
  showAll?: boolean;
  showStoreNames?: boolean;
  isCustomerView?: boolean;
  fiatPeg?: number;
}

export default function RecentMovementsList({
  history,
  loadingHistory,
  ownerType,
  ownerId,
  walletId,
  showAll = false,
  showStoreNames = false,
  isCustomerView = false,
  fiatPeg = 400
}: RecentMovementsListProps) {
  const [visibleCount, setVisibleCount] = useState(10);

  if (loadingHistory) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Spinner style={{ width: '30px', height: '30px', borderTopColor: '#10b981' }} />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.9rem', margin: '3rem 0' }}>
        No hay movimientos registrados.
      </p>
    );
  }

  const itemsToShow = showAll ? history : history.slice(0, visibleCount);

  return (
    <TransactionsList>
      {itemsToShow.map(tx => {
        const isIncome = walletId
          ? tx.to_wallet_id === walletId
          : ownerId
          ? ((tx.to_owner_type === ownerType && String(tx.to_owner_id) === String(ownerId)) || 
             (ownerType === 'system' && tx.tx_type === 'burn_service'))
          : (tx.to_owner_type === 'store' || tx.tx_type === 'mint' || tx.tx_type === 'refund');
        
        const date = new Date(tx.created_at).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Determinar si hay un nombre de sede a mostrar
        let storeDisplayName = '';
        if (showStoreNames) {
          if (tx.from_store_name && tx.to_store_name) {
            storeDisplayName = `${tx.from_store_name} ➔ ${tx.to_store_name}`;
          } else if (tx.from_store_name) {
            storeDisplayName = tx.from_store_name;
          } else if (tx.to_store_name) {
            storeDisplayName = tx.to_store_name;
          }
        }

        const amtDomisNumeric = parseFloat(tx.amount_domis);
        const amtCopNumeric = parseFloat(tx.amount_fiat_cop) || (amtDomisNumeric * fiatPeg);

        return (
          <TransactionRow key={tx.id}>
            <TxInfo>
              <TxIcon $isIncome={isIncome}>
                {isIncome ? (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 5L5 19m0 0h11m-11 0V8" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 19L19 5m0 0H8m11 0v11" />
                  </svg>
                )}
              </TxIcon>
              <TxDetails>
                <TxTitle>
                  {tx.tx_type === 'mint' && 'Recarga de Saldo'}
                  {tx.tx_type === 'transfer' && (isIncome ? 'Transferencia Recibida' : 'Transferencia Enviada')}
                  {tx.tx_type === 'burn_service' && 'Pago de Plan / Servicio'}
                  {tx.tx_type === 'refund' && 'Reembolso'}
                  {tx.tx_type === 'rescue_cashback' && 'Cashback por Rescate'}
                </TxTitle>
                <TxNotes title={tx.notes}>{tx.notes || 'Operación general'}</TxNotes>
                <TxMeta>
                  <span>{date}</span>
                  <span>|</span>
                  <span>Hash: {tx.tx_hash.substring(0, 10)}...</span>
                  {storeDisplayName && (
                    <>
                      <span>|</span>
                      <StoreBadge>{storeDisplayName}</StoreBadge>
                    </>
                  )}
                </TxMeta>
              </TxDetails>
            </TxInfo>
            <TxValueContainer>
              <TxAmount $isIncome={isIncome}>
                {isCustomerView ? (
                  `${isIncome ? '+' : '-'} $ ${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amtCopNumeric)} COP`
                ) : (
                  `${isIncome ? '+' : '-'} ${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amtDomisNumeric)} Ð`
                )}
              </TxAmount>
              <TxEquivalent>
                {isCustomerView ? (
                  `${isIncome ? '+' : '-'} ${amtDomisNumeric.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pts Ð`
                ) : (
                  `$ ${new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amtCopNumeric)} COP`
                )}
              </TxEquivalent>
            </TxValueContainer>
          </TransactionRow>
        );
      })}

      {!showAll && history.length > visibleCount && (
        <ViewHistoryButton onClick={() => setVisibleCount(prev => prev + 10)}>
          Ver más movimientos ({history.length - visibleCount} restantes)
        </ViewHistoryButton>
      )}
      {!showAll && visibleCount > 10 && (
        <ViewHistoryButton 
          onClick={() => setVisibleCount(10)} 
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}
        >
          Colapsar historial
        </ViewHistoryButton>
      )}
    </TransactionsList>
  );
}
