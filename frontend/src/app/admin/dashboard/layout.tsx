'use client';

import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { label: 'Inicio', path: '/admin/dashboard', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { label: 'Marcas', path: '/admin/dashboard/brands', icon: 'M12 2L2 22h20L12 2zm0 3.83L18.17 19H5.83L12 5.83z' },
  { label: 'Sedes', path: '/admin/dashboard/stores', icon: 'M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z' }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <LayoutContainer>
      <Sidebar>
        <SidebarHeader>
          <Cube>A</Cube>
          <LogoText>Admin<span>Core</span></LogoText>
        </SidebarHeader>

        <UserInfo>
          <UserName>{user?.nombre || 'Administrador'}</UserName>
          <UserRole>{user?.rol || 'Rol: admin'}</UserRole>
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
            Cerrar Sesion
          </LogoutButton>
        </SidebarFooter>
      </Sidebar>

      <MainContent>
        <GlassHeader>
          <HeaderText>Panel de Administracion</HeaderText>
        </GlassHeader>
        <ContentWrapper>
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

// Sidebar Elements
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
  background: linear-gradient(135deg, var(--emerald) 0%, var(--green) 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #000;
  font-size: 0.9rem;
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
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  background: ${props => props.$active ? 'rgba(72, 214, 76, 0.1)' : 'transparent'};
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  ${Icon} {
    opacity: ${props => props.$active ? 1 : 0.5};
    color: ${props => props.$active ? 'var(--emerald)' : 'inherit'};
  }

  &:hover {
    background: ${props => props.$active ? 'rgba(72, 214, 76, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
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

// Main Content Elements
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
`;
