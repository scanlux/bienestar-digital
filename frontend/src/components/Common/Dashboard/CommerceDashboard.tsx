'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { getFullImageUrl } from '@/utils';
import { SedesManagementModal } from '@/components/Common/SedesManagementModal';
import { TransitionShield } from '@/components/Common/UIElements';
import { SedeEstadoBadge, StoreAvailabilityBadge } from '@/components/Common/StoreHeroStyles';
import { KpiCard } from '@/components/Common/Dashboard/KpiCard';
import { EmptyState } from '@/components/Common/EmptyState';
import { CurrencyFormatter } from '@/components/Common/CurrencyFormatter';
import {
  Container,
  MainGrid,
  Panel,
  PanelTabs,
  Tab,
  PanelContent,
  OrderList,
  OrderItem,
  ActionButtonStyle,
  SelectorGroup,
  SelectPremium,
  InputPremium,
  LoadingState,
  Spinner,
  BalanceContainer,
  BalanceValueRow,
  BalanceValue,
  BalanceEquivalent,
  EyeButton,
  WalletKpiCard,
  DashboardKpiGrid,
  CommerceHeroCard,
  CommerceInfoContainer,
  VerPerfilButton,
  StoreHeroCard,
  CollapsibleContainer,
  CollapsibleInner,
  ExtendedDetailsGrid,
  StepperContainer,
  StepperWrapper,
  StepperLine,
  StepNode,
  ConfiguracionKpiCard,
} from '@/components/Common/Dashboard/CommerceDashboardStyles';

import { OrderCard } from '@/components/Common/Dashboard/OrderCard';
import { Order } from '@/types/orders';

// ---- Interfaces ----

interface Store {
  id: number;
  nombre_sucursal: string;
  direccion: string;
  estado: 'operativo' | 'mantenimiento' | 'vacaciones' | 'no_disponible' | 'remodelacion';
  acceptance_mode: 'automatico' | 'manual';
  image_url?: string;
  telefono?: string;
  matricula?: string;
  ciudad?: string;
  fecha_regreso?: string;
  schedule?: any[];
  is_currently_open?: boolean;
}

// ---- Helpers ----

const formatCOP = (value: number) => {
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
  return `${formatted} COP`;
};


// ---- Component ----

