'use client';

import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { API_URL } from '@/constants';
import axios from 'axios';

export interface ShellNavItem {
  id: number;
  label: string;
  path?: string | null;
  icon: string | null;
  subItems?: ShellNavItem[];
  risk_level?: 'normal' | 'high' | 'critical';
  isLocked?: boolean;
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
  isLoading?: boolean;
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  logoText,
  logoSubText,
  branding,
  navItems,
  scrollContainerId = 'dashboard-scroll-container',
  pageTitle,
  isLoading = false,
  children
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const notificationsCtx = useNotifications();
  const [showNotificationsDropdown, setShowNotificationsDropdown] = React.useState(false);

  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});
  const [storeName, setStoreName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (token && user?.adminType === 'store') {
      const fetchStoreInfo = async () => {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const res = await axios.get(`${API_URL}/api/manage/my-stores`, { headers });
          const stores = res.data;
          const assignedStoreIds = user.storeIds || [];
          const myStores = stores.filter((s: any) => assignedStoreIds.includes(s.id));
          if (myStores.length > 0) {
            setStoreName(myStores[0].nombre_sucursal.toUpperCase());
          }
        } catch (err) {
          console.error('Error fetching store info in shell:', err);
        }
      };
      fetchStoreInfo();
    }
  }, [token, user]);

  React.useEffect(() => {
    const initialOpen: Record<string, boolean> = {};
    navItems.forEach(item => {
      if (item.subItems) {
        const isActive = item.subItems.some(sub => sub.path && (pathname === sub.path || pathname.startsWith(sub.path)));
        if (isActive) {
          initialOpen[item.label] = true;
        }
      }
    });
    setOpenMenus(prev => ({ ...prev, ...initialOpen }));
  }, [pathname, navItems]);

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

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
          {storeName && <StoreNameLabel>{storeName}</StoreNameLabel>}
          <UserName>{user?.nombre || 'Administrador'}</UserName>
          <UserRole>{user?.rol || user?.email || 'Rol: admin'}</UserRole>
        </UserInfo>

        <NavList>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            navItems.map((item) => {
              const hasSubItems = item.subItems && item.subItems.length > 0;
              
              if (hasSubItems) {
                const isOpen = !!openMenus[item.label];
                const isAnySubActive = item.subItems!.some(sub => sub.path && (pathname === sub.path || pathname.startsWith(sub.path)));

                return (
                  <NavItem key={item.label}>
                    <MenuHeaderButton 
                      onClick={() => toggleMenu(item.label)}
                      $active={isAnySubActive}
                    >
                      <Icon viewBox="0 0 24 24">
                        <path d={item.icon || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'} fill="currentColor" />
                      </Icon>
                      {item.label}
                      <ExpandIcon viewBox="0 0 24 24" $isOpen={isOpen}>
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
                      </ExpandIcon>
                    </MenuHeaderButton>
                    <SubNavList $isOpen={isOpen}>
                      {item.subItems!.map((sub) => {
                        const isSubActive = sub.path && (pathname === sub.path || pathname.startsWith(sub.path));
                        
                        if (sub.isLocked) {
                          return (
                            <SubNavLink 
                              key={sub.label}
                              href="/commerce/upgrades"
                              $active={false}
                              $activeBg={branding.activeLinkBg}
                              $activeIconColor={branding.activeIconColor}
                              style={{ opacity: 0.5 }}
                              title="Activa esta función en el Mercado de Mejoras"
                            >
                              <Icon viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor" />
                              </Icon>
                              {sub.label}
                              <span style={{ fontSize: '10px', marginLeft: 'auto', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px' }}>Locked</span>
                            </SubNavLink>
                          );
                        }

                        return (
                          <SubNavLink 
                            key={sub.path}
                            href={sub.path!} 
                            $active={!!isSubActive}
                            $activeBg={branding.activeLinkBg}
                            $activeIconColor={branding.activeIconColor}
                            title={sub.risk_level && sub.risk_level !== 'normal' ? `Panel de Criticidad: ${sub.risk_level.toUpperCase()}. Operaciones monitoreadas en auditoría.` : undefined}
                          >
                            {sub.icon && (
                              <Icon viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                                <path d={sub.icon} fill="currentColor" />
                              </Icon>
                            )}
                            {sub.label}
                            {sub.risk_level && sub.risk_level !== 'normal' && (
                              <RiskDot $risk={sub.risk_level} />
                            )}
                          </SubNavLink>
                        );
                      })}
                    </SubNavList>
                  </NavItem>
                );
              }

              // Normal flat link
              if (item.isLocked) {
                return (
                  <NavItem key={item.label}>
                    <NavLink 
                      href="/commerce/upgrades" 
                      $active={false}
                      $activeBg={branding.activeLinkBg}
                      $activeIconColor={branding.activeIconColor}
                      style={{ opacity: 0.5 }}
                      title="Activa esta función en el Mercado de Mejoras"
                    >
                      <Icon viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor" />
                      </Icon>
                      {item.label}
                      <span style={{ fontSize: '10px', marginLeft: 'auto', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px' }}>Locked</span>
                    </NavLink>
                  </NavItem>
                );
              }

              const isActive = item.path && (pathname === item.path || (item.path !== '/commerce/dashboard' && item.path !== '/admin/dashboard' && item.path !== '/delivery-company/dashboard' && pathname.startsWith(item.path)));
              return (
                <NavItem key={item.path || item.label}>
                  <NavLink 
                    href={item.path!} 
                    $active={!!isActive}
                    $activeBg={branding.activeLinkBg}
                    $activeIconColor={branding.activeIconColor}
                  >
                    <Icon viewBox="0 0 24 24">
                      <path d={item.icon || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'} fill="currentColor" />
                    </Icon>
                    {item.label}
                    {item.risk_level && item.risk_level !== 'normal' && (
                      <RiskDot $risk={item.risk_level} />
                    )}
                  </NavLink>
                </NavItem>
              );
            })
          )}
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
          {notificationsCtx && (
            <div style={{ position: 'relative', marginRight: '1rem', display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
                title="Notificaciones de Sistema"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notificationsCtx.unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: '#EF4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {notificationsCtx.unreadCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  marginTop: '8px',
                  width: '320px',
                  background: 'rgba(15, 15, 15, 0.97)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <div style={{
                    padding: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Notificaciones</span>
                    {notificationsCtx.unreadCount > 0 && (
                      <button 
                        onClick={() => {
                          notificationsCtx.markAllRead();
                          setShowNotificationsDropdown(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--emerald, #10b981)',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Marcar todo leído
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {notificationsCtx.notifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
                        No tienes notificaciones pendientes.
                      </div>
                    ) : (
                      notificationsCtx.notifications.map((n) => (
                        <div 
                          key={n.id}
                          onClick={() => {
                            notificationsCtx.markRead(n.id);
                            if (n.action_url) {
                              router.push(n.action_url);
                            }
                            setShowNotificationsDropdown(false);
                          }}
                          style={{
                            padding: '12px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontWeight: 'bold', fontSize: '0.8125rem', color: '#10b981' }}>{n.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.2' }}>{n.message}</span>
                          <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', alignSelf: 'flex-end' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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

const StoreNameLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #ff9e00;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
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

const MenuHeaderButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  color: ${props => props.$active ? '#fff' : 'rgba(255, 255, 255, 0.5)'};
  background: transparent;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;

  ${Icon} {
    opacity: ${props => props.$active ? 1 : 0.5};
    color: ${props => props.$active ? 'inherit' : 'inherit'};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
    color: #fff;
    ${Icon} { opacity: 1; }
  }
`;

const ExpandIcon = styled.svg<{ $isOpen: boolean }>`
  width: 16px;
  height: 16px;
  margin-left: auto;
  opacity: 0.5;
  transform: ${props => props.$isOpen ? 'rotate(90deg)' : 'rotate(0)'};
  transition: transform 0.2s ease;
`;

const SubNavList = styled.div<{ $isOpen: boolean }>`
  max-height: ${props => props.$isOpen ? '300px' : '0'};
  overflow: hidden;
  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
`;

const SubNavLink = styled(Link)<{ $active?: boolean; $activeBg: string; $activeIconColor: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  color: ${props => props.$active ? '#fff' : 'rgba(255, 255, 255, 0.4)'};
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.03)' : 'transparent'};
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
`;

const RiskDot = styled.span<{ $risk?: 'normal' | 'high' | 'critical' }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${props => {
    if (props.$risk === 'critical') return '#ef4444';
    if (props.$risk === 'high') return '#f59e0b';
    return 'transparent';
  }};
  box-shadow: ${props => {
    if (props.$risk === 'critical') return '0 0 6px #ef4444';
    if (props.$risk === 'high') return '0 0 6px #f59e0b';
    return 'none';
  }};
  display: ${props => (props.$risk && props.$risk !== 'normal' ? 'inline-block' : 'none')};
  margin-left: auto;
`;

