import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { useWallet } from '@/hooks/useWallet';
import { SystemRestrictionWrapper } from '../SystemRestrictionWrapper';
import { CurrencyFormatter } from '../CurrencyFormatter';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton
} from '../ModalStyles';
import {
  Container,
  QuickActionsGrid,
  ActionButton,
  DynamicSection,
  FormGroup,
  Label,
  Input,
  SubmitButton,
  CardTitle,
  BalanceValue,
  fadeIn
} from './BaseWalletLayout';
import { WalletBalanceCard } from './WalletBalanceCard';
import { WalletMovementsHistory } from './WalletMovementsHistory';
import { WalletPanelProps, WalletData, LedgerEntry } from './WalletTypes';

const SystemReservesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ReserveCard = styled.div`
  background: rgba(45, 60, 45, 0.25);
  border: 1px solid rgba(16, 185, 129, 0.12);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
`;

export function SystemWalletPanel({ ownerType, ownerId, readOnly = false }: WalletPanelProps) {
  const { token, user: loggedUser } = useAuth();
  const toast = useToast();
  const { showAlert, showConfirm } = useAlert();

  // Permisos basados en RBAC
  const permissions = loggedUser?.permissions || [];
  const canMintManual = permissions.includes('mint_manual_domis');
  const canBurnManual = permissions.includes('burn_manual_domis');
  const canViewLedger = permissions.includes('view_ledger');

  // Core Data & Actions from Custom Hook
  const {
    balance,
    fiatPeg,
    walletData,
    history,
    loading,
    loadingHistory,
    hideBalance,
    toggleHide,
    loadBalance,
    loadHistory
  } = useWallet('system', undefined);

  // System Globals
  const systemUtility = balance;
  const systemCustody = parseFloat(String(walletData?.total_custody_consolidated || 0));

  // Active form view
  const [activeForm, setActiveForm] = useState<'sys_mint' | 'sys_burn' | null>(null);

  const toggleForm = (formType: 'sys_mint' | 'sys_burn') => {
    if (formType === 'sys_mint' && !canMintManual) {
      toast.error('No tienes permisos para realizar acuñación manual.');
      return;
    }
    if (formType === 'sys_burn' && !canBurnManual) {
      toast.error('No tienes permisos para realizar quemado manual.');
      return;
    }
    setActiveForm(prev => (prev === formType ? null : formType));
  };

  // Form states
  const [sysTargetType, setSysTargetType] = useState<'user' | 'store' | 'commerce'>('user');
  const [sysTargetId, setSysTargetId] = useState<string>('');
  const [sysAmount, setSysAmount] = useState<string>('');
  const [processingSys, setProcessingSys] = useState(false);

  // Sys Mint Manual
  const handleSysMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canMintManual) {
      toast.error('No tienes permisos para realizar acuñación manual.');
      return;
    }
    if (!sysTargetId || !sysAmount) {
      toast.error('Completa todos los campos.');
      return;
    }

    setProcessingSys(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/domi/mint/manual`,
        {
          ownerType: sysTargetType,
          ownerId: Number(sysTargetId),
          amountDomis: parseFloat(sysAmount)
        },
        { headers }
      );

      toast.success(`Acuñación manual de ${sysAmount} DOMIs exitosa.`);
      setSysAmount('');
      setSysTargetId('');
      setActiveForm(null);
      loadBalance();
      loadHistory();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Fallo en acuñación manual.';
      toast.error(msg);
    } finally {
      setProcessingSys(false);
    }
  };

  // Sys Burn Manual
  const handleSysBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBurnManual) {
      toast.error('No tienes permisos para realizar quemado manual.');
      return;
    }
    if (!sysTargetId || !sysAmount) {
      toast.error('Completa todos los campos.');
      return;
    }

    showConfirm({
      title: '¿Confirmas el Quemado Manual?',
      message: `Esta acción debitará ${sysAmount} DOMIs de la billetera de ${sysTargetType} #${sysTargetId}. Representa la entrega de dinero fiduciario físico desde la matriz.`,
      confirmText: 'Confirmar Quemado',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setProcessingSys(true);
        try {
          const headers = { Authorization: `Bearer ${token}` };
          await axios.post(
            `${API_URL}/api/domi/burn/manual`,
            {
              ownerType: sysTargetType,
              ownerId: Number(sysTargetId),
              amountDomis: parseFloat(sysAmount)
            },
            { headers }
          );

          toast.success(`Quemado manual de ${sysAmount} DOMIs exitoso.`);
          setSysAmount('');
          setSysTargetId('');
          setActiveForm(null);
          loadBalance();
          loadHistory();
        } catch (error: any) {
          const msg = error.response?.data?.message || 'Fallo en quemado manual.';
          toast.error(msg);
        } finally {
          setProcessingSys(false);
        }
      }
    });
  };

  return (
    <Container>
      <WalletBalanceCard
        title="System Earnings Wallet"
        balance={balance}
        fiatPeg={fiatPeg}
        loading={loading}
        hideBalance={hideBalance}
        toggleHide={toggleHide}
      />

      {/* VAULT RESERVES PARA ADMIN */}
      {canViewLedger && (
        <SystemReservesGrid>
          <ReserveCard>
            <CardTitle style={{ fontSize: '0.75rem' }}>Fondo de Utilidades (Ecosistema)</CardTitle>
            <BalanceValue style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
              <CurrencyFormatter value={systemUtility} symbol="Ð" />
            </BalanceValue>
          </ReserveCard>
          <ReserveCard>
            <CardTitle style={{ fontSize: '0.75rem' }}>Colateral de Custodia en Circulación</CardTitle>
            <BalanceValue style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: '#10b981' }}>
              <CurrencyFormatter value={systemCustody} symbol="Ð" />
            </BalanceValue>
          </ReserveCard>
        </SystemReservesGrid>
      )}

      {/* FILA DE ACCESOS RÁPIDOS */}
      <QuickActionsGrid>
        <SystemRestrictionWrapper permission="mint_manual_domis">
          <ActionButton onClick={() => toggleForm('sys_mint')} type="button">
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
                d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Mint Manual</span>
          </ActionButton>
        </SystemRestrictionWrapper>

        <SystemRestrictionWrapper permission="burn_manual_domis" flagKey="withdrawals_enabled">
          <ActionButton onClick={() => toggleForm('sys_burn')} type="button">
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
                d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Burn Manual</span>
          </ActionButton>
        </SystemRestrictionWrapper>
      </QuickActionsGrid>

      {/* SECCIÓN DINÁMICA DE FORMULARIOS */}
      {activeForm === 'sys_mint' && canMintManual && (
        <DynamicSection>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>Acuñación Manual de Tokens (Mint)</h3>
            <CloseButton type="button" onClick={() => setActiveForm(null)} style={{ fontSize: '1.5rem' }}>✕</CloseButton>
          </div>
          <form onSubmit={handleSysMint}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <FormGroup>
                <Label htmlFor="sys-target-type">Tipo de Cuenta Destino</Label>
                <select
                  id="sys-target-type"
                  value={sysTargetType}
                  onChange={e => setSysTargetType(e.target.value as any)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                >
                  <option value="user">Usuario (Cliente / Repartidor)</option>
                  <option value="store">Sede / Sucursal</option>
                  <option value="commerce">Comercio (Matriz)</option>
                </select>
              </FormGroup>
              <FormGroup>
                <Label htmlFor="sys-target-id">ID de Cuenta Destino</Label>
                <Input
                  id="sys-target-id"
                  type="text"
                  placeholder="ej. 8899"
                  value={sysTargetId}
                  onChange={e => setSysTargetId(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="sys-mint-amount">Monto a Acuñar (DOMIs)</Label>
                <Input
                  id="sys-mint-amount"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="0.00"
                  value={sysAmount}
                  onChange={e => setSysAmount(e.target.value)}
                  required
                />
              </FormGroup>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <SubmitButton type="submit" disabled={processingSys}>
                  {processingSys ? 'Procesando Acuñación...' : 'Confirmar Acuñación'}
                </SubmitButton>
              </div>
            </div>
          </form>
        </DynamicSection>
      )}

      {activeForm === 'sys_burn' && canBurnManual && (
        <DynamicSection>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>Quemado Manual de Tokens (Burn)</h3>
            <CloseButton type="button" onClick={() => setActiveForm(null)} style={{ fontSize: '1.5rem' }}>✕</CloseButton>
          </div>
          <form onSubmit={handleSysBurn}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <FormGroup>
                <Label htmlFor="sys-burn-target-type">Tipo de Cuenta Destino</Label>
                <select
                  id="sys-burn-target-type"
                  value={sysTargetType}
                  onChange={e => setSysTargetType(e.target.value as any)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                >
                  <option value="user">Usuario (Cliente / Repartidor)</option>
                  <option value="store">Sede / Sucursal</option>
                  <option value="commerce">Comercio (Matriz)</option>
                </select>
              </FormGroup>
              <FormGroup>
                <Label htmlFor="sys-burn-target-id">ID de Cuenta Destino</Label>
                <Input
                  id="sys-burn-target-id"
                  type="text"
                  placeholder="ej. 8899"
                  value={sysTargetId}
                  onChange={e => setSysTargetId(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="sys-burn-amount">Monto a Quemar (DOMIs)</Label>
                <Input
                  id="sys-burn-amount"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="0.00"
                  value={sysAmount}
                  onChange={e => setSysAmount(e.target.value)}
                  required
                />
              </FormGroup>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <SubmitButton type="submit" disabled={processingSys} style={{ background: '#ef4444', color: '#fff' }}>
                  {processingSys ? 'Procesando Quemado...' : 'Confirmar Quemado'}
                </SubmitButton>
              </div>
            </div>
          </form>
        </DynamicSection>
      )}

      {/* MOVIMIENTOS RECIENTES */}
      {canViewLedger && (
        <WalletMovementsHistory
          history={history}
          loadingHistory={loadingHistory}
          ownerType={ownerType}
          ownerId={ownerId}
        />
      )}
    </Container>
  );
}
export default SystemWalletPanel;
