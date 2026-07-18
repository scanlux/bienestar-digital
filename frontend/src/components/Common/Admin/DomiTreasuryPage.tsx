'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import {
  Container, HeaderSection, Panel, LoadingState, Spinner,
  ModalBackdrop, ModalCard, ModalHeader, ModalBody, ModalFooter,
  FormGroup, FormLabel, FormInput, SubmitBtn, CancelBtn
} from '@/app/admin/dashboard/AdminDashboardStyles';

// Estilos premium específicos para Tesorería
const TreasuryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
`;

const KpiCard = styled.div<{ $status?: 'green' | 'yellow' | 'red' }>`
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.4) 0%, rgba(20, 20, 20, 0.6) 100%);
  border: 1px solid ${props => 
    props.$status === 'green' ? 'rgba(72, 214, 76, 0.2)' : 
    props.$status === 'yellow' ? 'rgba(245, 158, 11, 0.2)' : 
    props.$status === 'red' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);

  .kpi-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .kpi-value {
    font-size: 1.85rem;
    font-weight: 800;
    color: ${props => 
      props.$status === 'green' ? '#48d64c' : 
      props.$status === 'yellow' ? '#f59e0b' : 
      props.$status === 'red' ? '#ef4444' : '#fff'};
  }

  .kpi-subtitle {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.35);
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const FormPanel = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 12px;
`;

const SelectInput = styled.select`
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 16px;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: var(--emerald);
    background: rgba(255, 255, 255, 0.04);
  }

  option {
    background: #0f172a;
    color: #fff;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const CustomTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  text-align: left;

  th, td {
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  th {
    background: rgba(255, 255, 255, 0.02);
    color: rgba(255, 255, 255, 0.5);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
  }

  tbody tr {
    transition: background-color 0.2s;
    &:hover {
      background: rgba(255, 255, 255, 0.01);
    }
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' | 'success' }>`
  background: ${props => 
    props.$variant === 'primary' ? 'var(--emerald)' : 
    props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 
    props.$variant === 'success' ? 'rgba(72, 214, 76, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => 
    props.$variant === 'primary' ? '#000' : 
    props.$variant === 'danger' ? '#ef4444' : 
    props.$variant === 'success' ? '#48d64c' : '#fff'};
  border: 1px solid ${props => 
    props.$variant === 'primary' ? 'transparent' : 
    props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 
    props.$variant === 'success' ? 'rgba(72, 214, 76, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    background: ${props => 
      props.$variant === 'primary' ? 'var(--emerald-hover)' : 
      props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 
      props.$variant === 'success' ? 'rgba(72, 214, 76, 0.25)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const Badge = styled.span<{ $color: 'green' | 'yellow' | 'red' | 'blue' }>`
  background: ${props => 
    props.$color === 'green' ? 'rgba(72, 214, 76, 0.1)' : 
    props.$color === 'yellow' ? 'rgba(245, 158, 11, 0.1)' : 
    props.$color === 'red' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  color: ${props => 
    props.$color === 'green' ? '#48d64c' : 
    props.$color === 'yellow' ? '#f59e0b' : 
    props.$color === 'red' ? '#ef4444' : '#3b82f6'};
  border: 1px solid ${props => 
    props.$color === 'green' ? 'rgba(72, 214, 76, 0.2)' : 
    props.$color === 'yellow' ? 'rgba(245, 158, 11, 0.2)' : 
    props.$color === 'red' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'};
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const EmptyStateText = styled.div`
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 600;
  font-size: 0.9rem;
`;

export default function DomiTreasuryPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { showConfirm } = useAlert();

  // Estados de datos
  const [status, setStatus] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Formularios
  const [reservaCop, setReservaCop] = useState('');
  const [reservaNotas, setReservaNotas] = useState('');
  const [submittingReserva, setSubmittingReserva] = useState(false);

  const [mintType, setMintType] = useState('user');
  const [mintOwnerId, setMintOwnerId] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [submittingMint, setSubmittingMint] = useState(false);

  // Modales
  const [activeWithdrawal, setActiveWithdrawal] = useState<any>(null);
  const [withdrawalAction, setWithdrawalAction] = useState<'approve' | 'reject'>('approve');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  // Permisos
  const hasPricingAccess = user?.permissions && user.permissions.includes('view_domi_pricing');
  const hasWithdrawAccess = user?.permissions && user.permissions.includes('approve_withdrawals');
  const hasReserveAccess = user?.permissions && user.permissions.includes('declare_domi_reserve');
  const hasMintAccess = user?.permissions && user.permissions.includes('mint_domi_cash');
  const hasConfirmAccess = user?.permissions && user.permissions.includes('confirm_domi_reserve');

  const fetchAllData = async () => {
    try {
      const headers = getAuthHeaders();
      const promises: Promise<any>[] = [];

      if (hasPricingAccess) {
        promises.push(axios.get(`${API_URL}/api/domi/treasury/status`, { headers }));
      }
      if (hasWithdrawAccess) {
        promises.push(axios.get(`${API_URL}/api/domi/treasury/withdrawals?status=pendiente`, { headers }));
      }

      const results = await Promise.all(promises);
      let idx = 0;
      if (hasPricingAccess) {
        setStatus(results[idx++].data);
      }
      if (hasWithdrawAccess) {
        setWithdrawals(results[idx++].data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching treasury data:', error);
      toast.error('Error al cargar la información de tesorería.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPricingAccess) {
      fetchAllData();
    }
  }, [user]);

  // Formulario: Declarar Reserva fiduciaria
  const handleDeclareReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservaCop || isNaN(Number(reservaCop)) || Number(reservaCop) < 0) {
      toast.error('Ingrese un monto válido de reserva.');
      return;
    }
    setSubmittingReserva(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${API_URL}/api/domi/treasury/reserve/declare`,
        { reservaCop: Number(reservaCop), notas: reservaNotas },
        { headers }
      );
      toast.success('Reserva bancaria declarada exitosamente.');
      setReservaCop('');
      setReservaNotas('');
      fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al declarar reserva.');
    } finally {
      setSubmittingReserva(false);
    }
  };

  // Formulario: Acuñación Transitoria por Efectivo
  const handleMintCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mintOwnerId || isNaN(Number(mintOwnerId))) {
      toast.error('Ingrese un ID de propietario válido.');
      return;
    }
    if (!mintAmount || isNaN(Number(mintAmount)) || Number(mintAmount) <= 0) {
      toast.error('Ingrese una cantidad válida de DOMIs.');
      return;
    }
    setSubmittingMint(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${API_URL}/api/domi/treasury/mint/cash`,
        { ownerType: mintType, ownerId: Number(mintOwnerId), amountDomis: Number(mintAmount) },
        { headers }
      );
      toast.success('Acuñación transitoria registrada. Recuerde confirmar el depósito en banco.');
      setMintOwnerId('');
      setMintAmount('');
      fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar acuñación transitoria.');
    } finally {
      setSubmittingMint(false);
    }
  };

  // Procesar Retiro fiduciario
  const handleProcessWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWithdrawal) return;
    setSubmittingWithdrawal(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(
        `${API_URL}/api/domi/treasury/withdrawals/${activeWithdrawal.id}/process`,
        { action: withdrawalAction, notes: withdrawalNotes },
        { headers }
      );
      toast.success(withdrawalAction === 'approve' ? 'Retiro aprobado con éxito.' : 'Retiro rechazado con éxito.');
      setActiveWithdrawal(null);
      setWithdrawalNotes('');
      fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar solicitud de retiro.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <span>Cargando Tesorería...</span>
      </LoadingState>
    );
  }

  // Cálculos de alerta de colateralización
  const collateralRatio = status?.collateral_ratio || 0.0;
  const isColateralOk = collateralRatio >= 105.0;
  const isColateralWarning = collateralRatio >= 100.0 && collateralRatio < 105.0;
  const colateralColor = isColateralOk ? 'green' : isColateralWarning ? 'yellow' : 'red';

  return (
    <Container>
      <HeaderSection>
        <div>
          <div className="subtitle">MÓDULO DE EMISIÓN FINANCIERA</div>
          <div className="title">Tesorería DOMI Token</div>
        </div>
        <div className="time-badge">
          Peg: 1 DOMI = {status?.fiat_peg_cop?.toLocaleString('es-CO')} COP
        </div>
      </HeaderSection>

      {/* KPI Dashboard */}
      <TreasuryGrid>
        <KpiCard $status={status?.reserva_cop > 0 ? 'green' : 'red'}>
          <div className="kpi-title">Reserva Fiduciaria</div>
          <div className="kpi-value">${parseFloat(status?.reserva_cop || 0).toLocaleString('es-CO')} COP</div>
          <div className="kpi-subtitle">
            Último reporte: {status?.last_declaration_date ? new Date(status.last_declaration_date).toLocaleDateString() : 'Ninguno'}
          </div>
        </KpiCard>

        <KpiCard>
          <div className="kpi-title">Circulante Oficial</div>
          <div className="kpi-value">{parseFloat(status?.circulante_oficial || 0).toLocaleString('es-CO')} DOMI</div>
          <div className="kpi-subtitle">Tokens confirmados en circulación</div>
        </KpiCard>

        <KpiCard $status={status?.circulante_transitorio > 0 ? 'yellow' : undefined}>
          <div className="kpi-title">Circulante Transitorio</div>
          <div className="kpi-value">{parseFloat(status?.circulante_transitorio || 0).toLocaleString('es-CO')} DOMI</div>
          <div className="kpi-subtitle">Pendiente consignación en banco</div>
        </KpiCard>

        <KpiCard $status={colateralColor}>
          <div className="kpi-title">Ratio Colateral</div>
          <div className="kpi-value">{parseFloat(collateralRatio || 0).toFixed(2)}%</div>
          <div className="kpi-subtitle">Respaldo mínimo sugerido: 105%</div>
        </KpiCard>
      </TreasuryGrid>

      <SectionGrid>
        {/* Declarar Reserva Bancaria */}
        {hasReserveAccess && (
          <FormPanel>
            <FormTitle>Declarar Reserva Fiduciaria</FormTitle>
            <form onSubmit={handleDeclareReserve} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormGroup>
                <FormLabel>Saldo Real en Cuenta Bancaria (COP)</FormLabel>
                <FormInput
                  type="number"
                  placeholder="Ej: 15000000"
                  value={reservaCop}
                  onChange={(e) => setReservaCop(e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Notas / Auditoría</FormLabel>
                <FormInput
                  type="text"
                  placeholder="Ej: Extracto Bancolombia Cierre de Mes"
                  value={reservaNotas}
                  onChange={(e) => setReservaNotas(e.target.value)}
                />
              </FormGroup>
              <ActionButton type="submit" $variant="primary" style={{ alignSelf: 'flex-start' }} disabled={submittingReserva}>
                {submittingReserva ? 'Declarando...' : 'Declarar Reserva'}
              </ActionButton>
            </form>
          </FormPanel>
        )}

        {/* Acuñación Transitoria */}
        {hasMintAccess && (
          <FormPanel>
            <FormTitle>Acuñación Transitoria (Efectivo)</FormTitle>
            <form onSubmit={handleMintCash} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormRow>
                <FormGroup>
                  <FormLabel>Tipo de Propietario</FormLabel>
                  <SelectInput value={mintType} onChange={(e) => setMintType(e.target.value)}>
                    <option value="user">Usuario / Repartidor</option>
                    <option value="store">Sede (Store)</option>
                  </SelectInput>
                </FormGroup>
                <FormGroup>
                  <FormLabel>ID Propietario</FormLabel>
                  <FormInput
                    type="number"
                    placeholder="Ej: 12"
                    value={mintOwnerId}
                    onChange={(e) => setMintOwnerId(e.target.value)}
                    required
                  />
                </FormGroup>
              </FormRow>
              <FormGroup>
                <FormLabel>Monto a Emitir (DOMI)</FormLabel>
                <FormInput
                  type="number"
                  placeholder="Ej: 50000"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  required
                />
              </FormGroup>
              <ActionButton type="submit" $variant="primary" style={{ alignSelf: 'flex-start' }} disabled={submittingMint}>
                {submittingMint ? 'Registrando...' : 'Emitir DOMIs'}
              </ActionButton>
            </form>
          </FormPanel>
        )}
      </SectionGrid>

      {/* Cola de Retiros Pendientes */}
      {hasWithdrawAccess && (
        <Panel>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <FormTitle style={{ border: 'none', padding: 0 }}>Solicitudes de Retiro Fiduciario</FormTitle>
          </div>
          {withdrawals.length === 0 ? (
            <EmptyStateText>No hay solicitudes de retiro fiduciario pendientes.</EmptyStateText>
          ) : (
            <CustomTable>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Billetera ID</th>
                  <th>Monto Solicitado</th>
                  <th>Exit Fee (DOMI)</th>
                  <th>Neto Recibido</th>
                  <th>Método</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((req) => {
                  const neto = req.amount_cop - (req.wompi_fee_cop || 0);
                  const isWompi = req.dispersion_method !== 'efectivo_casa_matriz';
                  return (
                    <tr key={req.id}>
                      <td>#{req.id}</td>
                      <td>{req.wallet_id} ({req.owner_type} #{req.owner_id})</td>
                      <td>{parseFloat(req.amount_domis).toLocaleString('es-CO')} DOMI</td>
                      <td>{parseFloat(req.exit_fee_domis).toLocaleString('es-CO')} DOMI</td>
                      <td style={{ fontWeight: 700 }}>
                        ${parseFloat(req.amount_cop).toLocaleString('es-CO')} COP
                      </td>
                      <td>
                        <Badge $color={isWompi ? 'blue' : 'yellow'}>
                          {isWompi ? 'Digital Wompi' : 'Efectivo Matriz'}
                        </Badge>
                      </td>
                      <td>
                        <Badge $color={req.status === 'en_cooldown' ? 'yellow' : 'blue'}>
                          {req.status}
                        </Badge>
                      </td>
                      <td>
                        <ActionButton
                          $variant="primary"
                          onClick={() => {
                            setActiveWithdrawal(req);
                            setWithdrawalAction('approve');
                          }}
                        >
                          Procesar
                        </ActionButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </CustomTable>
          )}
        </Panel>
      )}

      {/* Modal: Procesar Retiro */}
      {activeWithdrawal && (
        <ModalBackdrop onClick={() => setActiveWithdrawal(null)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Procesar Solicitud de Retiro #{activeWithdrawal.id}</h3>
            </ModalHeader>
            <form onSubmit={handleProcessWithdrawal}>
              <ModalBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <strong>Monto Fiduciario:</strong> ${parseFloat(activeWithdrawal.amount_cop).toLocaleString('es-CO')} COP
                  </div>
                  <div>
                    <strong>Destino de Dispersión:</strong> {activeWithdrawal.dispersion_method?.replace('wompi_', 'Wompi ').toUpperCase()}
                  </div>
                  <FormGroup>
                    <FormLabel>Acción a Tomar</FormLabel>
                    <SelectInput
                      value={withdrawalAction}
                      onChange={(e) => setWithdrawalAction(e.target.value as 'approve' | 'reject')}
                    >
                      <option value="approve">Aprobar y Dispersar fondos</option>
                      <option value="reject">Rechazar y Devolver Tokens</option>
                    </SelectInput>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Notas / Motivo de Rechazo</FormLabel>
                    <FormInput
                      type="text"
                      placeholder="Ej: Consignación manual completada o Motivo de rechazo"
                      value={withdrawalNotes}
                      onChange={(e) => setWithdrawalNotes(e.target.value)}
                      required={withdrawalAction === 'reject'}
                    />
                  </FormGroup>
                </div>
              </ModalBody>
              <ModalFooter>
                <CancelBtn type="button" onClick={() => setActiveWithdrawal(null)}>
                  Cancelar
                </CancelBtn>
                <SubmitBtn type="submit" disabled={submittingWithdrawal}>
                  {submittingWithdrawal ? 'Procesando...' : 'Aplicar'}
                </SubmitBtn>
              </ModalFooter>
            </form>
          </ModalCard>
        </ModalBackdrop>
      )}
    </Container>
  );
}
