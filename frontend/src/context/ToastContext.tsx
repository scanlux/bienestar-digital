'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FloatingSuccessToast, FloatingErrorToast } from '@/components/Common/Toasts';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById('modal-portal-root'));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const success = (message: string) => addToast(message, 'success');
  const error = (message: string) => addToast(message, 'error');

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      {portalTarget && createPortal(
        <div style={{ pointerEvents: 'none' }}>
          {toasts.map((toast) => (
            <div key={toast.id} style={{ pointerEvents: 'auto' }}>
              {toast.type === 'success' ? (
                <FloatingSuccessToast message={toast.message} onClose={() => removeToast(toast.id)} />
              ) : (
                <FloatingErrorToast message={toast.message} onClose={() => removeToast(toast.id)} />
              )}
            </div>
          ))}
        </div>,
        portalTarget
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
