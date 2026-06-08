'use client';

import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { label: 'Inicio', path: '/delivery-company/dashboard', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { label: 'Gestionar Repartidores', path: '/delivery-company/drivers', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' }
];

export default function DeliveryCompanyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getPageTitle = (path: string) => {
    if (path.endsWith('/drivers')) return 'Afiliar y Administrar Repartidores';
    return 'Panel de Control de Delivery';
  };

  return (
    <LayoutContainer>
      <Sidebar>
        <SidebarHeader>
          <Cube>D</Cube>
          <LogoText>Delivery<span>Core</span></LogoText>
        </SidebarHeader>

        <UserInfo>
          <UserName>{user?.nombre || 'Administrador Delivery'}</UserName>
          <UserRole>{user?.email || 'empresa@delivery.com'}</UserRole>
        </UserInfo>

        <NavList>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            return (
              <NavItem key={item.path}>
                <NavLink href={item.path} $active={isActive}>
                  <Icon viewBox="0 0 24 24">
                    <path d={item.icon} fill="currentColor" />
                  </Icon>
                  {item.label}
                </NavLink>
              </NavItem>
            );
          })}
        </NavList>

        <SidebarFooter>
          <LogoutButton onClick={handleLogout}>
            Cerrar Sesión
          </LogoutButton>
        </SidebarFooter>
      </Sidebar>

      <MainContent>
        <GlassHeader>
          <div id="header-back-portal-root" style={{ display: 'flex', alignItems: 'center' }} />
          <HeaderText>{getPageTitle(pathname)}</HeaderText>
          <div id="header-portal-root" style={{ display: 'flex', alignItems: 'center', flex: 1 }} />
        </GlassHeader>
        <ContentWrapper id="delivery-scroll-container">
          {children}
        </ContentWrapper>
      </MainContent>
    </LayoutContainer>
  );
}

// ------------- STYLED COMPONENTS -------------
const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--Background);
  font-family: 'SF Pro Display', sans-serif;
  overflow: hidden;
`;

const Sidebar = styled.aside`
  width: 260px;
  height: 100vh;
  background: rgba(15, 15, 15, 0.95);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
`;

const SidebarHeader = styled.div`
  padding: 2rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Cube = styled.div`
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #fff;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
`;

const LogoText = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.01em;
  span {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 400;
  }
`;

const UserInfo = styled.div`
  padding: 0 1.5rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 2rem;
`;

const UserName = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.25rem;
`;

const UserRole = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const NavList = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1rem;
`;

const NavItem = styled.div``;

const Icon = styled.svg`
  width: 20px;
  height: 20px;
  opacity: 0.7;
  transition: opacity 0.2s;
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  color: ${props => props.$active ? '#fff' : 'rgba(255, 255, 255, 0.5)'};
  background: ${props => props.$active ? 'rgba(59, 130, 246, 0.1)' : 'transparent'};
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  ${Icon} {
    opacity: ${props => props.$active ? 1 : 0.5};
    color: ${props => props.$active ? '#3b82f6' : 'inherit'};
  }

  &:hover {
    background: ${props => props.$active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
    color: #fff;
    ${Icon} { opacity: 1; }
  }
`;

const SidebarFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 0.85rem;
  border-radius: 0.75rem;
  background: rgba(255, 95, 95, 0.1);
  color: #ff5f5f;
  border: 1px solid rgba(255, 95, 95, 0.2);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 95, 95, 0.2);
  }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 260px;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const GlassHeader = styled.header`
  height: 70px;
  background: rgba(7, 6, 6, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 50;
`;

const HeaderText = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
`;

const ContentWrapper = styled.div`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 0.5rem;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;
