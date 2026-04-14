'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  nombre: string;
  rol: 'admin' | 'vendor' | 'customer' | 'delivery';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'https://trendy.sytes.net';

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

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token, user } = response.data;

      setToken(token);
      setUser(user);

      // Persistencia
      Cookies.set('auth_token', token, { expires: 1 }); // 1 día
      localStorage.setItem('auth_user', JSON.stringify(user));

      // Redirección por roles
      switch (user.rol) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'vendor':
          router.push('/vendor/dashboard');
          break;
        case 'delivery':
          router.push('/delivery/orders');
          break;
        case 'customer':
          router.push('/app/home');
          break;
        default:
          router.push('/');
      }
    } catch (error: any) {
      console.error('Login error:', error.response?.data?.error || error.message);
      throw new Error(error.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    Cookies.remove('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
