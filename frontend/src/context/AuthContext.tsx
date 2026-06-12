'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import { API_URL } from '@/constants';
import { AlertModal } from '@/components/Common/AlertModal';


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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let activeRefreshPromise: Promise<void> | null = null;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [countdownText, setCountdownText] = useState('00:00:00');
  const [maintenanceMessage, setMaintenanceMessage] = useState('El sistema se encuentra en modo mantenimiento por reinicio de servicios.');
  const [estimatedEnd, setEstimatedEnd] = useState<string | null>(null);
  const triggerMaintenance = () => setMaintenanceMode(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/public/maintenance-status`);
      if (!res.data.maintenanceMode) {
        setMaintenanceMode(false);
        setEstimatedEnd(null);
      } else {
        setMaintenanceMessage(res.data.details?.message || 'El sistema se encuentra en modo mantenimiento por reinicio de servicios.');
        setEstimatedEnd(res.data.details?.estimated_end || null);
        setMaintenanceMode(true);

        // Si el usuario actual está logueado y no es de sistema, forzar logout inmediato
        const savedUser = localStorage.getItem('auth_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser && parsedUser.actorType !== 'system_user') {
              console.warn('[SESSION] Usuario no es administrador del sistema en checkStatus. Forzando logout.');
              logout();
            }
          } catch (e) {
            logout();
          }
        }
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

    // Verificar el estado de mantenimiento al entrar al sitio/login
    checkStatus();

    // Sincronizar logout entre pestañas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_user' && !e.newValue) {
        console.warn('[SESSION] Sesión cerrada en otra pestaña. Redirigiendo...');
        let redirectPath = '/login';
        if (e.oldValue) {
          try {
            const oldUser = JSON.parse(e.oldValue);
            if (oldUser?.actorType === 'operator') {
              redirectPath = '/logino';
            } else if (oldUser?.actorType === 'system_user') {
              redirectPath = '/logins';
            }
          } catch (err) {
            // Ignorar
          }
        }
        setToken(null);
        setUser(null);
        Cookies.remove('auth_token', { path: '/' });
        window.location.replace(`${redirectPath}?cb=${Date.now()}&reason=logged_out`);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!estimatedEnd) return;

    const updateTimer = () => {
      const targetTime = new Date(estimatedEnd).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        // Reiniciar 2 minutos más si el mantenimiento sigue activo en el servidor
        const extendedTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        setEstimatedEnd(extendedTime);
        checkStatus();
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

  const login = async (email: string, password: string, loginType: 'business' | 'operator' | 'system' = 'business') => {
    try {
      let endpoint = `${API_URL}/api/auth/login`;
      if (loginType === 'operator') {
        endpoint = `${API_URL}/api/auth/operator-login`;
      } else if (loginType === 'system') {
        endpoint = `${API_URL}/api/auth/system-login`;
      }

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
            if (user.storeIds && user.storeIds.length > 0) {
              router.push(`/commerce/stores/${user.storeIds[0]}`);
            } else {
              router.push('/commerce/dashboard');
            }
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
      if (error.response?.status === 503 && error.response?.data?.code === 'SYSTEM_IN_MAINTENANCE') {
        // Silenciar error para evitar toast rojo
        return;
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
    
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser?.actorType === 'operator') {
          redirectPath = '/logino';
        } else if (savedUser?.actorType === 'system_user') {
          redirectPath = '/logins';
        }
      } catch (e) {
        // Ignorar
      }
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
        if (error.response?.status === 503 && error.response?.data?.code === 'SYSTEM_IN_MAINTENANCE') {
          console.warn('[SESSION] Servidor en mantenimiento');
          const details = error.response?.data;
          setMaintenanceMessage(details.error || 'Servicio temporalmente no disponible por mantenimiento.');
          setEstimatedEnd(details.estimated_end || null);
          setMaintenanceMode(true);

          // Si el usuario actual está logueado y no es de sistema, forzar logout inmediato
          const savedUser = localStorage.getItem('auth_user');
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              if (parsedUser && parsedUser.actorType !== 'system_user') {
                console.warn('[SESSION] Usuario no es administrador del sistema. Forzando cierre de sesión por mantenimiento.');
                logout();
              }
            } catch (e) {
              logout();
            }
          }

          return Promise.reject(error);
        }
        if (error.response?.status === 440 && error.response?.data?.code === 'SESSION_INVALIDATED') {
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

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshSession, isLoading, maintenanceMode, triggerMaintenance }}>
      {children}
      <AlertModal 
        isOpen={maintenanceMode && (pathname === '/login' || pathname === '/logino')} 
        onClose={() => setMaintenanceMode(false)} 
        onConfirm={() => setMaintenanceMode(false)} 
        title="Mantenimiento en Progreso"
        message={`${maintenanceMessage}\n\nTiempo restante estimado: ${countdownText}`}
        confirmText="Entendido"
        zIndex={5000}
        isDismissible={true}
      />
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
