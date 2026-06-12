'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertModal } from '@/components/Common/AlertModal';

interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
  zIndex?: number;
}

interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions & { isConfirm?: boolean }>({ message: '' });

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions({ ...opts, isConfirm: false });
    setIsOpen(true);
  }, []);

  const showConfirm = useCallback((opts: ConfirmOptions) => {
    setOptions({ ...opts, isConfirm: true });
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (options.onConfirm) {
      options.onConfirm();
    }
  }, [options]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (options.onCancel) {
      options.onCancel();
    }
  }, [options]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertModal
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        onCancel={options.isConfirm ? handleCancel : undefined}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        zIndex={options.zIndex}
        isDismissible={!options.isConfirm}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
