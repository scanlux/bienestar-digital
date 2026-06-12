'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardShell } from '@/components/Common/Layout/DashboardShell';

const NAV_ITEMS = [
  { label: 'Inicio', path: '/admin/dashboard', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { label: 'Catálogo Comercios', path: '/admin/dashboard/commerce', icon: 'M12 2L2 22h20L12 2zm0 3.83L18.17 19H5.83L12 5.83z', permission: 'view_commerces' },
  { label: 'Sedes', path: '/admin/dashboard/stores', icon: 'M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z', permission: 'view_stores' },
  { label: 'Inteligencia', path: '/admin/dashboard/intelligence', icon: 'M21 16.5c0 .38-.21.71-.53.88l-7.97 4.44c-.31.17-.69.17-1 0L3.53 17.38c-.32-.17-.53-.5-.53-.88V7.5c0-.38.21-.71.53-.88l7.97-4.44c.31-.17.69-.17 1 0l7.97 4.44c.32 1.7.53.5.53.88v9zM12 4.15L5.33 7.85 12 11.56l6.67-3.71L12 4.15z', permission: 'manage_intelligence' },
  { label: 'Usuarios y Permisos', path: '/admin/dashboard/users', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', permission: 'create_system_user' },
  { label: 'Roles y Accesos', path: '/admin/dashboard/roles', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15h-2v-2h2v2zm0-4h-2V7h2v5z', permission: 'manage_rbac' },
  { label: 'Análisis de Permisos', path: '/admin/dashboard/roles/analysis', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z', permission: 'manage_rbac' },
  { label: 'Auditoría de Seguridad', path: '/admin/dashboard/security', icon: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z', permission: 'view_security_logs' },
  { label: 'Mantenimiento del Sistema', path: '/admin/dashboard/system', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z', permission: 'view_security_logs' }
];

const BRANDING = {
  cubeLetter: 'A',
  cubeBg: 'linear-gradient(135deg, var(--emerald) 0%, var(--green) 100%)',
  cubeColor: '#000',
  activeLinkBg: 'rgba(72, 214, 76, 0.1)',
  activeIconColor: 'var(--emerald)'
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getPageTitle = (path: string) => {
    if (path.includes('/commerce/')) return 'Detalle del Comercio';
    if (path.endsWith('/commerce')) return ''; 
    if (path.includes('/stores')) return 'Sedes / Sucursales';
    if (path.endsWith('/roles/analysis')) return 'Análisis de Permisos Atómicos';
    if (path.endsWith('/roles')) return 'Configuración de Roles';
    if (path.endsWith('/system')) return 'Mantenimiento de Sistemas';
    return 'Panel de Administración';
  };

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.permission) {
      return user?.permissions && user.permissions.includes(item.permission);
    }
    return true;
  });

  return (
    <DashboardShell
      logoText="Admin"
      logoSubText="Core"
      branding={BRANDING}
      navItems={filteredNavItems}
      scrollContainerId="admin-scroll-container"
      pageTitle={getPageTitle(pathname)}
    >
      {children}
    </DashboardShell>
  );
}
