'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { Spinner } from '@/components/Common/UIElements';
import { EmptyState } from '@/components/Common/EmptyState';
import { SystemRestrictionWrapper } from '@/components/Common/SystemRestrictionWrapper';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  padding: 1.5rem;
  color: #fff;
  min-height: 80vh;
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #fff 0%, #aaa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 1.5rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  color: ${props => props.$active ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.5)'};
  padding: 0.75rem 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--emerald);
    transform: ${props => props.$active ? 'scaleX(1)' : 'scaleX(0)'};
    transition: transform 0.2s;
  }

  &:hover {
    color: ${props => props.$active ? 'var(--emerald)' : '#fff'};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const GlassCard = styled.div`
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.6) 0%, rgba(18, 18, 18, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled(GlassCard)`
  padding: 1.5rem;
  gap: 0.5rem;
`;

const KpiLabel = styled.span`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
`;

const KpiValue = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  font-family: monospace;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.65rem 1rem;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: var(--emerald);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.65rem 1rem;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;

  option {
    background: #181818;
  }
`;

const Textarea = styled.textarea`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.65rem 1rem;
  color: #fff;
  font-size: 0.9rem;
  min-height: 80px;
  outline: none;
  resize: vertical;

  &:focus {
    border-color: var(--emerald);
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${props => {
    if (props.$variant === 'primary') return 'var(--emerald)';
    if (props.$variant === 'danger') return '#ef4444';
    return 'rgba(255, 255, 255, 0.05)';
  }};
  border: 1px solid ${props => {
    if (props.$variant === 'primary') return 'transparent';
    if (props.$variant === 'danger') return 'transparent';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  color: ${props => props.$variant === 'primary' ? '#000' : '#fff'};
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background: ${props => {
      if (props.$variant === 'primary') return '#059669';
      if (props.$variant === 'danger') return '#dc2626';
      return 'rgba(255, 255, 255, 0.1)';
    }};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;
`;

const Th = styled.th`
  background: rgba(255, 255, 255, 0.03);
  padding: 0.85rem 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Td = styled.td`
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
`;

const Badge = styled.span<{ $type: string }>`
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;

  background: ${props => {
    if (props.$type === 'income' || props.$type === 'confirmed') return 'rgba(16, 185, 129, 0.15)';
    if (props.$type === 'expense' || props.$type === 'rejected') return 'rgba(239, 68, 68, 0.15)';
    if (props.$type === 'deposit' || props.$type === 'pending') return 'rgba(245, 158, 11, 0.15)';
    return 'rgba(255, 255, 255, 0.1)';
  }};

  color: ${props => {
    if (props.$type === 'income' || props.$type === 'confirmed') return '#10b981';
    if (props.$type === 'expense' || props.$type === 'rejected') return '#ef4444';
    if (props.$type === 'deposit' || props.$type === 'pending') return '#f59e0b';
    return '#fff';
  }};
`;

const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalCard = styled.div`
  background: #181818;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 1.25rem;
  }
