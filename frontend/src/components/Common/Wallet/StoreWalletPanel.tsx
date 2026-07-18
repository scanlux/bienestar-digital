import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { useWallet } from '@/hooks/useWallet';
import { WompiCheckoutModal } from './WompiCheckoutModal';
import { TransferModal } from './TransferModal';
import { SystemRestrictionWrapper } from '../SystemRestrictionWrapper';
import { WalletAliasModal } from '../WalletAliasModal';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton
} from '../ModalStyles';
import {
  Container,
  TopCardsGrid,
  QuickActionsGrid,
  ActionButton,
  FormGroup,
  Label,
  Input,
  SubmitButton,
  fadeIn
} from './BaseWalletLayout';
import { WalletBalanceCard } from './WalletBalanceCard';
import { WalletAliasCard } from './WalletAliasCard';
import { WalletMovementsHistory } from './WalletMovementsHistory';
import { WalletPanelProps, WalletData, LedgerEntry } from './WalletTypes';

export function StoreWalletPanel({ ownerType, ownerId, readOnly = false }: WalletPanelProps) {
  const router = useRouter();
  const { token, user: loggedUser } = useAuth();
  const toast = useToast();
  const { showAlert, showConfirm } = useAlert();

  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);

  const getOwnerLabel = () => {
    if (ownerType === 'delivery_company') return 'empresa de reparto';
    if (ownerType === 'commerce') return 'comercio';
    return 'sede';
  };

  const getOwnerLabelCap = () => {
    if (ownerType === 'delivery_company') return 'Empresa de Reparto';
    if (ownerType === 'commerce') return 'Comercio';
    return 'Sede';
  };

  // Permisos basados en RBAC
  const permissions = loggedUser?.permissions || [];
  const canTransfer = permissions.includes('transfer_domis');
  const canPaySubscriptions = permissions.includes('pay_subscriptions_domis');
  const canPurchase = permissions.includes('checkout_domis');

  // Core Data & Actions from Custom Hook
  const {
    balance,
    fiatPeg,
    walletData,
    history,
    aliases,
    loading,
    loadingHistory,
    loadingAliases,
    processingTransfer,
    processingWompi,
    hideBalance,
    wompiCommissionPercent,
    wompiCommissionFixedCop,
    wompiCommissionIvaPercent,
    wompiMinPurchaseCop,
    toggleHide,
    loadBalance,
    loadHistory,
    fetchAliases,
    transfer,
    initWompiCheckout,
    payDebt
  } = useWallet(ownerType, ownerId);

  // Active form view
  const [activeForm, setActiveForm] = useState<'transfer' | 'buy' | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleForm = (formType: 'transfer' | 'buy') => {
    if (formType === 'transfer' && !canTransfer) {
      toast.error('No tienes permisos para realizar transferencias.');
      return;
    }
    if (formType === 'buy' && !canPurchase) {
      toast.error('No tienes permisos para comprar DOMIs.');
      return;
    }
    setActiveForm(prev => (prev === formType ? null : formType));
  };

  const handlePayStoreDebt = async (debtId: number, amount: number) => {
    if (balance < amount) {
      showAlert({
        title: 'Saldo Insuficiente',
        message: `El/la ${getOwnerLabel()} no tiene suficientes DOMIs para liquidar esta deuda de compensación. Necesitas ${amount} DOMI, y el saldo actual de la ${getOwnerLabel()} es de ${balance} DOMI. Por favor, realiza una recarga primero.`,
        confirmText: 'Aceptar'
      });
      return;
    }

    showConfirm({
      title: `Liquidar Compensación de ${getOwnerLabelCap()}`,
      message: `¿Estás seguro de pagar ${amount} DOMI para liquidar esta compensación automática de la ${getOwnerLabel()}? El saldo se descontará de su monedero de custodia.`,
      confirmText: 'Pagar Compensación',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        await payDebt(debtId);
      }
    });
  };

  const rclAmount = walletData?.contingent_refunds?.reduce(
    (sum: number, r: any) => sum + parseFloat(r.amount_domis || 0),
    0
  ) || 0;

  return (
    <Container>
      <TopCardsGrid>
        <WalletBalanceCard
          title={`Billetera de Custodia DOMI (${ownerType.toUpperCase()})`}
          balance={balance}
          fiatPeg={fiatPeg}
          loading={loading}
          hideBalance={hideBalance}
          toggleHide={toggleHide}
          rclAmount={rclAmount}
          onRefresh={loadBalance}
        />
        <WalletAliasCard
          loadingAliases={loadingAliases}
          aliases={aliases}
          readOnly={readOnly}
          openAliasModal={() => setIsAliasModalOpen(true)}
        />
      </TopCardsGrid>

      {/* COMPENSACIÓN AUTOMÁTICA ACTIVA */}
      {walletData?.pending_debts && walletData.pending_debts.length > 0 && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            animation: `${fadeIn} 0.3s ease`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f87171' }}>
                  Compensación Automática Activa
                </h4>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}
                >
                  Debes liquidar las deudas y compensaciones pendientes de la {getOwnerLabel()}.
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#f87171',
                  fontFamily: 'monospace'
                }}
              >
                {parseFloat(
                  walletData.pending_debts
                    .reduce((sum: number, d: any) => sum + parseFloat(d.amount_domis), 0)
                    .toString()
                ).toFixed(2)}{' '}
                DOMI
              </span>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                Equivalente: ~ ${' '}
                {(
                  walletData.pending_debts.reduce(
                    (sum: number, d: any) => sum + parseFloat(d.amount_domis),
                    0
                  ) * fiatPeg
                ).toLocaleString('es-CO')}{' '}
                COP
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {walletData.pending_debts.map((debt: any) => (
              <div
                key={debt.id}
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                    Compensación de Pedido #{debt.order_id}
                  </span>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.4)'
                    }}
                  >
                    Beneficiario:{' '}
                    {debt.beneficiary_type === 'store'
                      ? 'Sede / Tienda'
                      : debt.beneficiary_type === 'system'
                        ? 'Sistema / Plataforma'
                        : 'Repartidor'}{' '}
                    | Fecha: {new Date(debt.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handlePayStoreDebt(debt.id, parseFloat(debt.amount_domis))}
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  type="button"
                >
                  Liquidar Cargo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REEMBOLSOS EN COLA DE LIQUIDACIÓN */}
      {walletData?.contingent_refunds && walletData.contingent_refunds.length > 0 && (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: `${fadeIn} 0.3s ease`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🏪</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#60a5fa' }}>
                Reembolso en Cola de Liquidación (RCL)
              </h4>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.85rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}
              >
                Saldo compensatorio a favor de la tienda por cancelaciones de clientes. Se
                acreditará a tu monedero una vez que el deudor liquide su cargo.
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#60a5fa',
                fontFamily: 'monospace'
              }}
            >
              {parseFloat(
                walletData.contingent_refunds
                  .reduce(
                    (sum: number, r: any) =>
                      sum +
                      parseFloat(r.amount_domis) -
                      parseFloat(r.refunded_service_fee_domis || 0),
                    0
                  )
                  .toString()
                ).toFixed(2)}{' '}
              DOMI
            </span>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              Equivalente: ~ ${' '}
              {(
                walletData.contingent_refunds.reduce(
                  (sum: number, r: any) =>
                    sum +
                    parseFloat(r.amount_domis) -
                    parseFloat(r.refunded_service_fee_domis || 0),
                  0
                ) * fiatPeg
              ).toLocaleString('es-CO')}{' '}
              COP
            </div>
          </div>
        </div>
      )}

      {/* FILA DE ACCESOS RÁPIDOS */}
      <QuickActionsGrid>
        <SystemRestrictionWrapper permission="checkout_domis">
          {!readOnly && (
            <ActionButton onClick={() => toggleForm('buy')} type="button">
              <svg
                className="icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>Comprar DOMIs</span>
            </ActionButton>
          )}
        </SystemRestrictionWrapper>

        <SystemRestrictionWrapper permission="transfer_domis">
          {!readOnly && (
            <ActionButton onClick={() => toggleForm('transfer')} type="button">
              <svg
                className="icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <span>Transferir</span>
            </ActionButton>
          )}
        </SystemRestrictionWrapper>

        <SystemRestrictionWrapper permission="pay_subscriptions_domis">
          {!readOnly && (
            <ActionButton onClick={() => router.push('/commerce/upgrades')} type="button">
              <svg
                className="icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <span>Suscripciones</span>
            </ActionButton>
          )}
        </SystemRestrictionWrapper>

        {!readOnly && (
          <ActionButton onClick={() => setIsAliasModalOpen(true)} type="button">
            <svg
              className="icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
              />
            </svg>
            <span>Alias Bre-b</span>
          </ActionButton>
        )}
      </QuickActionsGrid>

      {/* PORTALES PARA MODALES (COMPRA DE DOMIS & TRANSFERENCIA) */}
      {activeForm === 'buy' && canPurchase && mounted && typeof window !== 'undefined' && createPortal(
        <WompiCheckoutModal
          onClose={() => setActiveForm(null)}
          fiatPeg={fiatPeg}
          wompiCommissionPercent={wompiCommissionPercent}
          wompiCommissionFixedCop={wompiCommissionFixedCop}
          wompiCommissionIvaPercent={wompiCommissionIvaPercent}
          wompiMinPurchaseCop={wompiMinPurchaseCop}
          onConfirmCheckout={initWompiCheckout}
          processing={processingWompi}
          ownerLabel={getOwnerLabelCap()}
        />,
        document.getElementById('modal-portal-root') || document.body
      )}

      {activeForm === 'transfer' && canTransfer && mounted && typeof window !== 'undefined' && createPortal(
        <TransferModal
          onClose={() => setActiveForm(null)}
          balance={balance}
          fiatPeg={fiatPeg}
          onConfirmTransfer={transfer}
          processing={processingTransfer}
          ownerLabel={getOwnerLabelCap()}
        />,
        document.getElementById('modal-portal-root') || document.body
      )}

      {/* ÚLTIMAS TRANSACCIONES */}
      <WalletMovementsHistory
        history={history}
        loadingHistory={loadingHistory}
        ownerType={ownerType}
        ownerId={ownerId}
        walletId={walletData?.id}
      />

      {/* MODAL DE GESTIÓN DE ALIAS BRE-B */}
      <WalletAliasModal
        isOpen={isAliasModalOpen}
        onClose={() => {
          setIsAliasModalOpen(false);
          fetchAliases();
        }}
        ownerType={ownerType}
        ownerId={ownerId}
      />
    </Container>
  );
}
export default StoreWalletPanel;
