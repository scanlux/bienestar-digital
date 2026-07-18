'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';

export interface SystemNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: number;
  created_at: string;
}

interface NotificationContextType {
  notifications: SystemNotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/notifications`, { headers });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [token]);

  const markRead = useCallback(async (id: number) => {
    if (!token) return;
    try {
      const headers = getAuthHeaders();
      await axios.patch(`${API_URL}/api/notifications/${id}/read`, {}, { headers });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [token]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      const headers = getAuthHeaders();
      await axios.patch(`${API_URL}/api/notifications/read-all`, {}, { headers });
      setNotifications([]);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token && user) {
      fetchNotifications();
      // Refrescar cada 60s
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [token, user, fetchNotifications]);

  const unreadCount = notifications.length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  return context || null;
};
