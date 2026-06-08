'use client';

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
import { API_URL } from '@/constants';

interface Stats {
  activeCommerces: number;
  pendingRequests: number;
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
}

interface RegistrationRequest {
  id: number;
  tipo_solicitud: 'commerce' | 'delivery_company';
  nit: string;
  razon_social: string;
  email_contacto: string;
  nombres_contacto: string;
  apellidos_contacto: string;
  celular_contacto: string;
  created_at?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    activeCommerces: 0,
    pendingRequests: 0,
    totalStores: 0,
    totalProducts: 0,
    totalOrders: 0
  });
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'activity'>('requests');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      
      const [statsRes, requestsRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/stats`, { headers }),
        axios.get(`${API_URL}/api/manage/requests?estado=pendiente`, { headers })
      ]);

      setStats(statsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    const confirmMsg = action === 'approve' 
      ? '¿Estás seguro de que deseas aprobar esta solicitud? Se creará la cuenta y entidad correspondientes.' 
      : '¿Estás seguro de que deseas rechazar esta solicitud?';
    if (!confirm(confirmMsg)) return;

    setProcessingId(id);
    try {
      const headers = getAuthHeaders();
      if (action === 'approve') {
        await axios.post(`${API_URL}/api/manage/requests/${id}/approve`, {}, { headers });
      } else {
        await axios.post(`${API_URL}/api/manage/requests/${id}/reject`, { notas_system: 'Rechazado por administración matriz.' }, { headers });
      }
      alert(action === 'approve' ? 'Solicitud aprobada con éxito.' : 'Solicitud rechazada con éxito.');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al procesar la solicitud');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Sincronizando con el servidor...</p>
      </LoadingState>
    );
  }

  return (
    <Container>
      <HeaderSection>
        <div className="title-group">
          <p className="subtitle">Resumen General —</p>
          <h1 className="title">Estado de la Plataforma</h1>
        </div>
        <div className="time-badge">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </HeaderSection>

      {/* KPI Grid */}
      <KpiGrid>
        <KpiCard>
          <div className="icon">🏪</div>
          <div className="data">
            <span className="label">Comercios Activos</span>
            <span className="value">{stats.activeCommerces}</span>
          </div>
          <div className="progress-bg"><div className="progress-bar" style={{ width: '75%' }} /></div>
        </KpiCard>

        <KpiCard className="accent">
          <div className="icon">✦</div>
          <div className="data">
            <span className="label">Solicitudes</span>
            <span className="value">{stats.pendingRequests}</span>
          </div>
          <div className="tag">PENDIENTES</div>
        </KpiCard>

        <KpiCard>
          <div className="icon">🥡</div>
          <div className="data">
            <span className="label">Sedes Totales</span>
            <span className="value">{stats.totalStores}</span>
          </div>
        </KpiCard>

        <KpiCard>
          <div className="icon">🍔</div>
          <div className="data">
            <span className="label">Productos</span>
            <span className="value">{stats.totalProducts}</span>
          </div>
        </KpiCard>
      </KpiGrid>

      <MainGrid>
        {/* Management Panel */}
        <Panel>
          <PanelTabs>
            <Tab 
              $active={activeTab === 'requests'} 
              onClick={() => setActiveTab('requests')}
            >
              Control de Solicitudes de Registro
              {requests.length > 0 && <span className="count">{requests.length}</span>}
            </Tab>
            <Tab 
              $active={activeTab === 'activity'} 
              onClick={() => setActiveTab('activity')}
            >
              Actividad Reciente
            </Tab>
          </PanelTabs>

          <PanelContent>
            {activeTab === 'requests' ? (
              <RequestList>
                {requests.length === 0 ? (
                  <EmptyState>
                    <span className="e-icon">✔</span>
                    <p>Todo al día. No hay solicitudes de registro pendientes.</p>
                  </EmptyState>
                ) : (
                  requests.map((req) => (
                    <RequestItem key={req.id}>
                      <div className="b-info">
                        <div className="b-logo">
                          {req.tipo_solicitud === 'commerce' ? '🏪' : '🛵'}
                        </div>
                        <div className="b-text">
                          <div className="b-name-row">
                            <p className="b-name">{req.razon_social}</p>
                            <TypeBadge className={req.tipo_solicitud}>
                              {req.tipo_solicitud === 'commerce' ? 'Comercio' : 'Mensajería'}
                            </TypeBadge>
                          </div>
                          <p className="b-desc">
                            NIT: {req.nit} | Contacto: {req.nombres_contacto} {req.apellidos_contacto}
                          </p>
                          <p className="b-contact-info">
                            Correo: {req.email_contacto} | Celular: {req.celular_contacto}
                          </p>
                        </div>
                      </div>
                      <div className="b-actions">
                         <ActionBtn 
                           $variant="approve" 
                           onClick={() => handleAction(req.id, 'approve')}
                           disabled={processingId === req.id}
                         >
                           Aprobar
                         </ActionBtn>
                         <ActionBtn 
                           $variant="reject" 
                           onClick={() => handleAction(req.id, 'reject')}
                           disabled={processingId === req.id}
                         >
                           Rechazar
                         </ActionBtn>
                      </div>
                    </RequestItem>
                  ))
                )}
              </RequestList>
            ) : (
              <EmptyState>Registro de actividad de sistema temporalmente deshabilitado.</EmptyState>
            )}
          </PanelContent>
        </Panel>

        {/* Sidebar Mini Tools */}
        <SidebarTools>
          <ToolBox>
            <h3>Acciones Rápidas</h3>
            <ToolBtn onClick={() => fetchData()}>
               <span>↻</span> Refrescar Datos
            </ToolBtn>
            <ToolBtn className="disabled">
               <span>📊</span> Exportar Reporte
            </ToolBtn>
            <ToolBtn className="disabled">
               <span>⚙</span> Ajustes Globales
            </ToolBtn>
          </ToolBox>

          <StatusBox>
             <div className="st-head">
                <span className="dot" />
                <h4>Estado del Sistema</h4>
             </div>
             <p>Todos los servicios operan con normalidad. Conexión estable con Oracle Cloud.</p>
          </StatusBox>
        </SidebarTools>
      </MainGrid>
    </Container>
  );
}

// ------------- ANIMACIONES NATIVAS CSS -------------
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
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
    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%);
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

  &.accent {
    background: linear-gradient(135deg, rgba(72, 214, 76, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: rgba(72, 214, 76, 0.15);
    .icon { color: var(--emerald); background: rgba(72, 214, 76, 0.1); }
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
    background: var(--emerald);
    color: #000;
    border-radius: 6px;
  }

  .progress-bg {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.02);
    .progress-bar { height: 100%; background: var(--emerald); opacity: 0.3; }
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
  color: ${props => props.$active ? 'var(--emerald) ' : 'rgba(255,255,255,0.3)'};
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
    background: rgba(72, 214, 76, 0.1);
    color: var(--emerald);
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 6px;
  }
`;

const PanelContent = styled.div`
  padding: 32px;
  min-height: 400px;
`;

const RequestList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const RequestItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;

  &:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(255,255,255,0.08); }

  .b-info {
    display: flex;
    align-items: flex-start;
    gap: 18px;
    .b-logo {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .b-text {
      .b-name-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
      }
      .b-name { font-size: 1rem; font-weight: 700; color: #fff; }
      .b-desc { font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-bottom: 2px; }
      .b-contact-info { font-size: 11px; color: rgba(255, 255, 255, 0.35); }
    }
  }

  .b-actions {
    display: flex;
    gap: 8px;
  }
`;

const TypeBadge = styled.span`
  font-size: 9px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  
  &.commerce {
    background: rgba(249, 115, 22, 0.1);
    color: #f97316;
    border: 1px solid rgba(249, 115, 22, 0.2);
  }
  
  &.delivery_company {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }
`;

const ActionBtn = styled.button<{ $variant: 'approve' | 'reject' }>`
  background: ${props => props.$variant === 'approve' ? 'rgba(72, 214, 76, 0.08)' : 'rgba(255, 95, 95, 0.08)'};
  color: ${props => props.$variant === 'approve' ? 'var(--emerald)' : '#ff5f5f'};
  border: 1px solid ${props => props.$variant === 'approve' ? 'rgba(72, 214, 76, 0.1)' : 'rgba(255, 95, 95, 0.1)'};
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'approve' ? 'rgba(72, 214, 76, 0.15)' : 'rgba(255, 95, 95, 0.15)'};
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

  h3 { font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; }
`;

const ToolBtn = styled.button`
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 12px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;

  &:hover:not(.disabled) { background: rgba(255, 255, 255, 0.04); color: #fff; padding-left: 16px; }
  &.disabled { opacity: 0.2; cursor: not-allowed; }
  span { font-size: 1.1rem; opacity: 0.6; }
`;

const StatusBox = styled.div`
  background: rgba(72, 214, 76, 0.03);
  border: 1px solid rgba(72, 214, 76, 0.1);
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
  p { font-size: 12px; color: rgba(255, 255, 255, 0.4); line-height: 1.6; }
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
  border: 2px solid rgba(72, 214, 76, 0.1);
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
