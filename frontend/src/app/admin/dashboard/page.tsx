'use client';

import React, { useState, useEffect } from 'react';
import {
  Container, HeaderSection, MainGrid, Panel, PanelTabs, Tab,
  PanelContent, SidebarTools, ToolBox, ToolBtn, StatusBox, LoadingState, Spinner
} from './AdminDashboardStyles';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { KpiCard } from '@/components/Common/Dashboard/KpiCard';
import { KpiGrid } from '@/components/Common/Dashboard/KpiGrid';
import { EmptyState } from '@/components/Common/EmptyState';
import { useRouter } from 'next/navigation';

interface Stats {
  activeCommerces: number;
  pendingRequests: number;
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    activeCommerces: 0,
    pendingRequests: 0,
    totalStores: 0,
    totalProducts: 0,
    totalOrders: 0
  });
  const [loading, setLoading] = useState(true);

  // TanStack Query: Lectura de Estadísticas
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/stats`, { headers, signal });
      return res.data;
    },
    enabled: !isLoading && !!user
  });

  useEffect(() => {
    if (statsData) {
      setStats(statsData);
    }
  }, [statsData]);

  useEffect(() => {
    setLoading(statsLoading);
  }, [statsLoading]);

  if (loading || isLoading) {
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
          onClick={() => router.push('/admin/dashboard/requests')}
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
        {/* Resumen del Core */}
        <Panel>
          <PanelTabs>
            <Tab $active={true}>
              Actividad Reciente
            </Tab>
          </PanelTabs>

          <PanelContent>
            <EmptyState 
              icon="📈" 
              message="No hay notificaciones de auditoría pendientes de revisión en la cola." 
            />
          </PanelContent>
        </Panel>

        {/* Sidebar Mini Tools */}
        <SidebarTools>
          <ToolBox>
            <h3>Acciones Rápidas</h3>
            <ToolBtn onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['adminStats'] });
            }}>
               <span>↻</span> Refrescar Datos
            </ToolBtn>
            {user?.permissions?.includes('manage_registration_requests') && (
              <ToolBtn onClick={() => router.push('/admin/dashboard/requests')}>
                 <span>🏪</span> Gestionar Solicitudes
              </ToolBtn>
            )}
            <ToolBtn className="disabled">
               <span>📊</span> Exportar Reporte
            </ToolBtn>
          </ToolBox>

          <StatusBox>
             <div className="st-head">
                <span className="dot" />
                <h4>Estado del Sistema</h4>
             </div>
             <p>Todos los servicios operan con normalidad. Conexión cifrada a la VPN de Tailscale activa.</p>
          </StatusBox>
        </SidebarTools>
      </MainGrid>
    </Container>
  );
}
