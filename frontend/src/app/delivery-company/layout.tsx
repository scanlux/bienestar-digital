'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DashboardShell } from '@/components/Common/Layout/DashboardShell';

const NAV_ITEMS = [
  { label: 'Inicio', path: '/delivery-company/dashboard', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { label: 'Gestionar Repartidores', path: '/delivery-company/drivers', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' }
];

const BRANDING = {
  cubeLetter: 'D',
  cubeBg: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  cubeColor: '#fff',
  cubeShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  activeLinkBg: 'rgba(59, 130, 246, 0.1)',
  activeIconColor: '#3b82f6'
};

export default function DeliveryCompanyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.endsWith('/drivers')) return 'Afiliar y Administrar Repartidores';
    return 'Panel de Control de Delivery';
  };

  return (
    <DashboardShell
      logoText="Delivery"
      logoSubText="Core"
      branding={BRANDING}
      navItems={NAV_ITEMS}
      scrollContainerId="delivery-scroll-container"
      pageTitle={getPageTitle(pathname)}
    >
      {children}
    </DashboardShell>
  );
}
