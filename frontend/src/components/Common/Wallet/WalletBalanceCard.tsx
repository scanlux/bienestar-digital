import React from 'react';
import styled from 'styled-components';
import { Spinner } from '../UIElements';

import { CurrencyFormatter } from '../CurrencyFormatter';
import { useAuth } from '@/context/AuthContext';
import {
  BalanceCard,
  CardHeader,
  CardTitle,
  BalanceContainer,
  MainBalanceRow,
  BalanceValue,
  BalanceEquivalent,
  EyeButton
} from './BaseWalletLayout';

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  cursor: help;
  
  .tooltip-text {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    background: rgba(15, 23, 42, 0.95);
    color: rgba(255, 255, 255, 0.95);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid rgba(59, 130, 246, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 100;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    transform: translateY(4px);
    backdrop-filter: blur(8px);
  }

  &:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);
  }

  &::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 4px);
    left: 14px;
    border-width: 4px;
    border-style: solid;
    border-color: rgba(15, 23, 42, 0.95) transparent transparent transparent;
    z-index: 100;
    pointer-events: none;
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover::before {
    visibility: visible;
    opacity: 1;
  }
`;


interface WalletBalanceCardProps {
  title: string;
  balance: number;
  fiatPeg: number;
  loading: boolean;
  hideBalance: boolean;
  toggleHide: () => void;
  score?: number;
  rclAmount?: number;
  onRefresh?: () => void;
  isCustomerView?: boolean;
}

export function WalletBalanceCard({
  title,
  balance,
  fiatPeg,
  loading,
  hideBalance,
  toggleHide,
  score,
  rclAmount,
  onRefresh,
  isCustomerView = false
}: WalletBalanceCardProps) {
  const { user } = useAuth();

  const isAllowedToSeeRcl = !!(
    user && (
      user.rol === 'admin' ||
      user.rol === 'root' ||
      user.rol === 'operator' ||
      user.adminType === 'store' ||
      user.adminType === 'commerce' ||
      user.adminType === 'delivery_company'
    )
  );

  const displayTitle = isCustomerView ? 'Mi Saldo' : title;

  return (
    <BalanceCard>
      <CardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <CardTitle>{displayTitle}</CardTitle>
          {score !== undefined && (
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: score <= 0 ? '#ef4444' : '#10b981'
              }}
            >
              Score: {score} pts
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {onRefresh && (
            <EyeButton onClick={onRefresh} disabled={loading} title="Actualizar Saldo" type="button" style={{ padding: '6px' }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </EyeButton>
          )}
        </div>
      </CardHeader>
      <BalanceContainer>
        <div>
          <MainBalanceRow>
            {loading ? (
              <Spinner style={{ width: '30px', height: '30px', borderTopColor: '#fff' }} />
            ) : (
              <>
                <BalanceValue>
                  {hideBalance ? (
                    isCustomerView ? '$ •••••• COP' : '••••••'
                  ) : (
                    isCustomerView ? (
                      <CurrencyFormatter value={balance * fiatPeg} symbol="COP" prefix="$" decimals={0} />
                    ) : (
                      <CurrencyFormatter value={balance} symbol="Ð" />
                    )
                  )}
                </BalanceValue>
                <EyeButton 
                  onClick={toggleHide} 
                  type="button" 
                  style={{ 
                    padding: '6px', 
                    marginLeft: '8px', 
                    alignSelf: 'center',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {hideBalance ? (
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </EyeButton>
              </>
            )}
          </MainBalanceRow>
          <BalanceEquivalent>
            {hideBalance ? (
              isCustomerView ? '•••• Pts Ð disponibles' : 'Equivalente: $ •••••• COP'
            ) : (
              isCustomerView ? (
                `${balance.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pts Ð disponibles`
              ) : (
                <CurrencyFormatter
                  value={balance * fiatPeg}
                  prefix="Equivalente: $"
                  symbol="COP"
                  decimals={0}
                />
              )
            )}
          </BalanceEquivalent>
        </div>

        {isAllowedToSeeRcl && rclAmount !== undefined && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            <TooltipContainer>
              <span className="tooltip-text">
                Reembolso en Cola de Liquidación
              </span>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255, 255, 255, 0.5)' }}>
                RCL:
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#3b82f6' }}>
                {hideBalance ? '••••••' : <CurrencyFormatter value={rclAmount} symbol="Ð" />}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                ({hideBalance ? '$ ••••••' : <CurrencyFormatter value={rclAmount * fiatPeg} symbol="COP" decimals={0} prefix="$" />})
              </span>
            </TooltipContainer>
          </div>
        )}
      </BalanceContainer>
    </BalanceCard>
  );
}

