'use client';

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '@/context/AuthContext';
import { KpiCard } from '@/components/Common/Dashboard/KpiCard';
import { KpiGrid } from '@/components/Common/Dashboard/KpiGrid';
import { StatusBadge } from '@/components/Common/StatusBadge';

interface DeliveryStat {
  activeDrivers: number;
  completedDeliveries: number;
  totalEarnings: number;
  pendingDeliveries: number;
}

interface RecentDelivery {
  id: string;
  driver: string;
  store: string;
  customer: string;
  status: 'entregado' | 'en_camino' | 'asignado';
  time: string;
  value: string;
}

export default function DeliveryCompanyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DeliveryStat>({
    activeDrivers: 5,
    completedDeliveries: 42,
    totalEarnings: 210000,
    pendingDeliveries: 3
  });

  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([
    { id: '#DEL-1092', driver: 'Camilo Repartidor', store: 'Sede Chapinero (Alimentos S.A.S)', customer: 'María López', status: 'entregado', time: 'Hace 10 min', value: '$5.000' },
    { id: '#DEL-1093', driver: 'Juan Pérez', store: 'Taco Loco Yopal', customer: 'Andrés Castro', status: 'en_camino', time: 'Hace 22 min', value: '$6.500' },
    { id: '#DEL-1094', driver: 'Carlos Ruiz', store: 'Sede Centro (Alimentos S.A.S)', customer: 'Diana Ortega', status: 'asignado', time: 'Hace 5 min', value: '$4.800' }
  ]);

  return (
    <Container>
      <HeaderSection>
        <div className="title-group">
          <p className="subtitle">Consola de Operaciones —</p>
          <h1 className="title">Panel de Control General</h1>
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
          value={stats.completedDeliveries}
        />

        <KpiCard
          icon="💵"
          label="Ingresos por Servicios"
          value={`$${stats.totalEarnings.toLocaleString('es-CO')}`}
        />

        <KpiCard
          icon="⏳"
          label="Servicios Pendientes"
          value={stats.pendingDeliveries}
        />
      </KpiGrid>

      <MainGrid>
        {/* Recent Activity Panel */}
        <Panel>
          <PanelTabs>
            <Tab $active={true}>
              Actividad de Servicios Reciente
            </Tab>
          </PanelTabs>

          <PanelContent>
            <DeliveryList>
              {recentDeliveries.map((del) => (
                <DeliveryItem key={del.id}>
                  <div className="d-info">
                    <div className="d-logo">
                      🛵
                    </div>
                    <div className="d-text">
                      <p className="d-name">{del.driver}</p>
                      <p className="d-details">
                        {del.store} ➔ {del.customer}
                      </p>
                    </div>
                  </div>
                  <div className="d-meta">
                    <span className="d-time">{del.time}</span>
                    <span className="d-val">{del.value}</span>
                    <StatusBadge status={del.status} />
                  </div>
                </DeliveryItem>
              ))}
            </DeliveryList>
          </PanelContent>
        </Panel>

        {/* Sidebar Status Info */}
        <SidebarTools>
          <ToolBox>
            <h3>Acciones Rápidas</h3>
            <ToolBtn className="disabled">
              <span>➕</span> Registrar Repartidor
            </ToolBtn>
            <ToolBtn className="disabled">
              <span>📋</span> Ver Reportes Mensuales
            </ToolBtn>
          </ToolBox>

          <StatusBox>
            <div className="st-head">
              <span className="dot" />
              <h4>Estado de Servicios</h4>
            </div>
            <p>Monitoreando despacho automático. La pasarela de pagos y el ledger de repartos están operando bajo el protocolo de firmas seguras.</p>
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
  color: ${props => props.$active ? '#3b82f6' : 'rgba(255,255,255,0.3)'};
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PanelContent = styled.div`
  padding: 32px;
  min-height: 400px;
`;

const DeliveryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const DeliveryItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 16px 20px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: justify;
  justify-content: space-between;
  transition: all 0.2s;

  &:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(255,255,255,0.08); }

  .d-info {
    display: flex;
    align-items: center;
    gap: 18px;
    .d-logo {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .d-text {
      .d-name { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
      .d-details { font-size: 12px; color: rgba(255, 255, 255, 0.35); line-height: 1.5; }
    }
  }

  .d-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    .d-time { font-size: 12px; color: rgba(255, 255, 255, 0.3); }
    .d-val { font-size: 13px; font-weight: 700; color: #fff; }
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
  background: rgba(59, 130, 246, 0.03);
  border: 1px solid rgba(59, 130, 246, 0.1);
  padding: 24px;
  border-radius: 28px;

  .st-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    .dot { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 10px #3b82f6; }
    h4 { font-size: 0.85rem; font-weight: 700; color: #fff; }
  }
  p { font-size: 12px; color: rgba(255, 255, 255, 0.4); line-height: 1.6; }
`;
