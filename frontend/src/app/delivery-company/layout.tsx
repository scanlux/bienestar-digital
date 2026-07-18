'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DashboardShell } from '@/components/Common/Layout/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@/hooks/useNavigation';

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
  const { user } = useAuth();
  const { data: navItems = [], isLoading } = useNavigation();

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

    if (path.endsWith('/drivers')) return 'Afiliar y Administrar Repartidores';
    if (path.endsWith('/wallet')) return 'Mi Billetera DOMI';
    if (path.endsWith('/financial-summary')) return 'Resumen Financiero';
    return 'Panel de Control de Delivery';
  };

  return (
    <DashboardShell
      logoText="Delivery"
      logoSubText="Core"
      branding={BRANDING}
      navItems={navItems}
      isLoading={isLoading}
      scrollContainerId="delivery-scroll-container"
      pageTitle={getPageTitle(pathname)}
    >
      {children}
    </DashboardShell>
  );
}