export function CommerceDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { showConfirm } = useAlert();

  // Role detection
  const isStoreAdmin = user?.adminType === 'store';
  const assignedStoreIds: number[] = user?.storeIds ?? [];

  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [commerceDetails, setCommerceDetails] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'prep' | 'history'>('prep');
  const [selectedConfigStoreId, setSelectedConfigStoreId] = useState<number | null>(null);
  const [isStoreSelectModalOpen, setIsStoreSelectModalOpen] = useState(false);
  const [togglingAcceptance, setTogglingAcceptance] = useState(false);
  const [updatingStoreStatus, setUpdatingStoreStatus] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fiatPeg, setFiatPeg] = useState<number>(400);
  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('domi_hide_balance');
      return stored === 'true';
    }
    return false;
  });

  const toggleHideBalance = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHideBalance(prev => {
      const next = !prev;
      localStorage.setItem('domi_hide_balance', String(next));
      return next;
    });
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Obtener sedes
      const storesRes = await axios.get(`${API_URL}/api/manage/my-stores`, { headers });
      let storesData: Store[] = storesRes.data;

      // Filtrar por storeIds asignados si es admin de sede
      if (isStoreAdmin && assignedStoreIds.length > 0) {
        storesData = storesData.filter(s => assignedStoreIds.includes(s.id));
      }
      setStores(storesData);

      if (storesData.length > 0 && selectedConfigStoreId === null) {
        setSelectedConfigStoreId(storesData[0].id);
      }

      // 2. Obtener pedidos
      const ordersRes = await axios.get(`${API_URL}/api/manage/orders`, { headers });
      let ordersData: Order[] = ordersRes.data;

      // Filtrar pedidos por storeIds asignados si es admin de sede
      if (isStoreAdmin && assignedStoreIds.length > 0) {
        ordersData = ordersData.filter(o => assignedStoreIds.includes(o.store_id));
      }
      setOrders(ordersData);

      // 3. Obtener productos
      if (user?.commerceId) {
        try {
          const productsRes = await axios.get(`${API_URL}/api/manage/products?commerceId=${user.commerceId}`, { headers });
          setProductsCount(productsRes.data.length);
        } catch {
          setProductsCount(0);
        }
      }

      // 4. Obtener saldo de billetera
      if (isStoreAdmin && assignedStoreIds.length > 0) {
        // Admin de sede: usa la billetera de la primera sede asignada
        try {
          const walletRes = await axios.get(`${API_URL}/api/domi/wallet/store/${assignedStoreIds[0]}`, { headers });
          setWalletBalance(parseFloat(walletRes.data.balance_custody) || 0);
        } catch {
          setWalletBalance(0);
        }
      } else if (user?.commerceId) {
        // Admin de comercio: usa la billetera del comercio
        try {
          const walletRes = await axios.get(`${API_URL}/api/domi/wallet/commerce/${user.commerceId}`, { headers });
          setWalletBalance(parseFloat(walletRes.data.balance_custody) || 0);
        } catch {
          setWalletBalance(0);
        }
      }

      // 4.5. Obtener peg del token
      try {
        const tokenRes = await axios.get(`${API_URL}/api/domi/token`);
        setFiatPeg(parseFloat(tokenRes.data.fiat_peg_cop) || 400);
      } catch {
        setFiatPeg(400);
      }

      // 5. Obtener detalles del comercio (solo para commerce admin)
      if (!isStoreAdmin && user?.commerceId) {
        try {
          const commerceRes = await axios.get(`${API_URL}/api/manage/commerces/${user.commerceId}`, { headers });
          setCommerceDetails(commerceRes.data);
        } catch (err) {
          console.error('Error fetching commerce details:', err);
        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const handleManageSedesClick = () => {
    if (stores.length === 1) {
      setIsNavigating(true);
      router.push(`/commerce/stores/${stores[0].id}`);
    } else if (stores.length > 1) {
      setIsStoreSelectModalOpen(true);
    }
  };

  const handleUpdateOrderStatus = (orderId: number, nextStatus: 'preparando' | 'listo') => {
    let confirmMsg = '';
    let confirmBtn = 'Aceptar';

    if (nextStatus === 'preparando') {
      confirmMsg = '¿Deseas aceptar este pedido e iniciar la preparación?';
      confirmBtn = 'Aceptar Pedido';
    } else if (nextStatus === 'listo') {
      confirmMsg = '¿Marcar pedido como listo y empacado para que lo retire el repartidor?';
      confirmBtn = 'Marcar Listo';
    }

    const proceed = async () => {
      setProcessingOrderId(orderId);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const payload: any = { status: nextStatus };
        await axios.patch(`${API_URL}/api/manage/orders/${orderId}/status`, payload, { headers });
        toast.success(`Pedido actualizado con éxito.`);
        fetchData();
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.error || 'Error al actualizar pedido.');
      } finally {
        setProcessingOrderId(null);
      }
    };

    if (confirmMsg) {
      showConfirm({
        title: 'Confirmar Actualizacion de Pedido',
        message: confirmMsg,
        confirmText: confirmBtn,
        cancelText: 'Cancelar',
        onConfirm: proceed
      });
    } else {
      proceed();
    }
  };

  const handleConfirmRejectionDirect = async (orderId: number, reason: string) => {
    setProcessingOrderId(orderId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = { status: 'cancelado', observation: reason };
      await axios.patch(`${API_URL}/api/manage/orders/${orderId}/status`, payload, { headers });
      toast.success(`Pedido rechazado con éxito.`);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al rechazar el pedido.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleInformar = async (orderId: number, agotadosItemIds: number[]) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/manage/orders/${orderId}/notify-unavailable`, { agotados: agotadosItemIds }, { headers });
      toast.success('Cliente notificado sobre productos agotados.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al notificar al cliente.');
      throw err;
    }
  };

  const handleToggleAcceptanceMode = async (storeId: number, currentMode: 'automatico' | 'manual') => {
    const nextMode = currentMode === 'automatico' ? 'manual' : 'automatico';
    setTogglingAcceptance(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`${API_URL}/api/manage/stores/${storeId}/order-acceptance`, { acceptanceMode: nextMode }, { headers });
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, acceptance_mode: nextMode } : s));
      toast.success(`Aceptación configurada en: ${nextMode.toUpperCase()}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al cambiar modo de aceptación.');
    } finally {
      setTogglingAcceptance(false);
    }
  };

  const handleUpdateStoreStatus = async (storeId: number, newStatus: string, customFecha: string | null = null) => {
    setUpdatingStoreStatus(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload: any = { estado: newStatus };
      if (newStatus !== 'operativo') {
        const currentStore = stores.find(s => s.id === storeId);
        payload.fecha_regreso = customFecha !== null ? customFecha : (currentStore?.fecha_regreso || null);
      }
      await axios.patch(`${API_URL}/api/manage/stores/${storeId}/status`, payload, { headers });
      toast.success('Estado de la sede actualizado con éxito.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message;
      if (errMsg.includes('Límite de sedes operativas alcanzado')) {
        showConfirm({
          title: 'Límite de Sedes Alcanzado',
          message: `${errMsg}\n\n¿Deseas ir al Mercado de Mejoras ahora mismo para adquirir un buff?`,
          confirmText: 'Ir al Mercado',
          cancelText: 'Cerrar',
          onConfirm: () => {
            router.push('/commerce/upgrades?highlight=adicionar_sede');
          }
        });
      } else {
        toast.error(errMsg || 'Error al actualizar el estado de la sede.');
      }
    } finally {
      setUpdatingStoreStatus(false);
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

  // KPI calculations
  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.estado === 'operativo').length;
  const pendingOrders = orders.filter(o => o.status === 'pendiente');
  const preparingOrders = orders.filter(o => o.status === 'preparando');
  const activeDashboardOrders = orders
    .filter(o => ['pendiente', 'preparando', 'listo'].includes(o.status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const historyOrders = orders
    .filter(o => ['listo_despacho', 'en_camino', 'entregado', 'cancelado'].includes(o.status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const selectedStoreObject = stores.find(s => s.id === selectedConfigStoreId);

  // For store admin hero: use the first assigned store
  const primaryStore = isStoreAdmin && stores.length > 0 ? stores[0] : null;

  // Formatear horario de hoy
  const todayScheduleStr = (() => {
    if (!primaryStore || !primaryStore.schedule || !Array.isArray(primaryStore.schedule)) return '';
    const nowBogotaStr = new Date().toLocaleString("en-US", { timeZone: "America/Bogota" });
    const currentDay = new Date(nowBogotaStr).getDay();
    const todaySchedule = primaryStore.schedule.find((s: any) => s.day_index === currentDay);

    if (!todaySchedule) return '';
    if (todaySchedule.status !== 'abierto') return 'Cerrado hoy';
    if (todaySchedule.is_24h) return '24 Horas';
    if (todaySchedule.open_time && todaySchedule.close_time) {
      const formatTimeShort = (timeStr: string) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        return `${parts[0]}:${parts[1]}`;
      };
      return `HORA E: ${formatTimeShort(todaySchedule.open_time)} - S: ${formatTimeShort(todaySchedule.close_time)}`;
    }
    return '';
  })();

  return (
    <Container>
      {/* Hero Card - Commerce Admin */}
      {!isStoreAdmin && commerceDetails && (
        <CommerceHeroCard $bgImage={commerceDetails.logo_url ? getFullImageUrl(commerceDetails.logo_url) : undefined}>
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="hero-left">
              <div className="logo-container">
                {commerceDetails.logo_url ? (
                  <img src={getFullImageUrl(commerceDetails.logo_url)} alt="Logo" />
                ) : (
                  <span>{commerceDetails.nombre?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="hero-details">
                <h1 className="commerce-name">{commerceDetails.nombre}</h1>
                <span className="commerce-nit">
                  NIT: {commerceDetails.nit}{commerceDetails.nit_dv ? `-${commerceDetails.nit_dv}` : ''}
                </span>
                {commerceDetails.descripcion && (
                  <p className="commerce-desc">{commerceDetails.descripcion}</p>
                )}
                <VerPerfilButton onClick={() => router.push('/commerce/profile')}>
                  Ver Perfil
                </VerPerfilButton>
              </div>
            </div>

            <div className="hero-right">
              <CommerceInfoContainer>
                <div className="info-item">
                  <span className="info-label">Teléfono</span>
                  <span className="info-value">{commerceDetails.telefono || 'No registrado'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Dirección</span>
                  <span className="info-value">{commerceDetails.direccion || 'No registrada'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ciudad</span>
                  <span className="info-value">{commerceDetails.ciudad || 'No registrada'}</span>
                </div>
              </CommerceInfoContainer>
            </div>
          </div>
        </CommerceHeroCard>
      )}

      {isStoreAdmin && primaryStore && (
        <StoreHeroCard 
          $bgImage={primaryStore.image_url ? getFullImageUrl(primaryStore.image_url) : undefined}
          $estado={primaryStore.estado}
        >
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="hero-left">
              <div className="logo-container">
                {primaryStore.image_url ? (
                  <img src={getFullImageUrl(primaryStore.image_url)} alt="Logo" />
                ) : (
                  <span>{primaryStore.nombre_sucursal?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="hero-details">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h1 className="store-name" style={{ margin: 0 }}>{primaryStore.nombre_sucursal}</h1>
                  <div 
                    onClick={() => router.push(`/commerce/stores/${primaryStore.id}/profile?tab=hours`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                    title="Configurar horarios operativos de la sede"
                    className="hover-opacity"
                  >
                    <StoreAvailabilityBadge store={primaryStore} />
                    {todayScheduleStr && (
                      <span style={{ 
                        fontSize: '0.8rem', 
                        color: '#a3a3a3', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontWeight: 600,
                        letterSpacing: '0.5px'
                      }}>
                        {todayScheduleStr}
                      </span>
                    )}
                  </div>
                </div>
                <span className="store-nit">
                  Matrícula: {primaryStore.matricula || 'No registrada'}
                </span>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginTop: '12px', flexWrap: 'wrap' }}>
                  <SelectorGroup style={{ width: '220px', marginTop: 0 }}>
                    <label style={{ fontSize: '0.7rem', userSelect: 'none' }}>&nbsp;</label>
                    <SelectPremium
                      value={primaryStore.estado}
                      $estado={primaryStore.estado}
                      disabled={updatingStoreStatus}
                      onChange={(e) => handleUpdateStoreStatus(primaryStore.id, e.target.value)}
                    >
                      <option value="operativo">Operativo</option>
                      <option value="mantenimiento">En Mantenimiento</option>
                      <option value="vacaciones">Vacaciones</option>
                      <option value="no_disponible">No disponible</option>
                    </SelectPremium>
                  </SelectorGroup>
                  {primaryStore.estado !== 'operativo' && (
                    <SelectorGroup style={{ width: '220px', marginTop: 0 }}>
                      <label style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)' }}>Fecha de regreso</label>
                      <InputPremium
                        type="date"
                        value={primaryStore.fecha_regreso ? primaryStore.fecha_regreso.split('T')[0] : ''}
                        $estado={primaryStore.estado}
                        disabled={updatingStoreStatus}
                        onChange={(e) => handleUpdateStoreStatus(primaryStore.id, primaryStore.estado, e.target.value)}
                      />
                    </SelectorGroup>
                  )}
                </div>
              </div>
            </div>

            <div className="hero-right">
              <CommerceInfoContainer>
                <div className="info-item">
                  <span className="info-label">Teléfono</span>
                  <span className="info-value">{primaryStore.telefono || 'No registrado'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Dirección</span>
                  <span className="info-value">{primaryStore.direccion || 'No registrada'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ciudad</span>
                  <span className="info-value">{primaryStore.ciudad || 'Bogotá'}</span>
                </div>
              </CommerceInfoContainer>
            </div>
          </div>
        </StoreHeroCard>
      )}

      {/* KPI Grid */}
      <DashboardKpiGrid $cols={4}>
        {/* Tarjeta de Sedes Activas - Sólo para Comercio Admin */}
        {!isStoreAdmin && (
          <KpiCard
            icon="🏪"
            label="Sedes Activas"
            value={`${activeStores}/${totalStores}`}
            onClick={handleManageSedesClick}
          />
        )}

        {/* Tarjeta de Configuración de Aceptación - Sólo para Sede Admin (Reemplaza a Sedes Activas) */}
        {isStoreAdmin && primaryStore && (
          <ConfiguracionKpiCard $isActive={primaryStore.acceptance_mode === 'automatico'}>
            {/* Tuerquita en la esquina */}
            <div
              className="card-settings-gear"
              onClick={() => {
                setIsNavigating(true);
                router.push(`/commerce/stores/${primaryStore.id}/profile`);
              }}
              title="Ajustes de Sede"
            >
              <svg
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            {/* Logo de encendido IEC 60417-5009 clickable */}
            <div
              className="icon"
              onClick={() => !togglingAcceptance && handleToggleAcceptanceMode(primaryStore.id, primaryStore.acceptance_mode)}
              title="Alternar Aceptación Automática"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: '22px', height: '22px' }}
              >
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </div>

            <div className="config-data">
              <span className="label">Aceptación de Pedidos</span>
              <div className="controls">
                <div className="toggle-row">
                  <span>
                    Modo: <strong className={primaryStore.acceptance_mode === 'manual' ? 'manual' : ''}>
                      {primaryStore.acceptance_mode === 'automatico' ? 'AUTO' : 'MANUAL'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </ConfiguracionKpiCard>
        )}

        <KpiCard
          icon="🥡"
          label="Pedidos Pendientes"
          value={pendingOrders.length}
          accent={true}
          pulse={pendingOrders.length > 0 ? 'red' : undefined}
          tag={pendingOrders.length > 0 ? 'POR ACEPTAR' : undefined}
          tagVariant="error"
        />

        <KpiCard
          icon="🍳"
          label="Pedidos Marchando"
          value={preparingOrders.length}
          accent={true}
          pulse={preparingOrders.length > 0 ? 'green' : undefined}
          tag={preparingOrders.length > 0 ? 'PREPARANDO' : undefined}
          tagVariant="info"
        />



        <WalletKpiCard
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--emerald, #10b981)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
              <path d="M21 12V7H5a2 2 0 0 1-2-2c0-1.1.9-2 2-2h16v3" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-4" />
              <path d="M19 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6z" />
            </svg>
          }
          label="Saldo en Domis"
          onClick={() => {
            setIsNavigating(true);
            router.push('/commerce/wallet');
          }}
          value={
            <BalanceContainer>
              <BalanceValueRow>
                <BalanceValue>
                  {hideBalance ? '****' : <CurrencyFormatter value={walletBalance} symbol="Ð" />}
                </BalanceValue>
                <EyeButton onClick={toggleHideBalance} title={hideBalance ? 'Mostrar saldo' : 'Ocultar saldo'}>
                  {hideBalance ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </EyeButton>
              </BalanceValueRow>
              <BalanceEquivalent>
                {hideBalance ? '****' : <CurrencyFormatter value={walletBalance * fiatPeg} prefix="$" symbol="COP" decimals={0} />}
              </BalanceEquivalent>
            </BalanceContainer>
          }
        />
      </DashboardKpiGrid>

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
            {activeTab === 'prep' && (
              <OrderList>
                {activeDashboardOrders.length === 0 ? (
                  <EmptyState
                    icon="✔"
                    message="No hay pedidos en preparación en este momento."
                  />
                ) : (
                  activeDashboardOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isExpanded={expandedOrderId === order.id}
                      onToggleExpand={(id) => setExpandedOrderId(expandedOrderId === id ? null : id)}
                      mode={{
                        type: 'commerce-active',
                        onStatusChange: handleUpdateOrderStatus,
                        onInformar: handleInformar,
                        onReject: handleConfirmRejectionDirect,
                        processingOrderId
                      }}
                    />
                  ))
                )}
              </OrderList>
            )}

            {activeTab === 'history' && (
              <OrderList>
                {historyOrders.length === 0 ? (
                  <EmptyState message="No se registran pedidos procesados hoy." />
                ) : (
                  historyOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isExpanded={expandedOrderId === order.id}
                      onToggleExpand={(id) => setExpandedOrderId(expandedOrderId === id ? null : id)}
                      mode={{
                        type: 'commerce-history'
                      }}
                    />
                  ))
                )}
              </OrderList>
            )}
          </PanelContent>
        </Panel>

      </MainGrid>

      {/* Modal de selección de sede */}
      <SedesManagementModal
        isOpen={isStoreSelectModalOpen}
        onClose={() => setIsStoreSelectModalOpen(false)}
        selectedCommerce={{ nombre: user?.nombre || 'Mi Comercio' }}
        sedes={stores}
        onSelectSede={(sedeId) => {
          setIsStoreSelectModalOpen(false);
          setIsNavigating(true);
          router.push(`/commerce/stores/${sedeId}`);
        }}
      />
      {isNavigating && <TransitionShield message="Cargando panel de la sede..." />}
    </Container>
  );
}
