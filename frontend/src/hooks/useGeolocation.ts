import { useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface UseGeolocationOptions {
  onCoordsConfirmed: (lat: number, lng: number) => void;
  onCoordsFromPermission?: (lat: number, lng: number) => void;
}

/**
 * Hook centralizado para el flujo de geolocalizacion:
 * 1. Verificar permisos del navegador
 * 2. Mostrar advertencia si es necesario
 * 3. Abrir el MapPicker cuando se otorga permiso
 * 4. Confirmar coordenadas seleccionadas
 */
export const useGeolocation = ({ onCoordsConfirmed, onCoordsFromPermission }: UseGeolocationOptions) => {
  const toast = useToast();
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showGeoWarning, setShowGeoWarning] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'denied' | 'default'>('default');

  const handleOpenMapPicker = async () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalizacion');
      return;
    }

    try {
      // @ts-ignore
      const result = await navigator.permissions.query({ name: 'geolocation' });

      if (result.state === 'granted') {
        setShowMapPicker(true);
      } else {
        setGeoStatus(result.state);
        setShowGeoWarning(true);
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
    } catch (err) {
      setShowGeoWarning(true);
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }
  };

  const handleContinueGeoFlow = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (onCoordsFromPermission) {
          onCoordsFromPermission(lat, lng);
        }
        setShowGeoWarning(false);
        setShowMapPicker(true);
      },
      () => {
        setShowGeoWarning(false);
      }
    );
  };

  const handleConfirmCoords = (lat: number, lng: number) => {
    onCoordsConfirmed(lat, lng);
    setShowMapPicker(false);
  };

  return {
    showMapPicker,
    setShowMapPicker,
    showGeoWarning,
    setShowGeoWarning,
    geoStatus,
    handleOpenMapPicker,
    handleContinueGeoFlow,
    handleConfirmCoords,
  };
};
