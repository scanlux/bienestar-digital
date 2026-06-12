import { useState, useRef, useCallback } from 'react';

interface UseCardHighlightOptions {
  shieldDuration?: number;
  scrollDelay?: number;
}

/**
 * Hook reutilizable para gestionar el resaltado visual persistente de tarjetas
 * (Comercios, Sedes, Productos) con sincronización de pantalla (scroll) y
 * escudo de transición (TransitionShield).
 * 
 * Cumple con la directiva de la Metodología Frontend de "Resaltado Ámbar Permanente" (#eab308).
 */
export function useCardHighlight(options: UseCardHighlightOptions = {}) {
  const {
    shieldDuration = 1200,
    scrollDelay = 200,
  } = options;

  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('Sincronizando...');

  /**
   * Dispara el flujo completo de resaltado:
   * 1. Activa el escudo de transición con un mensaje personalizado.
   * 2. Registra el ID resaltado de forma persistente.
   * 3. Ejecuta una función callback antes del scroll (ej. abrir acordeones).
   * 4. Desplaza la pantalla suavemente hacia el elemento.
   * 5. Oculta el escudo tras cumplirse la duración de seguridad.
   */
  const triggerHighlightFlow = useCallback((
    id: number,
    elementIdPrefix: string,
    message: string = 'Sincronizando...',
    onBeforeScroll?: () => void,
    showShield: boolean = false
  ) => {
    setHighlightedId(id);
    if (showShield) {
      setTransitionMessage(message);
      setTransitionLoading(true);
    }

    if (onBeforeScroll) {
      onBeforeScroll();
    }

    // Retraso controlado para permitir que el DOM se renderice (ej. acordeón abriéndose)
    setTimeout(() => {
      const element = document.getElementById(`${elementIdPrefix}-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, scrollDelay);

    // Ocultar el escudo de transición tras finalizar la animación si estaba activo
    if (showShield) {
      setTimeout(() => {
        setTransitionLoading(false);
      }, shieldDuration);
    }
  }, [scrollDelay, shieldDuration]);

  /**
   * Limpia el resaltado activo si coincide con el ID provisto,
   * o limpia todo si no se pasa ningún ID.
   */
  const clearHighlight = useCallback((id?: number) => {
    if (id === undefined) {
      setHighlightedId(null);
    } else {
      setHighlightedId(prev => (prev === id ? null : prev));
    }
  }, []);

  return {
    highlightedId,
    setHighlightedId,
    transitionLoading,
    setTransitionLoading,
    transitionMessage,
    setTransitionMessage,
    triggerHighlightFlow,
    clearHighlight,
  };
}
