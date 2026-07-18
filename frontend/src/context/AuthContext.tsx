'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import { API_URL } from '@/constants';
import { AlertModal } from '@/components/Common/AlertModal';
import styled, { keyframes } from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';


interface User {
  id: number;
  email: string;
  nombre: string;
  actorType?: 'user' | 'system_user' | 'operator';
  rol?: 'admin' | 'customer' | 'delivery' | 'operator' | 'root' | 'system';
  adminType?: 'commerce' | 'store' | 'delivery_company';
  commerceId?: number;
  storeIds?: number[];
  deliveryCompanyId?: number;
  permissions?: string[];
  permissionModes?: Record<string, 'ghost' | 'hidden' | 'disabled'>;
  systemFlags?: Record<string, boolean>;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, loginType?: 'business' | 'operator' | 'system') => Promise<void>;
  logout: (reason?: 'session_expired' | 'logged_out' | 'security_update' | any) => void;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
  maintenanceMode: boolean;
  triggerMaintenance: () => void;
  isOffline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let activeRefreshPromise: Promise<void> | null = null;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [bypassPages, setBypassPages] = useState<string[]>(['/login', '/']);
  const [isOffline, setIsOffline] = useState(false);
  const [countdownText, setCountdownText] = useState('00:00:00');
  const [maintenanceMessage, setMaintenanceMessage] = useState('El sistema se encuentra en modo mantenimiento por reinicio de servicios.');
  const [estimatedEnd, setEstimatedEnd] = useState<string | null>(null);
  const triggerMaintenance = () => setMaintenanceMode(true);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const fetchBypassRules = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/public/maintenance-bypass-rules`);
      if (res.data && res.data.success && Array.isArray(res.data.rules)) {
        setBypassPages(res.data.rules);
      }
    } catch (err) {
      console.error('Error al cargar reglas públicas de bypass:', err);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/public/maintenance-status`);
      if (!res.data.maintenanceMode) {
        setMaintenanceMode(false);
        setEstimatedEnd(null);
        setBypassPages(['/login', '/']);
      } else {
        setMaintenanceMessage(res.data.details?.message || 'El sistema se encuentra en modo mantenimiento por reinicio de servicios.');
        setEstimatedEnd(res.data.details?.estimated_end || null);
        setMaintenanceMode(true);
        fetchBypassRules();
      }
    } catch (err) {
      setCountdownText('AWAITING DEPLOY');
    }
  };

  useEffect(() => {
    // Recuperar sesión al cargar
    const savedToken = Cookies.get('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);

    // Verificar el estado de mantenimiento al entrar al sitio/login (cargar bypass rules solo si está activo)
    checkStatus();

    // Sincronizar logout y cambio de cuenta entre pestañas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_user') {
        if (!e.newValue) {
          console.warn('[SESSION] Sesión cerrada en otra pestaña. Redirigiendo...');
          setToken(null);
          setUser(null);
          Cookies.remove('auth_token', { path: '/' });
          window.location.replace(`/login?cb=${Date.now()}&reason=logged_out`);
        } else {
          try {
            const newUserObj = JSON.parse(e.newValue);
            const savedToken = Cookies.get('auth_token');
            // Si el ID del usuario cambió en otra pestaña, forzar recarga para sincronizar estados
            if (newUserObj && user && newUserObj.id !== user.id) {
              console.warn('[SESSION] Sesión cambiada a otro usuario en otra pestaña. Sincronizando...');
              window.location.reload();
            }
          } catch (err) {
            // Ignorar errores de parseo
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!estimatedEnd) {
      setCountdownText('00:00:00');
      return;
    }

    const updateTimer = () => {
      const targetTime = new Date(estimatedEnd).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdownText('00:00:00');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n: number) => String(n).padStart(2, '0');
      setCountdownText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [estimatedEnd]);

  useEffect(() => {
    if (!maintenanceMode) return;

    // Polling cada 5 segundos para verificar si el mantenimiento terminó
    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [maintenanceMode]);

  // Forzar cierre de sesión si el modo mantenimiento está activo y el usuario actual no es de sistema (system_user)
  const maintenanceLogoutFired = useRef(false);

  useEffect(() => {
    if (!maintenanceMode || !user || user.actorType === 'system_user') {
      maintenanceLogoutFired.current = false;
      return;
    }
    // Si la ruta actual está en las excepciones de página, no cerrar sesión
    const isBypass = bypassPages.some(p => pathname === p || pathname?.startsWith(p + '/'));
    if (isBypass) return;

    if (maintenanceLogoutFired.current) return;
    maintenanceLogoutFired.current = true;

    console.warn('[SESSION] Sistema en mantenimiento. Forzando logout de usuario regular...');
    logout('maintenance_active');
  }, [maintenanceMode, user, bypassPages, pathname]);

  useEffect(() => {
    if (!isOffline) return;

    // Polling cada 3 segundos para verificar si el servidor volvió en línea
    const checkServerOnline = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/health`);
        if (res.data && res.data.status === 'ok') {
          console.log('[SESSION] Servidor recuperado. Forzando recarga de página...');
          setIsOffline(false);
          window.location.reload();
        }
      } catch (err) {
        // Seguir intentando en silencio
      }
    };

    const interval = setInterval(checkServerOnline, 3000);
    return () => clearInterval(interval);
  }, [isOffline]);

  const login = async (email: string, password: string) => {
    try {
      const endpoint = `${API_URL}/api/auth/login`;

      const response = await axios.post(endpoint, { email, password });
      const { token, user } = response.data;

      setToken(token);
      setUser(user);

      // Persistencia
      Cookies.set('auth_token', token, { expires: 1, path: '/' }); // 1 día
      localStorage.setItem('auth_user', JSON.stringify(user));

      // Redirección por roles y tipo de actor
      if (user.actorType === 'system_user') {
        router.push('/admin/dashboard');
      } else if (user.actorType === 'operator') {
        router.push('/commerce/store-admins');
      } else {
        // actorType === 'user'
        if (user.rol === 'admin' || user.roles?.includes('commerce_manager') || user.roles?.includes('store_admin') || user.roles?.includes('delivery_company_admin')) {
          if (user.adminType === 'commerce' || user.roles?.includes('commerce_manager')) {
            router.push('/commerce/dashboard');
          } else if (user.adminType === 'store' || user.roles?.includes('store_admin')) {
            router.push('/commerce/dashboard');
          } else if (user.adminType === 'delivery_company' || user.roles?.includes('delivery_company_admin')) {
            router.push('/delivery-company/dashboard');
          } else {
            router.push('/commerce/dashboard');
          }
        } else if (user.rol === 'delivery' || user.roles?.includes('driver')) {
          router.push('/delivery/orders');
        } else if (user.rol === 'customer' || user.roles?.includes('customer')) {
          router.push('/app/home');
        } else {
          router.push('/');
        }
      }
    } catch (error: any) {
      if (error.response?.status === 503) {
        // Silenciar error para evitar toast rojo (el interceptor ya configuró el estado de mantenimiento)
        throw new Error('mantenimiento_silent');
      }
      // Si el login fue rechazado con 403 (mantenimiento activo), sincronizar el estado y silenciar error
      if (error.response?.status === 403 && (error.response?.data?.error?.includes('mantenimiento') || error.response?.data?.error?.includes('Mantenimiento'))) {
        await checkStatus();
        throw new Error('mantenimiento_silent');
      }
      if (error.response?.status === 403) {
        await checkStatus();
      }
      console.error('Login error:', error.response?.data?.error || error.message);
      throw new Error(error.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  const refreshSession = async () => {
    const savedToken = Cookies.get('auth_token') || token;
    if (!savedToken) return;

    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        const response = await axios.post(
          `${API_URL}/api/auth/refresh-session`,
          {},
          {
            headers: { Authorization: `Bearer ${savedToken}` }
          }
        );
        const { token: newToken, user: newUser } = response.data;

        setToken(newToken);
        setUser(newUser);

        Cookies.set('auth_token', newToken, { expires: 1, path: '/' });
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        console.log('Sesión refrescada dinámicamente. Permisos:', newUser.permissions);
      } catch (error: any) {
        console.error('Error refreshing session:', error.response?.data?.error || error.message);
        if (error.response?.status === 403 || error.response?.status === 401 || error.response?.status === 440) {
          logout('session_expired');
        }
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  };

  const logout = (reason?: 'session_expired' | 'logged_out' | 'security_update' | any) => {
    const savedUserStr = localStorage.getItem('auth_user');
    let redirectPath = '/login';

    // Limpiar caché global de TanStack Query para evitar fuga de datos (BOLA) entre sesiones
    try {
      queryClient.clear();
    } catch (err) {
      console.error('Error al limpiar la caché de QueryClient en logout:', err);
    }

    setToken(null);
    setUser(null);
    Cookies.remove('auth_token', { path: '/' });
    localStorage.removeItem('auth_user');
    
    let url = `${redirectPath}?cb=${Date.now()}`;
    if (reason && typeof reason === 'string') {
      url += `&reason=${reason}`;
    }
    window.location.replace(url);
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (!error.response) {
          const isCoreApi = error.config?.url && error.config.url.startsWith(API_URL);
          const isCancel = axios.isCancel(error) || error.code === 'ERR_CANCELED' || error.message === 'canceled';
          if (!isCancel && isCoreApi) {
            console.warn('[SESSION] Servidor core fuera de línea o error de red');
            setIsOffline(true);
          }
          return Promise.reject(error);
        }
        if (error.response?.status === 503 && error.response?.data?.code === 'SYSTEM_IN_MAINTENANCE') {
          console.warn('[SESSION] Servidor en mantenimiento');
          const details = error.response?.data;
          setMaintenanceMessage(details.error || 'Servicio temporalmente no disponible por mantenimiento.');
          setEstimatedEnd(details.estimated_end || null);
          setMaintenanceMode(true);



          return Promise.reject(error);
        }
        if (
          (error.response?.status === 440 && error.response?.data?.code === 'SESSION_INVALIDATED') ||
          (error.response?.status === 400 && error.response?.data?.error === 'Token inválido')
        ) {
          console.warn('[SESSION] Sesión invalidada. Forzando logout limpio y recarga de seguridad...');
          logout('session_expired');
          return Promise.reject(error);
        }
        if (error.response?.status === 403 && (Cookies.get('auth_token') || token)) {
          console.warn('Acceso denegado (403). Sincronizando permisos con el servidor...');
          try {
            await refreshSession();
          } catch (refreshError) {
            console.error('Error al intentar refrescar sesión desde interceptor:', refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [token, router]);

  const isBypassPage = bypassPages.some(pattern => {
    if (pattern === '/') return pathname === '/';
    return pathname === pattern || pathname?.startsWith(pattern + '/');
  });

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshSession, isLoading, maintenanceMode, triggerMaintenance, isOffline }}>
      {isOffline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.6) 0%, rgba(10, 10, 10, 0.8) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '48px',
            borderRadius: '32px',
            textAlign: 'center',
            maxWidth: '440px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(16, 185, 129, 0.1)',
              borderTopColor: '#10b981',
              borderRadius: '50%',
              animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.1, 0.9) infinite',
              margin: '0 auto 24px auto'
            }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.03em', color: '#fff', marginBottom: '12px' }}>
              Optimizando Canal de Datos
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.45)', marginBottom: '0', lineHeight: '1.6', fontWeight: '500' }}>
              Sincronizando de forma segura con el nodo de transacciones. Por favor espera un instante mientras se restablece el flujo del sistema.
            </p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}
      {maintenanceMode && !(user && user.actorType === 'system_user') && !isBypassPage && (
        <MaintenanceOverlay>
          <MaintenanceCard>
            <GlowLogo>
              <PulseCircle />
              <CubeIcon>N</CubeIcon>
            </GlowLogo>
            <MaintenanceTitle>OPTIMIZACIÓN DEL SISTEMA</MaintenanceTitle>
            <MaintenanceText>
              {maintenanceMessage || 'Estamos aplicando mejoras de seguridad y estabilidad en los servidores financieros. Los servicios se restablecerán en breves instantes.'}
            </MaintenanceText>
            <ProgressBarWrapper>
              <ProgressBarAnimated />
            </ProgressBarWrapper>
            <ProgressText>Resguardando integridad y consistencia de transacciones...</ProgressText>
            <CountdownTimer>{countdownText}</CountdownTimer>
          </MaintenanceCard>
        </MaintenanceOverlay>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const MaintenanceOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MaintenanceCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(0, 255, 128, 0.15);
  border-radius: 16px;
  padding: 3rem 2.5rem;
  max-width: 480px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 128, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  position: relative;
`;

const GlowLogo = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
`;

const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0, 255, 128, 0.4); }
  70% { transform: scale(1.1); opacity: 0.9; box-shadow: 0 0 0 20px rgba(0, 255, 128, 0); }
  100% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0, 255, 128, 0); }
`;

const PulseCircle = styled.div`
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0, 255, 128, 0.1);
  border: 2px solid #00ff80;
  animation: ${pulse} 2s infinite ease-in-out;
  z-index: 1;
`;

const CubeIcon = styled.div`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #00ff80 0%, #00aa50 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: 800;
  font-size: 1.5rem;
  z-index: 2;
  box-shadow: 0 0 15px rgba(0, 255, 128, 0.4);
`;

const MaintenanceTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1.5px;
  margin: 0;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
`;

const MaintenanceText = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
`;

const ProgressBarWrapper = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin-top: 0.5rem;
`;

const shimmer = keyframes`
  0% { left: -40%; }
  100% { left: 100%; }
`;

const ProgressBarAnimated = styled.div`
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, #00ff80, transparent);
  position: absolute;
  animation: ${shimmer} 1.8s infinite linear;
`;

const ProgressText = styled.span`
  font-size: 0.8rem;
  color: rgba(0, 255, 128, 0.7);
  letter-spacing: 0.5px;
  font-weight: 500;
`;

const CountdownTimer = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #00ff80;
  font-family: monospace;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0, 255, 128, 0.3);
  margin-top: 0.5rem;
`;
