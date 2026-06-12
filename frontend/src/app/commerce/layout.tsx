'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardShell } from '@/components/Common/Layout/DashboardShell';

const NAV_ITEMS = [
  { label: 'Inicio', path: '/commerce/dashboard', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { label: 'Administrar Sedes', path: '/commerce/store-admins', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' }
];

const BRANDING = {
  cubeLetter: 'C',
  cubeBg: 'linear-gradient(135deg, var(--emerald) 0%, #059669 100%)',
  cubeColor: '#000',
  activeLinkBg: 'rgba(16, 185, 129, 0.1)',
  activeIconColor: 'var(--emerald)'
};

export default function CommerceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getPageTitle = (path: string) => {
    if (path.includes('/stores/')) return 'Detalle de Sede';
    if (path.endsWith('/store-admins')) return '';
    if (path.endsWith('/dashboard')) return 'Estado del Comercio';
    if (path.endsWith('/catalog')) return 'Catálogo Maestro';
    return 'Panel de Control del Comercio';
  };

  const getNavItems = () => {
    if (user?.adminType === 'store') {
      const storeId = user.storeIds && user.storeIds.length > 0 ? user.storeIds[0] : null;
      if (storeId) {
        return [
          { label: 'Mi Sede', path: `/commerce/stores/${storeId}`, icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' }
        ];
      }
    }
    const items = [...NAV_ITEMS];
    return items;
  };

  return (
    <DashboardShell
      logoText="Commerce"
      logoSubText="Core"
      branding={BRANDING}
      navItems={getNavItems()}
      scrollContainerId="commerce-scroll-container"
      pageTitle={getPageTitle(pathname)}
    >
      {children}
    </DashboardShell>
  );
}
