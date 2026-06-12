'use client';

import React, { useState, useEffect } from 'react';
import {
  Container, HeaderSection, MainGrid, Panel, PanelTabs, Tab,
  PanelContent, RequestList, RequestItem, TypeBadge, ActionBtn,
  SidebarTools, ToolBox, ToolBtn, StatusBox, LoadingState, Spinner
} from './AdminDashboardStyles';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
import { API_URL } from '@/constants';
import { useAlert } from '@/context/AlertContext';
import { useToast } from '@/context/ToastContext';
import { KpiCard } from '@/components/Common/Dashboard/KpiCard';
import { KpiGrid } from '@/components/Common/Dashboard/KpiGrid';
import { EmptyState } from '@/components/Common/EmptyState';

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
  const { showConfirm } = useAlert();
  const toast = useToast();
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

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    const confirmMsg = action === 'approve' 
      ? '¿Estás seguro de que deseas aprobar esta solicitud? Se creará la cuenta y entidad correspondientes.' 
      : '¿Estás seguro de que deseas rechazar esta solicitud?';

    showConfirm({
      title: 'Confirmar Accion',
      message: confirmMsg,
      confirmText: action === 'approve' ? 'Aprobar' : 'Rechazar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setProcessingId(id);
        try {
          const headers = getAuthHeaders();
          if (action === 'approve') {
            await axios.post(`${API_URL}/api/manage/requests/${id}/approve`, {}, { headers });
          } else {
            await axios.post(`${API_URL}/api/manage/requests/${id}/reject`, { notas_system: 'Rechazado por administración matriz.' }, { headers });
          }
          toast.success(action === 'approve' ? 'Solicitud aprobada con éxito.' : 'Solicitud rechazada con éxito.');
          fetchData();
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Error al procesar la solicitud');
        } finally {
          setProcessingId(null);
        }
      }
    });
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
        <KpiCard
          icon="🏪"
          label="Comercios Activos"
          value={stats.activeCommerces}
          progressBarPercentage={75}
        />

        <KpiCard
          icon="✦"
          label="Solicitudes"
          value={stats.pendingRequests}
          accent={true}
          tag="PENDIENTES"
        />

        <KpiCard
          icon="🥡"
          label="Sedes Totales"
          value={stats.totalStores}
        />

        <KpiCard
          icon="🍔"
          label="Productos"
          value={stats.totalProducts}
        />
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
                  <EmptyState
                    icon="✔"
                    message="Todo al día. No hay solicitudes de registro pendientes."
                  />
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
              <EmptyState message="Registro de actividad de sistema temporalmente deshabilitado." />
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



