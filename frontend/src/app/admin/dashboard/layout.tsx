'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardShell } from '@/components/Common/Layout/DashboardShell';
import { ADMIN_BRANDING } from '@/components/Common/AdminNavConfig';
import { useNavigation } from '@/hooks/useNavigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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

    if (path.includes('/commerce/')) return 'Detalle del Comercio';
    if (path.endsWith('/commerce')) return ''; 
    if (path.endsWith('/roles/analysis')) return 'Análisis de Permisos Atómicos';
    if (path.endsWith('/roles')) return 'Configuración de Roles';
    if (path.endsWith('/system/upgrades')) return 'Administracion de Mejoras';
    if (path.endsWith('/system')) return 'Mantenimiento de Sistemas';
    if (path.endsWith('/wallet')) return 'Billetera Global del Ecosistema';
    if (path.endsWith('/domi/parameters')) return 'Parametros del Protocolo Financiero DOMI';
    if (path.endsWith('/domi/treasury')) return 'Tesorería del Protocolo y Emisión de DOMIs';
    if (path.endsWith('/ledger')) return 'Libro Mayor de Transacciones (Ledger)';
    if (path.endsWith('/requests')) return 'Solicitudes de Afiliacion';
    if (path.includes('/email-templates')) return 'Plantillas de Correo';
    if (path.endsWith('/cash')) return 'Gestion de Caja y Bancos';
    if (path.endsWith('/cronjobs')) return 'Cronjobs del Sistema';
    if (path.endsWith('/users')) return 'Administración roles RBAC';
    return 'Panel de Administración';
  };

  // Mapear de children (backend/db) a subItems (esperado por DashboardShell legacy si es necesario)
  const mappedNavItems = navItems.map((item: any) => {
    return {
      ...item,
      subItems: item.children && item.children.length > 0 ? item.children : undefined
    };
  });

  return (
    <DashboardShell
      logoText="Admin"
      logoSubText="Core"
      branding={ADMIN_BRANDING}
      navItems={mappedNavItems}
      isLoading={isLoading}
      scrollContainerId="admin-scroll-container"
      pageTitle={getPageTitle(pathname)}
    >
      {children}
    </DashboardShell>
  );
}