`;

export default function CashAndBankPage() {
  const toast = useToast();
  const { showConfirm } = useAlert();
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<'vault' | 'deposits' | 'pin'>('vault');
  const [summary, setSummary] = useState<any>({ cashBalance: 0, bankTransitBalance: 0 });
  const [cashTxs, setCashTxs] = useState<any[]>([]);
  const [bankDeposits, setBankDeposits] = useState<any[]>([]);
  const [operatorHistory, setOperatorHistory] = useState<any>({ cashTransactions: [], bankDeposits: [] });
  const [loading, setLoading] = useState(true);

  // Modales
  const [showPinModal, setShowPinModal] = useState(false);
  const [activeDepositId, setActiveDepositId] = useState<number | null>(null);
  const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
  const [financialPin, setFinancialPin] = useState('');
  const [reconcileAction, setReconcileAction] = useState<'approve' | 'reject'>('approve');
  const [reconcileNotes, setReconcileNotes] = useState('');

  // Formularios de Transacción
  const [cashAmount, setCashAmount] = useState('');
  const [cashType, setCashType] = useState('income');
  const [cashNotes, setCashNotes] = useState('');

  // Formulario de Consignación
  const [bankAmount, setBankAmount] = useState('');
  const [destinationWallet, setDestinationWallet] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [bankNotes, setBankNotes] = useState('');
  const [isFromCash, setIsFromCash] = useState(false);

  // Formulario de Configuración de PIN
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPin, setNewPin] = useState('');

  const canViewCash = user?.permissions?.includes('view_cash_vault');
  const canManageCash = user?.permissions?.includes('manage_cash_vault');
  const canRegisterDeposit = user?.permissions?.includes('register_bank_deposit');
  const canReconcile = user?.permissions?.includes('reconcile_bank_deposit');

  useEffect(() => {
    if (token && canViewCash) {
      fetchData();
    }
  }, [token, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Summary
      const summaryRes = await axios.get(`${API_URL}/api/cash/summary`, { headers });
      setSummary(summaryRes.data);

      if (activeTab === 'vault') {
        const txsRes = await axios.get(`${API_URL}/api/cash/transactions`, { headers });
        setCashTxs(txsRes.data);

        const historyRes = await axios.get(`${API_URL}/api/cash/operator/history?timeframe=day`, { headers });
        setOperatorHistory(historyRes.data);
      } else if (activeTab === 'deposits') {
        const depositsRes = await axios.get(`${API_URL}/api/cash/bank/deposits`, { headers });
        setBankDeposits(depositsRes.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cargar datos financieros.');
    } finally {
      setLoading(false);
    }
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAmount || parseFloat(cashAmount) <= 0) {
      toast.error('Monto inválido.');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/cash/transaction`, {
        amountCop: parseFloat(cashAmount),
        txType: cashType,
        notes: cashNotes
      }, { headers });

      toast.success('Transacción de caja registrada.');
      setCashAmount('');
      setCashNotes('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al registrar flujo de caja.');
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAmount || parseFloat(bankAmount) <= 0 || !destinationWallet || !evidenceUrl) {
      toast.error('Por favor completa todos los campos requeridos y el soporte.');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/cash/bank/deposit`, {
        amountCop: parseFloat(bankAmount),
        destinationWalletId: parseInt(destinationWallet, 10),
        evidenceUrl,
        notes: bankNotes,
        isFromCash
      }, { headers });

      toast.success('Consignación reportada. Espera aprobación.');
      setBankAmount('');
      setDestinationWallet('');
      setEvidenceUrl('');
      setBankNotes('');
      setIsFromCash(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al reportar depósito.');
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPin || newPin.length !== 6) {
      toast.error('Contraseña y PIN de 6 dígitos requeridos.');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/manage/financial-pin`, {
        currentPassword,
        financialPin: newPin
      }, { headers });

      toast.success('PIN financiero configurado con éxito.');
      setCurrentPassword('');
      setNewPin('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar el PIN.');
    }
  };

  const handleReconcileAction = (id: number, action: 'approve' | 'reject') => {
    setActiveDepositId(id);
    setReconcileAction(action);
    setShowPinModal(true);
  };

  const executeReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reconcileAction === 'approve' && !financialPin) {
      toast.error('PIN requerido.');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = `${API_URL}/api/cash/bank/deposit/${activeDepositId}/reconcile`;

      const res = await axios.post(endpoint, {
        action: reconcileAction,
        notes: reconcileNotes,
        financialPin
      }, { headers });

      toast.success(res.data.message);
      setShowPinModal(false);
      setFinancialPin('');
      setReconcileNotes('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fallo en la conciliación.');
    }
  };

  if (!canViewCash && !canRegisterDeposit) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,0,0,0.03)', border: '1px solid rgba(255,0,0,0.1)', borderRadius: '12px' }}>
          <h2 style={{ color: '#ef4444' }}>Acceso Restringido</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>No tienes los permisos requeridos para interactuar con la gestión de caja y bancos.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <HeaderSection>
        <Title>Gestión de Caja y Bancos</Title>
        <Subtitle>Monitoreo contable del flujo de caja físico, conciliación de depósitos y acuñación de DOMIs</Subtitle>
      </HeaderSection>

      {/* Resumen Contable */}
      <KpiRow>
        <KpiCard>
          <KpiLabel>Efectivo Caja Física (COP)</KpiLabel>
          <KpiValue style={{ color: 'var(--emerald)' }}>
            ${summary.cashBalance.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </KpiValue>
        </KpiCard>
        <KpiCard>
          <KpiLabel>Fondos en Tránsito por Conciliar (Banco)</KpiLabel>
          <KpiValue style={{ color: '#f59e0b' }}>
            ${summary.bankTransitBalance.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </KpiValue>
        </KpiCard>
      </KpiRow>

      <TabsContainer>
        {canViewCash && (
          <Tab $active={activeTab === 'vault'} onClick={() => setActiveTab('vault')}>
            Caja Física y Turno
          </Tab>
        )}
        {canViewCash && (
          <Tab $active={activeTab === 'deposits'} onClick={() => setActiveTab('deposits')}>
            Conciliaciones Bancarias (Acuñar)
          </Tab>
        )}
        <Tab $active={activeTab === 'pin'} onClick={() => setActiveTab('pin')}>
          Mi PIN Financiero
        </Tab>
      </TabsContainer>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
      ) : (
        <>
          {activeTab === 'vault' && (
            <Grid>
              {/* Columna Izquierda: Historial */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <GlassCard>
                  <h3 style={{ margin: 0 }}>Historial de Caja Física</h3>
                  <TableContainer>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Fecha</Th>
                          <Th>Tipo</Th>
                          <Th>Monto</Th>
                          <Th>Registrado Por</Th>
                          <Th>Notas</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashTxs.length === 0 ? (
                          <tr>
                            <Td colSpan={5} style={{ textAlign: 'center' }}>No hay registros de caja.</Td>
                          </tr>
                        ) : (
                          cashTxs.map(tx => (
                            <tr key={tx.id}>
                              <Td>{new Date(tx.created_at).toLocaleString('es-CO')}</Td>
                              <Td><Badge $type={tx.tx_type}>{tx.tx_type}</Badge></Td>
                              <Td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                ${parseFloat(tx.amount_cop).toLocaleString('es-CO')}
                              </Td>
                              <Td>{tx.creator_email}</Td>
                              <Td style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{tx.notes || '—'}</Td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </TableContainer>
                </GlassCard>

                <GlassCard>
                  <h3 style={{ margin: 0 }}>Resumen de mi Turno (Hoy)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span>Efectivo Ingresado por mí:</span>
                      <strong style={{ color: 'var(--emerald)' }}>
                        ${operatorHistory.cashTransactions.filter((t: any) => t.tx_type === 'income').reduce((sum: number, t: any) => sum + parseFloat(t.amount_cop), 0).toLocaleString('es-CO')} COP
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span>Efectivo Retirado por mí:</span>
                      <strong style={{ color: '#ef4444' }}>
                        ${operatorHistory.cashTransactions.filter((t: any) => t.tx_type === 'expense' || t.tx_type === 'deposit').reduce((sum: number, t: any) => sum + parseFloat(t.amount_cop), 0).toLocaleString('es-CO')} COP
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Depósitos Reportados por mí:</span>
                      <strong style={{ color: '#f59e0b' }}>
                        {operatorHistory.bankDeposits.length} consignaciones
                      </strong>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Columna Derecha: Formularios */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {canManageCash && (
                  <GlassCard>
                    <h3 style={{ margin: 0 }}>Flujo de Caja</h3>
                    <Form onSubmit={handleCashSubmit}>
                      <FormGroup>
                        <Label>Monto (Pesos COP)</Label>
                        <Input 
                          type="number" 
                          required 
                          placeholder="Ej. 50000" 
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>Operación</Label>
                        <Select value={cashType} onChange={(e) => setCashType(e.target.value)}>
                          <option value="income">Entrada de Efectivo</option>
                          <option value="expense">Salida de Efectivo</option>
                          <option value="adjustment">Ajuste de Arqueo (Sobrante/Faltante)</option>
                        </Select>
                      </FormGroup>
                      <FormGroup>
                        <Label>Notas explicativas</Label>
                        <Textarea 
                          placeholder="Escribe la razón del movimiento..." 
                          value={cashNotes}
                          onChange={(e) => setCashNotes(e.target.value)}
                        />
                      </FormGroup>
                      <Button type="submit" $variant="primary">Registrar Movimiento</Button>
                    </Form>
                  </GlassCard>
                )}

                {canRegisterDeposit && (
                  <GlassCard>
                    <h3 style={{ margin: 0 }}>Consignar en Bancolombia</h3>
                    <Form onSubmit={handleDepositSubmit}>
                      <FormGroup>
                        <Label>Monto Consignado (COP)</Label>
                        <Input 
                          type="number" 
                          required 
                          placeholder="Ej. 100000"
                          value={bankAmount}
                          onChange={(e) => setBankAmount(e.target.value)}
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>ID Wallet del Destinatario (Acuñación)</Label>
                        <Input 
                          type="number" 
                          required 
                          placeholder="Ej. 12"
                          value={destinationWallet}
                          onChange={(e) => setDestinationWallet(e.target.value)}
                        />
                      </FormGroup>
                      <FormGroup style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="checkbox" 
                          id="fromCash" 
                          checked={isFromCash}
                          onChange={(e) => setIsFromCash(e.target.checked)}
                        />
                        <Label htmlFor="fromCash" style={{ cursor: 'pointer' }}>Sacar el dinero de la Caja Física</Label>
                      </FormGroup>
                      <FormGroup>
                        <Label>URL de Soporte de Bancolombia</Label>
                        <Input 
                          type="text" 
                          required 
                          placeholder="Link de imagen del soporte..."
                          value={evidenceUrl}
                          onChange={(e) => setEvidenceUrl(e.target.value)}
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>Observaciones</Label>
                        <Textarea 
                          placeholder="Notas adicionales..."
                          value={bankNotes}
                          onChange={(e) => setBankNotes(e.target.value)}
                        />
                      </FormGroup>
                      <Button type="submit" $variant="primary">Reportar Consignación</Button>
                    </Form>
                  </GlassCard>
                )}

                {/* Retiros (Quema de DOMIs) */}
                <SystemRestrictionWrapper permission="burn_manual_domis" flagKey="withdrawals_enabled" fullWidth>
                  <GlassCard>
                    <h3 style={{ margin: 0 }}>Retiros (Quema de DOMIs)</h3>
                    <p style={{ fontSize: '0.85rem', margin: 0, color: 'rgba(255,255,255,0.5)' }}>Retira dinero real y quema tokens DOMI.</p>
                    <Button onClick={() => window.location.href = '/admin/dashboard/ledger'} style={{ width: '100%' }} $variant="primary">Realizar Retiro / Quema</Button>
                  </GlassCard>
                </SystemRestrictionWrapper>
              </div>
            </Grid>
          )}

          {activeTab === 'deposits' && (
            <GlassCard>
              <h3 style={{ margin: 0 }}>Consignaciones Pendientes de Aprobación</h3>
              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Registrado Por</th>
                      <th>Monto COP</th>
                      <th>Destinatario</th>
                      <th>Soporte</th>
                      <th>Estado</th>
                      {canReconcile && <th style={{ textAlign: 'right' }}>Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bankDeposits.length === 0 ? (
                      <tr>
                        <Td colSpan={7} style={{ textAlign: 'center' }}>No hay depósitos registrados.</Td>
                      </tr>
                    ) : (
                      bankDeposits.map(dep => (
                        <tr key={dep.id}>
                          <Td>{new Date(dep.created_at).toLocaleDateString('es-CO')}</Td>
                          <Td>{dep.creator_email}</Td>
                          <Td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            ${parseFloat(dep.amount_cop).toLocaleString('es-CO')}
                          </Td>
                          <Td>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{dep.owner_type.toUpperCase()} ID {dep.owner_id}</span><br />
                            <strong>{dep.destination_name}</strong>
                          </Td>
                          <Td>
                            <Button onClick={() => setActiveDocUrl(dep.evidence_url)}>Ver Soporte</Button>
                          </Td>
                          <Td><Badge $type={dep.status}>{dep.status}</Badge></Td>
                          {canReconcile && (
                            <Td style={{ textAlign: 'right' }}>
                              {dep.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <Button $variant="danger" onClick={() => handleReconcileAction(dep.id, 'reject')}>Rechazar</Button>
                                  <Button $variant="primary" onClick={() => handleReconcileAction(dep.id, 'approve')}>Aprobar y Acuñar</Button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
                                  Procesado por {dep.confirmer_email || 'Sistema'}
                                </span>
                              )}
                            </Td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </TableContainer>
            </GlassCard>
          )}

          {activeTab === 'pin' && (
            <div style={{ maxWidth: '500px' }}>
              <GlassCard>
                <h3 style={{ margin: 0 }}>Configurar PIN Financiero Numérico</h3>
                <p style={{ fontSize: '0.85rem', margin: 0, color: 'rgba(255,255,255,0.5)' }}>
                  El PIN Financiero es un código de 6 dígitos numéricos que debes ingresar como factor de seguridad extra cada vez que apruebes una acuñación en la plataforma.
                </p>
                <Form onSubmit={handlePinSubmit}>
                  <FormGroup>
                    <Label>Contraseña actual de sesión</Label>
                    <Input 
                      type="password" 
                      required 
                      placeholder="Ingresa tu clave actual..."
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Nuevo PIN financiero (6 números)</Label>
                    <Input 
                      type="password" 
                      maxLength={6}
                      required 
                      placeholder="Ej. 123456"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                    />
                  </FormGroup>
                  <Button type="submit" $variant="primary">Configurar PIN</Button>
                </Form>
              </GlassCard>
            </div>
          )}
        </>
      )}

      {/* Modal del PIN Financiero */}
      {showPinModal && (
        <ModalBackdrop onClick={() => setShowPinModal(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Autorizar Operación Financiera</h3>
              <button 
                onClick={() => setShowPinModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </ModalHeader>
            <form onSubmit={executeReconcile}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                  Estás a punto de **{reconcileAction === 'approve' ? 'APROBAR y ACUÑAR' : 'RECHAZAR'}** esta consignación bancaria.
                </p>
                {reconcileAction === 'approve' && (
                  <FormGroup>
                    <Label>Ingresa tu PIN Financiero de 6 dígitos</Label>
                    <Input 
                      type="password" 
                      maxLength={6}
                      required 
                      placeholder="••••••"
                      value={financialPin}
                      onChange={(e) => setFinancialPin(e.target.value)}
                    />
                  </FormGroup>
                )}
                <FormGroup>
                  <Label>Notas explicativas (Opcional)</Label>
                  <Textarea 
                    placeholder="Escribe comentarios de conciliación..."
                    value={reconcileNotes}
                    onChange={(e) => setReconcileNotes(e.target.value)}
                  />
                </FormGroup>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <Button type="button" onClick={() => setShowPinModal(false)}>Cancelar</Button>
                <Button type="submit" $variant={reconcileAction === 'approve' ? 'primary' : 'danger'}>
                  {reconcileAction === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
                </Button>
              </div>
            </form>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Visor de Documentos */}
      {activeDocUrl && (
        <ModalBackdrop onClick={() => setActiveDocUrl(null)}>
          <ModalCard style={{ maxWidth: '750px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Comprobante de Bancolombia</h3>
              <button 
                onClick={() => setActiveDocUrl(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </ModalHeader>
            <div style={{ display: 'flex', justifyContent: 'center', background: '#121212', padding: '1rem', borderRadius: '8px' }}>
              <img src={activeDocUrl} alt="Comprobante Bancario" style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button onClick={() => setActiveDocUrl(null)}>Cerrar</Button>
            </div>
          </ModalCard>
        </ModalBackdrop>
      )}
    </PageContainer>
  );
}
