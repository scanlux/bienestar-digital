'use client';

import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export interface ShellNavItem {
  label: string;
  path: string;
  icon: string;
}

export interface BrandingConfig {
  cubeLetter: string;
  cubeBg: string;
  cubeColor: string;
  cubeShadow?: string;
  activeLinkBg: string;
  activeIconColor: string;
}

interface DashboardShellProps {
  logoText: string;
  logoSubText: string;
  branding: BrandingConfig;
  navItems: ShellNavItem[];
  scrollContainerId?: string;
  pageTitle: string;
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  logoText,
  logoSubText,
  branding,
  navItems,
  scrollContainerId = 'dashboard-scroll-container',
  pageTitle,
  children
}) => {
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
          <Cube 
            $bg={branding.cubeBg} 
            $color={branding.cubeColor} 
            $shadow={branding.cubeShadow}
          >
            {branding.cubeLetter}
          </Cube>
          <LogoText>
            {logoText}<span>{logoSubText}</span>
          </LogoText>
        </SidebarHeader>

        <UserInfo>
          <UserName>{user?.nombre || 'Administrador'}</UserName>
          <UserRole>{user?.rol || user?.email || 'Rol: admin'}</UserRole>
        </UserInfo>

        <NavList>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/commerce/dashboard' && item.path !== '/admin/dashboard' && item.path !== '/delivery-company/dashboard' && pathname.startsWith(item.path));
            return (
              <NavItem key={item.path}>
                <NavLink 
                  href={item.path} 
                  $active={isActive}
                  $activeBg={branding.activeLinkBg}
                  $activeIconColor={branding.activeIconColor}
                >
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
          <HeaderText>{pageTitle}</HeaderText>
          <div id="header-portal-root" style={{ display: 'flex', alignItems: 'center', flex: 1 }} />
        </GlassHeader>
        <ContentWrapper id={scrollContainerId}>
          {children}
        </ContentWrapper>
      </MainContent>
    </LayoutContainer>
  );
};

// ------------- STYLED COMPONENTS -------------
const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--Background, #070606);
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
  color: white;
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

const Cube = styled.div<{ $bg: string; $color: string; $shadow?: string }>`
  width: 28px;
  height: 28px;
  background: ${props => props.$bg};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: ${props => props.$color};
  font-size: 0.9rem;
  box-shadow: ${props => props.$shadow || 'none'};
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
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const UserRole = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 0.25rem;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.25rem;
  }
`;

const NavItem = styled.div``;

const Icon = styled.svg`
  width: 20px;
  height: 20px;
  opacity: 0.7;
  transition: opacity 0.2s;
`;

const NavLink = styled(Link)<{ $active?: boolean; $activeBg: string; $activeIconColor: string }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  color: ${props => props.$active ? '#fff' : 'rgba(255, 255, 255, 0.5)'};
  background: ${props => props.$active ? props.$activeBg : 'transparent'};
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  ${Icon} {
    opacity: ${props => props.$active ? 1 : 0.5};
    color: ${props => props.$active ? props.$activeIconColor : 'inherit'};
  }

  &:hover {
    background: ${props => props.$active ? props.$activeBg : 'rgba(255, 255, 255, 0.03)'};
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
  margin: 0;
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
