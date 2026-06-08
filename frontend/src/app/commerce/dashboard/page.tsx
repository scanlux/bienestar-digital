'use client';

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';
import { useToast } from '@/context/ToastContext';
import { getFullImageUrl } from '@/utils';
import { SedesManagementModal } from '@/app/admin/dashboard/commerce/components/SedesManagementModal';

interface Store {
  id: number;
  nombre_sucursal: string;
  direccion: string;
  estado: 'activo' | 'inactivo';
  acceptance_mode: 'automatico' | 'manual';
  image_url?: string;
}

interface Order {
  id: number;
  store_id: number;
  store_name: string;
  customer_user_id: number;
  customer_nombres: string;
  customer_apellidos: string;
  total_cop: number;
  domi_cost: number;
  status: 'pendiente' | 'preparando' | 'listo_para_envio' | 'en_camino' | 'entregado' | 'cancelado';
  delivery_address: string;
  notes: string;
  created_at: string;
}

export default function CommerceDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  
  // Dashboard states
  const [activeTab, setActiveTab] = useState<'prep' | 'history'>('prep');
  const [selectedConfigStoreId, setSelectedConfigStoreId] = useState<number | null>(null);
  const [isStoreSelectModalOpen, setIsStoreSelectModalOpen] = useState(false);
  const [togglingAcceptance, setTogglingAcceptance] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // 1. Obtener sedes
      const storesRes = await axios.get(`${API_URL}/api/manage/my-stores`, { headers });
      const storesData: Store[] = storesRes.data;
      setStores(storesData);
      
      // Seleccionar la primera sede por defecto para la configuración lateral
      if (storesData.length > 0 && selectedConfigStoreId === null) {
        setSelectedConfigStoreId(storesData[0].id);
      }

      // 2. Obtener pedidos
      const ordersRes = await axios.get(`${API_URL}/api/manage/orders`, { headers });
      setOrders(ordersRes.data);

      // 3. Obtener productos
      if (user?.commerceId) {
        const productsRes = await axios.get(`${API_URL}/api/manage/products?commerceId=${user.commerceId}`, { headers });
        setProductsCount(productsRes.data.length);
      }
    } catch (error) {
      console.error('Error fetching commerce dashboard data:', error);
      toast.error('Error al sincronizar datos del comercio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, user]);

  const handleManageSedesClick = () => {
    if (stores.length === 1) {
      router.push(`/commerce/stores/${stores[0].id}`);
    } else if (stores.length > 1) {
      setIsStoreSelectModalOpen(true);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, nextStatus: 'preparando' | 'listo_para_envio' | 'cancelado') => {
    let confirmMsg = '';
    if (nextStatus === 'cancelado') {
      confirmMsg = '¿Estás seguro de que deseas rechazar este pedido?';
    } else if (nextStatus === 'preparando') {
      confirmMsg = '¿Deseas aceptar este pedido e iniciar la preparación?';
    } else if (nextStatus === 'listo_para_envio') {
      confirmMsg = '¿Marcar pedido como listo para que lo retire el repartidor?';
    }

    if (confirmMsg && !confirm(confirmMsg)) return;

    setProcessingOrderId(orderId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/api/manage/orders/${orderId}/status`, { status: nextStatus }, { headers });
      toast.success(`Pedido actualizado con éxito.`);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al actualizar pedido.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleToggleAcceptanceMode = async (storeId: number, currentMode: 'automatico' | 'manual') => {
    const nextMode = currentMode === 'automatico' ? 'manual' : 'automatico';
    setTogglingAcceptance(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/api/manage/stores/${storeId}/order-acceptance`, { acceptanceMode: nextMode }, { headers });
      
      // Actualizar estado local
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, acceptance_mode: nextMode } : s));
      toast.success(`Aceptación configurada en: ${nextMode.toUpperCase()}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al cambiar modo de aceptación.');
    } finally {
      setTogglingAcceptance(false);
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Sincronizando con el servidor del comercio...</p>
      </LoadingState>
    );
  }

  // Cálculos de KPI
  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.estado === 'activo').length;
  
  const pendingOrders = orders.filter(o => o.status === 'pendiente');
  const preparingOrders = orders.filter(o => o.status === 'preparando');
  
  // Pedidos del control de preparación (Pendientes y en Preparación)
  const activeDashboardOrders = orders.filter(o => o.status === 'pendiente' || o.status === 'preparando');
  
  // Historial/Trazabilidad (Listo para envío, en camino, entregados, cancelados)
  const historyOrders = orders.filter(o => o.status !== 'pendiente' && o.status !== 'preparando');

  const selectedStoreObject = stores.find(s => s.id === selectedConfigStoreId);

  return (
    <Container>
      <HeaderSection>
        <div className="title-group">
          <p className="subtitle">Comercio: {user?.nombre || 'Mi Restaurante'} —</p>
          <h1 className="title">Estado del Comercio</h1>
        </div>
        <div className="time-badge">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </HeaderSection>

      {/* KPI Grid */}
      <KpiGrid>
        <KpiCard className="interactive" onClick={handleManageSedesClick}>
          <div className="icon">🏪</div>
          <div className="data">
            <span className="label">Sedes Activas</span>
            <span className="value">{activeStores}/{totalStores}</span>
          </div>
          <div className="tag-click">CONFIGURAR</div>
        </KpiCard>

        <KpiCard className="accent red-pulse">
          <div className="icon">🥡</div>
          <div className="data">
            <span className="label">Pedidos Pendientes</span>
            <span className="value">{pendingOrders.length}</span>
          </div>
          {pendingOrders.length > 0 && <div className="tag">POR ACEPTAR</div>}
        </KpiCard>

        <KpiCard className="accent green-pulse">
          <div className="icon">🍳</div>
          <div className="data">
            <span className="label">Pedidos Marchando</span>
            <span className="value">{preparingOrders.length}</span>
          </div>
          {preparingOrders.length > 0 && <div className="tag info">PREPARANDO</div>}
        </KpiCard>

        <KpiCard>
          <div className="icon">🍔</div>
          <div className="data">
            <span className="label">Productos Activos</span>
            <span className="value">{productsCount}</span>
          </div>
        </KpiCard>
      </KpiGrid>

      <MainGrid>
        {/* Panel Izquierdo: Pedidos */}
        <Panel>
          <PanelTabs>
            <Tab 
              $active={activeTab === 'prep'} 
              onClick={() => setActiveTab('prep')}
            >
              Pedidos en Preparación
              {activeDashboardOrders.length > 0 && <span className="count">{activeDashboardOrders.length}</span>}
            </Tab>
            <Tab 
              $active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')}
            >
              Historial y Delivery
              {historyOrders.length > 0 && <span className="count secondary">{historyOrders.length}</span>}
            </Tab>
          </PanelTabs>

          <PanelContent>
            {activeTab === 'prep' ? (
              <OrderList>
                {activeDashboardOrders.length === 0 ? (
                  <EmptyState>
                    <span className="e-icon">✔</span>
                    <p>No hay pedidos en preparación en este momento.</p>
                  </EmptyState>
                ) : (
                  activeDashboardOrders.map((order) => (
                    <OrderItem key={order.id} className={order.status}>
                      <div className="order-details">
                        <div className="order-top-row">
                          <span className="order-id">Pedido #{order.id}</span>
                          <span className="order-store">{order.store_name}</span>
                          <span className="order-time">
                            {new Date(order.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="customer-info">
                          Cliente: {order.customer_nombres} {order.customer_apellidos} | Entregar en: {order.delivery_address}
                        </p>
                        {order.notes && <p className="order-notes">Notas: &quot;{order.notes}&quot;</p>}
                        <div className="order-price-row">
                          <span className="total-amount">Total: ${Number(order.total_cop).toLocaleString()}</span>
                          <span className="domi-cost">Costo Envío: ${Number(order.domi_cost).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="order-actions">
                        {order.status === 'pendiente' ? (
                          <>
                            <ActionButtonStyle 
                              $variant="approve"
                              onClick={() => handleUpdateOrderStatus(order.id, 'preparando')}
                              disabled={processingOrderId === order.id}
                            >
                              Aceptar
                            </ActionButtonStyle>
                            <ActionButtonStyle 
                              $variant="reject"
                              onClick={() => handleUpdateOrderStatus(order.id, 'cancelado')}
                              disabled={processingOrderId === order.id}
                            >
                              Rechazar
                            </ActionButtonStyle>
                          </>
                        ) : (
                          <ActionButtonStyle 
                            $variant="ready"
                            onClick={() => handleUpdateOrderStatus(order.id, 'listo_para_envio')}
                            disabled={processingOrderId === order.id}
                          >
                            Marcar Listo
                          </ActionButtonStyle>
                        )}
                      </div>
                    </OrderItem>
                  ))
                )}
              </OrderList>
            ) : (
              <OrderList>
                {historyOrders.length === 0 ? (
                  <EmptyState>
                    <p>No se registran pedidos procesados hoy.</p>
                  </EmptyState>
                ) : (
                  historyOrders.map((order) => (
                    <OrderItem key={order.id} className="history-item">
                      <div className="order-details">
                        <div className="order-top-row">
                          <span className="order-id">Pedido #{order.id}</span>
                          <span className="order-store">{order.store_name}</span>
                          <span className={`status-badge ${order.status}`}>
                            {order.status === 'listo_para_envio' && 'Listo para envío'}
                            {order.status === 'en_camino' && 'En Camino'}
                            {order.status === 'entregado' && 'Entregado'}
                            {order.status === 'cancelado' && 'Cancelado'}
                          </span>
                        </div>
                        <p className="customer-info">
                          Cliente: {order.customer_nombres} {order.customer_apellidos}
                        </p>
                        <p className="order-address">Destino: {order.delivery_address}</p>
                        <span className="total-amount">Total: ${Number(order.total_cop).toLocaleString()}</span>
                      </div>
                    </OrderItem>
                  ))
                )}
              </OrderList>
            )}
          </PanelContent>
        </Panel>

        {/* Panel Derecho: Vitrina & Modo de Aceptación */}
        <SidebarTools>
          <ToolBox>
            <h3>Configuración Rápida</h3>
            
            <SelectorGroup>
              <label htmlFor="store-config-select">Configurar Sede:</label>
              <SelectPremium 
                id="store-config-select"
                value={selectedConfigStoreId || ''} 
                onChange={(e) => setSelectedConfigStoreId(Number(e.target.value))}
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre_sucursal}</option>
                ))}
              </SelectPremium>
            </SelectorGroup>

            {selectedStoreObject && (
              <VitrinaGradientBox>
                <VitrinaInnerBox>
                  <VitrinaImageWrapper>
                    <VitrinaImage 
                      src={selectedStoreObject.image_url ? getFullImageUrl(selectedStoreObject.image_url) : "https://picsum.photos/seed/burger/400/400"} 
                      alt={selectedStoreObject.nombre_sucursal} 
                    />
                    <VitrinaOverlayText>
                      <span>{selectedStoreObject.nombre_sucursal}</span>
                    </VitrinaOverlayText>
                  </VitrinaImageWrapper>
                  
                  <AcceptanceToggleGroup>
                    <div className="toggle-text">
                      <span className="toggle-title">Aceptación de Pedidos</span>
                      <span className="toggle-subtitle">
                        Modo actual: <strong>{selectedStoreObject.acceptance_mode === 'automatico' ? 'AUTOMÁTICO' : 'MANUAL'}</strong>
                      </span>
                    </div>

                    <ToggleContainer>
                      <input 
                        type="checkbox" 
                        id="acceptance-toggle"
                        checked={selectedStoreObject.acceptance_mode === 'automatico'}
                        disabled={togglingAcceptance}
                        onChange={() => handleToggleAcceptanceMode(selectedStoreObject.id, selectedStoreObject.acceptance_mode)}
                      />
                      <label htmlFor="acceptance-toggle" />
                    </ToggleContainer>
                  </AcceptanceToggleGroup>
                </VitrinaInnerBox>
              </VitrinaGradientBox>
            )}
          </ToolBox>

          <StatusBox>
             <div className="st-head">
                <span className="dot" />
                <h4>Canal de Telemetría</h4>
             </div>
             <p>Conexión directa activa con el Servidor de Medios y geolocalización de repartidores.</p>
          </StatusBox>
        </SidebarTools>
      </MainGrid>

      {/* Modal de selección de sede compacta */}
      <SedesManagementModal
        isOpen={isStoreSelectModalOpen}
        onClose={() => setIsStoreSelectModalOpen(false)}
        selectedCommerce={{ nombre: user?.nombre || 'Mi Comercio' }}
        sedes={stores}
        onSelectSede={(sedeId) => {
          setIsStoreSelectModalOpen(false);
          router.push(`/commerce/stores/${sedeId}`);
        }}
      />
    </Container>
  );
}

// ------------- ANIMACIONES NATIVAS CSS -------------
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGreen = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

const pulseRed = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 95, 95, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(255, 95, 95, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 95, 95, 0); }
`;

// ------------- STYLED COMPONENTS -------------
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: ${fadeIn} 0.5s ease-out forwards;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;

  .subtitle {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 6px;
  }
  .title {
    font-size: 2.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.6) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .time-badge {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 8px 16px;
    border-radius: 100px;
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: capitalize;
  }
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
`;

const KpiCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 24px;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.2s ease;

  &.interactive {
    cursor: pointer;
    &:hover {
      background: rgba(16, 185, 129, 0.04);
      border-color: rgba(16, 185, 129, 0.25);
      transform: translateY(-2px);
    }
  }

  &.accent {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: rgba(16, 185, 129, 0.15);
    .icon { color: var(--emerald); background: rgba(16, 185, 129, 0.1); }
  }

  &.red-pulse {
    border-color: rgba(255, 95, 95, 0.2);
    animation: ${pulseRed} 2s infinite;
    .icon { color: #ff5f5f; background: rgba(255, 95, 95, 0.1); }
  }

  &.green-pulse {
    border-color: rgba(16, 185, 129, 0.2);
    animation: ${pulseGreen} 2s infinite;
  }

  .icon {
    width: 52px;
    height: 52px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .data {
    display: flex;
    flex-direction: column;
    .label { font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.3); text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 1.75rem; font-weight: 800; color: #fff; }
  }

  .tag {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 8px;
    font-weight: 900;
    padding: 4px 8px;
    background: #ff5f5f;
    color: #fff;
    border-radius: 6px;
    &.info {
      background: var(--emerald);
    }
  }

  .tag-click {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 8px;
    font-weight: 900;
    padding: 4px 8px;
    background: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
    border-radius: 6px;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

const Panel = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelTabs = styled.div`
  display: flex;
  gap: 32px;
  padding: 0 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

const Tab = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  padding: 24px 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${props => props.$active ? 'var(--emerald)' : 'rgba(255,255,255,0.3)'};
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: color 0.2s;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--emerald);
    border-radius: 10px;
    opacity: ${props => props.$active ? 1 : 0};
    transform: scaleX(${props => props.$active ? 1 : 0.5});
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .count {
    background: rgba(16, 185, 129, 0.1);
    color: var(--emerald);
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 6px;
    &.secondary {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.5);
    }
  }
