'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardShell } from '@/components/Common/Layout/DashboardShell';
import { NotificationProvider } from '@/context/NotificationContext';
import { useNavigation } from '@/hooks/useNavigation';

const BRANDING = {
  cubeLetter: 'C',
  cubeBg: 'linear-gradient(135deg, var(--emerald) 0%, #059669 100%)',
  cubeColor: '#000',
  activeLinkBg: 'rgba(16, 185, 129, 0.1)',
  activeIconColor: 'var(--emerald)'
};

import { ADMIN_BRANDING } from '@/components/Common/AdminNavConfig';

export default function CommerceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: navItems = [], isLoading } = useNavigation();

  const isSystem = user?.actorType === 'system_user';
  const isStoreAdmin = user?.adminType === 'store';

  // Buscar el item correspondiente en la lista plana o en sus hijos para obtener su page_title
  const getPageTitle = (path: string) => {
    const findTitle = (items: any[]): string | null => {
      for (const item of items) {
        if (item.path === path) return item.page_title || item.label;
        if (item.children && item.children.length > 0) {
          const title = findTitle(item.children);
          if (title) return title;
        }
      }
      return null;
    };
    
    const resolvedTitle = findTitle(navItems);
    if (resolvedTitle) return resolvedTitle;

    // Fallbacks para rutas anidadas dinámicas
    if (path.match(/\/stores\/\d+\/catalog/)) return 'Gestión de Catálogo';
    if (path.match(/\/stores\/\d+\/profile/)) return 'Perfil de la Sede';
    if (path.match(/\/stores\/\d+\/financial-summary/)) return 'Resumen Financiero';
    if (path.includes('/stores/')) return 'Detalle de Sede';
    return 'Panel de Control del Comercio';
  };

  const logoText = isSystem ? "Admin" : (isStoreAdmin ? "Store" : "Commerce");
  const activeBranding = isSystem 
    ? ADMIN_BRANDING 
    : (isStoreAdmin ? { ...BRANDING, cubeLetter: 'S' } : BRANDING);

  return (
    <NotificationProvider>
      <DashboardShell
        logoText={logoText}
        logoSubText="Core"
        branding={activeBranding}
        navItems={navItems}
        isLoading={isLoading}
        scrollContainerId="commerce-scroll-container"
        pageTitle={getPageTitle(pathname)}
      >
        {children}
      </DashboardShell>
    </NotificationProvider>
  );
}
