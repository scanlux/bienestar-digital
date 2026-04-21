'use client';

import { useEffect } from 'react';

/**
 * useModalScroll - Hook simplificado para el bloqueo de scroll en modales.
 * 
 * Este hook se encarga únicamente de bloquear el scroll del fondo cuando un modal está abierto.
 * La navegación de regreso se delega a la lógica de la página (Scroll to Target).
 */
export function useModalScroll(isOpen: boolean) {
  useEffect(() => {
    const scrollContainer = document.getElementById('admin-scroll-container') || document.documentElement;
    const isBody = scrollContainer === document.documentElement;

    if (isOpen) {
      if (isBody) {
        document.body.style.overflow = 'hidden';
      } else {
        scrollContainer.style.overflow = 'hidden';
      }
    } else {
      if (isBody) {
        document.body.style.overflow = '';
      } else {
        scrollContainer.style.overflow = 'auto';
      }
    }

    // Cleanup: garantiza que el scroll se desbloquee siempre al desmontar
    return () => {
      if (isBody) {
        document.body.style.overflow = '';
      } else if (scrollContainer) {
        scrollContainer.style.overflow = 'auto';
      }
    };
  }, [isOpen]);
}
