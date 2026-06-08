'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/constants';


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
  logout: () => void;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Recuperar sesión al cargar
    const savedToken = Cookies.get('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

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
      console.error('Login error:', error.response?.data?.error || error.message);
      throw new Error(error.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  const refreshSession = async () => {
    const savedToken = Cookies.get('auth_token') || token;
    if (!savedToken) return;

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
      if (error.response?.status === 403 || error.response?.status === 401) {
        logout();
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    Cookies.remove('auth_token', { path: '/' });
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
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
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshSession, isLoading }}>
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
