import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  DynamicSection,
  FormGroup,
  Label,
  Input,
  SubmitButton,
  fadeIn,
  PulsingIncrementDecrementButton
} from './BaseWalletLayout';
import { WalletBalanceCard } from './WalletBalanceCard';
import { WalletAliasCard } from './WalletAliasCard';
import { WalletMovementsHistory } from './WalletMovementsHistory';
import { WalletPanelProps } from './WalletTypes';

export function UserWalletPanel({ ownerType, ownerId, readOnly = false, isCustomerView = false }: WalletPanelProps) {
  const { token, user: loggedUser } = useAuth();
  const toast = useToast();
  const { showAlert, showConfirm } = useAlert();

  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);

  // Permisos basados en RBAC
  const permissions = loggedUser?.permissions || [];
  const canPurchase = permissions.includes('checkout_domis');
  const canTransfer = permissions.includes('transfer_domis');
  const canWithdraw = permissions.includes('withdraw_domis');

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
  const [activeForm, setActiveForm] = useState<'buy' | 'transfer' | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleForm = (formType: 'buy' | 'transfer') => {
    if (formType === 'buy' && !canPurchase) {
      toast.error('No tienes permisos para comprar DOMIs.');
      return;
    }
    if (formType === 'transfer' && !canTransfer) {
      toast.error('No tienes permisos para realizar transferencias.');
      return;
    }
    setActiveForm(prev => (prev === formType ? null : formType));
  };

  // Retirar (Falsa)
  const handleRetirarClick = () => {
    if (!canWithdraw) {
      toast.error('No tienes permisos para realizar retiros.');
      return;
    }
    showConfirm({
      title: 'Retiro Fiduciario Directo (Cash Out)',
      message:
        'Esta opción estará disponible próximamente en Fase 4. Por el momento, el retiro o quemado de DOMIs por dinero real debe ser gestionado físicamente en la Casa Matriz con un operador financiero autorizado.',
      confirmText: 'Entendido',
      onConfirm: () => {}
    });
  };

  const handlePayDebt = async (debtId: number, amount: number) => {
    if (balance < amount) {
      showAlert({
        title: 'Saldo Insuficiente',
        message: `No tienes suficientes DOMIs para liquidar este cargo. Necesitas ${amount} DOMI, y tu saldo actual es de ${balance} DOMI. Por favor, compra más DOMIs primero.`,
        confirmText: 'Aceptar'
      });
      return;
    }

    showConfirm({
      title: 'Liquidar Compensación Automática',
      message: `¿Estás seguro de pagar ${amount} DOMI para liquidar esta compensación automática? El saldo se descontará de tu monedero y se transferirá al beneficiario.`,
      confirmText: isCustomerView ? 'Pagar Compensación' : 'Pagar Compensación',
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
          score={walletData?.domi_score}
          rclAmount={rclAmount}
          onRefresh={loadBalance}
          isCustomerView={isCustomerView}
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
                  Debes liquidar tus compensaciones pendientes para poder realizar nuevos pedidos en
                  el sistema.
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
                  onClick={() => handlePayDebt(debt.id, parseFloat(debt.amount_domis))}
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
                  {isCustomerView ? 'Liquidar Compensación' : 'Liquidar Cargo'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REEMBOLSOS EN COLA DE LIQUIDACIÓN */}
      {(loggedUser?.rol === 'delivery' || loggedUser?.roles?.includes('driver')) &&
        walletData?.contingent_refunds &&
        walletData.contingent_refunds.length > 0 && (
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
              <span style={{ fontSize: '1.5rem' }}>🚚</span>
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
                  Saldo compensatorio pendiente por cancelaciones en tránsito de clientes. Se
                  acreditará a tu monedero una vez que el cliente liquide su cargo.
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
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <span>{isCustomerView ? 'Recargar Saldo' : 'Comprar DOMIs'}</span>
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
              <span>{isCustomerView ? 'Enviar Saldo' : 'Transferir'}</span>
            </ActionButton>
          )}
        </SystemRestrictionWrapper>

        <SystemRestrictionWrapper permission="withdraw_domis" flagKey="withdrawals_enabled">
          {!readOnly && (
            <ActionButton $disabled onClick={handleRetirarClick} type="button">
              <svg
                className="icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l-5 5m0 0l-5-5m5 5V3" />
              </svg>
              <span>Retirar</span>
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

      {/* PORTALES PARA MODALES (BUY & TRANSFER) */}
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
          ownerLabel="Usuario"
          isCustomerView={isCustomerView}
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
          ownerLabel="Usuario"
          isCustomerView={isCustomerView}
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
        isCustomerView={isCustomerView}
        fiatPeg={fiatPeg}
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
export default UserWalletPanel;
