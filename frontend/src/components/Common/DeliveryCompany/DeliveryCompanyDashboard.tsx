import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { KpiCard } from '@/components/Common/Dashboard/KpiCard';
import { KpiGrid } from '@/components/Common/Dashboard/KpiGrid';
import { EmptyState } from '@/components/Common/EmptyState';
import { CurrencyFormatter } from '@/components/Common/CurrencyFormatter';
import { OrderCard } from '@/components/Common/Dashboard/OrderCard';
import { Order } from '@/types/orders';
import { AssignDriverModal } from '@/components/Common/DeliveryCompany/AssignDriverModal';
import {
  Container,
  HeaderSection,
  MainGrid,
  Panel,
  PanelTabs,
  Tab,
  PanelContent,
  ModalOverlay,
  ConfirmModalContainer,
} from '@/components/Common/DeliveryCompany/DeliveryCompanyStyles';
import { OrderList } from '@/components/Common/Dashboard/CommerceDashboardStyles';

interface DashboardStats {
  activeDrivers: number;
  completedDeliveriesToday: number;
  totalEarningsCopToday: number;
  availableOrdersCount: number;
}

export function DeliveryCompanyDashboard() {
  const { token, user } = useAuth();
  const toast = useToast();
  const { showConfirm } = useAlert();

  const [stats, setStats] = useState<DashboardStats>({
    activeDrivers: 0,
    completedDeliveriesToday: 0,
    totalEarningsCopToday: 0,
    availableOrdersCount: 0
  });

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Modales
  const [selectedOrderForAccept, setSelectedOrderForAccept] = useState<Order | null>(null);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<Order | null>(null);
  const [companyBalance, setCompanyBalance] = useState<number>(0);
  const [acceptingOrder, setAcceptingOrder] = useState(false);

  const deliveryCompanyId = user?.deliveryCompanyId || (user as any)?.delivery_company_id;

  const fetchStats = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/delivery-company/dashboard/stats`, { headers });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchAvailableOrders = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/delivery-company/orders/available`, { headers });
      setAvailableOrders(res.data);
    } catch (err) {
      console.error('Error fetching available orders:', err);
    }
  };

  const fetchHistoryOrders = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/delivery-company/orders/history?page=1`, { headers });
      setHistoryOrders(res.data);
    } catch (err) {
      console.error('Error fetching history orders:', err);
    }
  };

  const fetchCompanyBalance = async () => {
    if (!token || !deliveryCompanyId) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/domi/wallet/delivery_company/${deliveryCompanyId}`, { headers });
      setCompanyBalance(parseFloat(res.data.balance_custody) || 0);
    } catch (err) {
      console.error('Error fetching company balance:', err);
    }
  };

  const reloadData = async () => {
    await Promise.all([
      fetchStats(),
      fetchAvailableOrders(),
      fetchHistoryOrders(),
      fetchCompanyBalance()
    ]);
  };

  useEffect(() => {
    if (token) {
      reloadData().finally(() => setLoading(false));

      // Polling cada 30 segundos
      const interval = setInterval(() => {
        fetchStats();
        fetchAvailableOrders();
        fetchHistoryOrders();
      }, 30000);

      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, deliveryCompanyId]);

  const handleOpenAcceptModal = async (order: Order) => {
    setSelectedOrderForAccept(order);
    await fetchCompanyBalance();
  };

  const handleConfirmAcceptOrder = async () => {
    if (!selectedOrderForAccept || !token) return;
    setAcceptingOrder(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/delivery-company/orders/${selectedOrderForAccept.id}/accept`, {}, { headers });
      toast.success(res.data.message || 'Pedido aceptado exitosamente.');
      const acceptedOrder = selectedOrderForAccept;
      setSelectedOrderForAccept(null);
      await reloadData();
      
      // Abrir modal de asignación de repartidor de inmediato
      setSelectedOrderForAssign(acceptedOrder);
    } catch (err: any) {
      console.error('Error accepting order:', err);
      toast.error(err.response?.data?.error || 'Error al aceptar el pedido.');
    } finally {
      setAcceptingOrder(false);
    }
  };

  const handleAssignDriver = async (driverUserId: number) => {
    if (!selectedOrderForAssign || !token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        `${API_URL}/api/delivery-company/orders/${selectedOrderForAssign.id}/assign-driver`,
        { driverUserId },
        { headers }
      );
      toast.success(res.data.message || 'Repartidor asignado exitosamente.');
      setSelectedOrderForAssign(null);
      await reloadData();
    } catch (err: any) {
      console.error('Error assigning driver:', err);
      toast.error(err.response?.data?.error || 'Error al asignar el repartidor.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(59, 130, 246, 0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>Cargando panel de operaciones...</p>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    );
  }

  const commission = 0.75;
  const resultingBalance = companyBalance - commission;

  return (
    <Container>
      <HeaderSection>
        <div className="title-group">
          <p className="subtitle">Consola de Operaciones —</p>
          <h1 className="title">Panel de Control de Reparto</h1>
        </div>
        <div className="time-badge">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </HeaderSection>

      {/* KPI Grid */}
      <KpiGrid>
        <KpiCard
          icon="🛵"
          label="Repartidores en Ruta"
          value={stats.activeDrivers}
          accent={true}
          accentColor="blue"
          tag="ACTIVOS"
          tagVariant="blue"
        />

        <KpiCard
          icon="📦"
          label="Entregas Completadas"
          value={stats.completedDeliveriesToday}
        />

        <KpiCard
          icon="💵"
          label="Ingresos por Servicios"
          value={`$${stats.totalEarningsCopToday.toLocaleString('es-CO')}`}
        />

        <KpiCard
          icon="⏳"
          label="Servicios Pendientes"
          value={stats.availableOrdersCount}
          accent={stats.availableOrdersCount > 0}
          accentColor="error"
          tag={stats.availableOrdersCount > 0 ? "NUEVOS" : undefined}
          tagVariant="error"
        />
      </KpiGrid>

      <MainGrid>
        <Panel>
          <PanelTabs>
            <Tab
              $active={activeTab === 'available'}
              onClick={() => setActiveTab('available')}
            >
              Solicitudes Pendientes
              {availableOrders.length > 0 && <span className="count">{availableOrders.length}</span>}
            </Tab>
            <Tab
              $active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            >
              En Ruta / Historial
              {historyOrders.length > 0 && <span className="count secondary">{historyOrders.length}</span>}
            </Tab>
          </PanelTabs>

          <PanelContent>
            {activeTab === 'available' && (
              <OrderList>
                {availableOrders.length === 0 ? (
                  <EmptyState
                    icon="✔"
                    message="No hay solicitudes de envío pendientes en el sistema en este momento."
                  />
                ) : (
                  availableOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isExpanded={expandedOrderId === order.id}
                      onToggleExpand={(id) => setExpandedOrderId(expandedOrderId === id ? null : id)}
                      mode={{
                        type: 'delivery-available',
                        onAcceptDelivery: handleOpenAcceptModal
                      }}
                    />
                  ))
                )}
              </OrderList>
            )}

            {activeTab === 'history' && (
              <OrderList>
                {historyOrders.length === 0 ? (
                  <EmptyState
                    message="No has aceptado ningún pedido de reparto el día de hoy."
                  />
                ) : (
                  historyOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isExpanded={expandedOrderId === order.id}
                      onToggleExpand={(id) => setExpandedOrderId(expandedOrderId === id ? null : id)}
                      mode={{
                        type: 'delivery-history',
                        onAssignDriver: (o) => setSelectedOrderForAssign(o)
                      }}
                    />
                  ))
                )}
              </OrderList>
            )}
          </PanelContent>
        </Panel>
      </MainGrid>

      {/* Modal de confirmación de cobro de comisión de reparto */}
      {selectedOrderForAccept && (
        <ModalOverlay onClick={() => setSelectedOrderForAccept(null)}>
          <ConfirmModalContainer onClick={(e) => e.stopPropagation()}>
            <h2>Aceptar Solicitud de Envío #{selectedOrderForAccept.id}</h2>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: '1.5' }}>
              Al aceptar esta orden, tu empresa asume la responsabilidad del despacho. Se debitará el valor de la comisión de servicio del saldo corporativo.
            </p>

            <div className="modal-details">
              <div className="detail-row">
                <span>Comisión de Servicio:</span>
                <span className="highlight">
                  <CurrencyFormatter value={commission} symbol="Ð" /> (= $300 COP)
                </span>
              </div>
              <div className="detail-row">
                <span>Tu saldo actual:</span>
                <span className="highlight">
                  <CurrencyFormatter value={companyBalance} symbol="Ð" />
                </span>
              </div>
              <div className="detail-row">
                <span>Saldo resultante:</span>
                <span className={resultingBalance >= 0 ? "result-balance" : "highlight"} style={{ color: resultingBalance < 0 ? '#ff5f5f' : '' }}>
                  <CurrencyFormatter value={resultingBalance} symbol="Ð" />
                </span>
              </div>
            </div>

            {resultingBalance < 0 && (
              <p style={{ color: '#ff5f5f', fontSize: '0.82rem', fontWeight: 700, marginBottom: '20px' }}>
                ⚠️ Saldo insuficiente en la billetera corporativa de la empresa. Realiza una recarga antes de continuar.
              </p>
            )}

            <div className="modal-actions">
              <button className="cancel" onClick={() => setSelectedOrderForAccept(null)}>
                Cancelar
              </button>
              <button
                className="confirm"
                disabled={resultingBalance < 0 || acceptingOrder}
                onClick={handleConfirmAcceptOrder}
              >
                {acceptingOrder ? 'Aceptando...' : 'Confirmar y Aceptar'}
              </button>
            </div>
          </ConfirmModalContainer>
        </ModalOverlay>
      )}

      {/* Modal de asignación de repartidor */}
      {selectedOrderForAssign && (
        <AssignDriverModal
          isOpen={true}
          onClose={() => setSelectedOrderForAssign(null)}
          orderId={selectedOrderForAssign.id}
          onAssign={handleAssignDriver}
          token={token}
        />
      )}
    </Container>
  );
}