`;

const PanelContent = styled.div`
  padding: 32px;
  min-height: 400px;
`;

const OrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const OrderItem = styled.div`
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.04);
  padding: 20px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  transition: all 0.2s;

  &.pendiente {
    border-left: 4px solid #ff5f5f;
    background: rgba(255, 95, 95, 0.01);
  }

  &.preparando {
    border-left: 4px solid var(--emerald);
    background: rgba(16, 185, 129, 0.01);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .order-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;

    .order-top-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;

      .order-id { font-size: 0.95rem; font-weight: 800; color: #fff; }
      .order-store { font-size: 0.75rem; color: #ff9e00; background: rgba(255, 165, 0, 0.08); padding: 2px 8px; border-radius: 6px; }
      .order-time { font-size: 0.75rem; color: rgba(255, 255, 255, 0.3); }
      
      .status-badge {
        font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px;
        &.listo_para_envio { background: rgba(16, 185, 129, 0.1); color: var(--emerald); }
        &.en_camino { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        &.entregado { background: rgba(72, 214, 76, 0.1); color: #48d64c; }
        &.cancelado { background: rgba(255, 95, 95, 0.1); color: #ff5f5f; }
      }
    }

    .customer-info { font-size: 0.82rem; color: rgba(255, 255, 255, 0.65); margin: 0; }
    .order-notes { font-size: 0.8rem; color: rgba(255, 255, 255, 0.4); font-style: italic; margin: 0; }
    
    .order-price-row {
      display: flex;
      gap: 16px;
      font-size: 0.85rem;
      margin-top: 4px;
      .total-amount { color: #fff; font-weight: 700; }
      .domi-cost { color: rgba(255, 255, 255, 0.4); }
    }
  }

  .order-actions {
    display: flex;
    gap: 8px;
  }
`;

const ActionButtonStyle = styled.button<{ $variant: 'approve' | 'reject' | 'ready' }>`
  background: ${props => {
    if (props.$variant === 'approve') return 'rgba(16, 185, 129, 0.1)';
    if (props.$variant === 'reject') return 'rgba(255, 95, 95, 0.08)';
    return 'rgba(72, 214, 76, 0.08)';
  }};
  color: ${props => {
    if (props.$variant === 'approve') return 'var(--emerald)';
    if (props.$variant === 'reject') return '#ff5f5f';
    return '#48d64c';
  }};
  border: 1px solid ${props => {
    if (props.$variant === 'approve') return 'rgba(16, 185, 129, 0.2)';
    if (props.$variant === 'reject') return 'rgba(255, 95, 95, 0.1)';
    return 'rgba(72, 214, 76, 0.2)';
  }};
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${props => {
      if (props.$variant === 'approve') return 'rgba(16, 185, 129, 0.18)';
      if (props.$variant === 'reject') return 'rgba(255, 95, 95, 0.15)';
      return 'rgba(72, 214, 76, 0.18)';
    }};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SidebarTools = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ToolBox = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 24px;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  h3 { font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
`;

const SelectorGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  label { font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: 600; }
`;

const SelectPremium = styled.select`
  appearance: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 10px 40px 10px 16px;
  border-radius: 10px;
  font-size: 0.9rem; font-weight: 600;
  outline: none; cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 14px top 50%;
  background-size: 10px auto;
  transition: all 0.2s;
  width: 100%;
  
  &:focus { border-color: var(--emerald); }
  option { background: #111; color: #fff; }
`;

const VitrinaGradientBox = styled.div`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 100%);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 18px;
  padding: 1px;
`;

const VitrinaInnerBox = styled.div`
  background: #0d0d0d;
  border-radius: 17px;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.01);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const VitrinaImageWrapper = styled.div`
  aspect-ratio: 1.5 / 1;
  border-radius: 12px;
  background-color: #1a1a1a;
  overflow: hidden;
  position: relative;
`;

const VitrinaImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  
  ${VitrinaImageWrapper}:hover & {
    transform: scale(1.05);
  }
`;

const VitrinaOverlayText = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 60%);
  display: flex;
  align-items: flex-end;
  padding: 1rem;
  
  span {
    font-size: 1rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
`;

const AcceptanceToggleGroup = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.03);

  .toggle-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    
    .toggle-title { font-size: 0.8rem; font-weight: 700; color: #fff; }
    .toggle-subtitle { font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); }
  }
`;

const ToggleContainer = styled.div`
  position: relative;
  width: 48px;
  height: 24px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
    
    &:checked + label {
      background: var(--emerald);
      &::after {
        left: 26px;
      }
    }
  }

  label {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #333;
    border-radius: 34px;
    transition: background 0.3s;
    
    &::after {
      content: "";
      position: absolute;
      height: 18px;
      width: 18px;
      left: 4px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: left 0.3s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
`;

const StatusBox = styled.div`
  background: rgba(16, 185, 129, 0.03);
  border: 1px solid rgba(16, 185, 129, 0.1);
  padding: 24px;
  border-radius: 28px;

  .st-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    .dot { width: 8px; height: 8px; background: var(--emerald); border-radius: 50%; box-shadow: 0 0 10px var(--emerald); }
    h4 { font-size: 0.85rem; font-weight: 700; color: #fff; }
  }
  p { font-size: 12px; color: rgba(255, 255, 255, 0.4); line-height: 1.6; margin: 0; }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
  p { font-size: 0.9rem; color: rgba(255, 255, 255, 0.3); font-weight: 600; }
`;

const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 2px solid rgba(16, 185, 129, 0.1);
  border-top-color: var(--emerald);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  .e-icon { font-size: 2rem; opacity: 0.1; }
  p { color: rgba(255, 255, 255, 0.2); font-size: 0.9rem; font-weight: 600; }
`;
