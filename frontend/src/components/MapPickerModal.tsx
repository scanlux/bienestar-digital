'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  ModalOverlay, ModalContent, ModalHeader, ModalTitle,
  CloseButton, SubmitButton, GeoButton
} from './Common/ModalStyles';
import { Spinner } from './Common/UIElements';
import { useModalScroll } from '@/hooks/useModalScroll';
import { GOOGLE_MAPS_API_KEY } from '@/constants';

interface MapPickerProps {
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function MapPickerModal({ onClose, onConfirm, initialLat, initialLng }: MapPickerProps) {
  useModalScroll(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const [markerPos, setMarkerPos] = useState({ lat: initialLat || 4.6097, lng: initialLng || -74.0817 });
  const [isGeolocationLoading, setIsGeolocationLoading] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const googleMapRef = useRef<any>(null);

  useEffect(() => {
    const loadMap = () => {
      // @ts-ignore
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => initMap();
      } else {
        initMap();
      }
    };

    const initMap = () => {
      if (!mapRef.current) return;
      // @ts-ignore
      const map = new google.maps.Map(mapRef.current, {
        center: markerPos,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
          { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
          { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
          { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
          { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
          { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
          { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
        ]
      });
      googleMapRef.current = map;

      // Eventos para detectar movimiento y actualizar coordenadas
      map.addListener('dragstart', () => setIsMoving(true));
      map.addListener('idle', () => setIsMoving(false));
      
      map.addListener('center_changed', () => {
        const center = map.getCenter();
        setMarkerPos({ lat: center.lat(), lng: center.lng() });
      });

      setIsMapLoaded(true);
    };

    loadMap();
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGeolocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (googleMapRef.current) {
          googleMapRef.current.panTo(newPos);
          googleMapRef.current.setZoom(18);
        }
        setIsGeolocationLoading(false);
      },
      () => setIsGeolocationLoading(false)
    );
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent
        onClick={e => e.stopPropagation()}
        $maxWidth="95%"
        style={{
          height: '88vh',
          maxWidth: '65vw',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <ModalHeader style={{ marginBottom: '1rem' }}>
          <div>
            <ModalTitle>Seleccionar Ubicación Exacta</ModalTitle>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              Mueve el mapa hasta situar el pin central en la entrada de la sede
            </div>
          </div>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <MapContainer>
          {!isMapLoaded && (
            <div className="loader-overlay">
              <Spinner />
            </div>
          )}
          <div ref={mapRef} className="map-div" style={{ opacity: isMapLoaded ? 1 : 0 }} />

          {isMapLoaded && (
            <>
              {/* PIN CENTRAL FIJO */}
              <FixedMarkerWrapper $isMoving={isMoving}>
                <svg viewBox="0 0 24 24" className="pin-svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                </svg>
                <div className="pin-shadow" />
              </FixedMarkerWrapper>

              <div className="controls-overlay">
                <GeoButton 
                  type="button" 
                  onClick={handleGetCurrentLocation} 
                  disabled={isGeolocationLoading}
                  className="location-btn"
                >
                  {isGeolocationLoading ? 'Obteniendo...' : '📍 Mi ubicación actual'}
                </GeoButton>
              </div>
            </>
          )}
        </MapContainer>

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' }}>Latitud</span>
              <span style={{ fontSize: '0.9rem', color: '#fff', fontFamily: 'monospace' }}>{markerPos.lat.toFixed(8)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' }}>Longitud</span>
              <span style={{ fontSize: '0.9rem', color: '#fff', fontFamily: 'monospace' }}>{markerPos.lng.toFixed(8)}</span>
            </div>
          </div>

          <div style={{ width: '200px' }}>
            <SubmitButton onClick={() => onConfirm(markerPos.lat, markerPos.lng)}>
              Confirmar Ubicación
            </SubmitButton>
          </div>
        </div>
      </ModalContent>
    </ModalOverlay>
  );
}

// ESTILOS LOCALES
const MapContainer = styled.div`
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255,255,255,0.1);
  background: #0e0e0e;

  .map-div {
    width: 100%;
    height: 100%;
    transition: opacity 0.3s;
  }

  .loader-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }

  .controls-overlay {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    width: auto;

    .location-btn {
      background: #10b981;
      opacity: 1;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.3);
      whiteSpace: nowrap;
      padding: 0.8rem 1.5rem;
      fontSize: 0.9rem;
      color: #000;
      font-weight: 700;
    }
  }
`;

const bounce = keyframes`
  0%, 100% { transform: translate(-50%, -100%); }
  50% { transform: translate(-50%, -120%); }
`;

const shadowPulse = keyframes`
  0%, 100% { transform: translate(-50%, 0) scale(1); opacity: 0.4; }
  50% { transform: translate(-50%, 0) scale(0.6); opacity: 0.1; }
`;

const FixedMarkerWrapper = styled.div<{ $isMoving: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 100;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;

  .pin-svg {
    width: 48px;
    height: 48px;
    color: #ef4444;
    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));
    transform: translate(-50%, -100%);
    transition: transform 0.2s ease-out;
  }

  .pin-shadow {
    width: 10px;
    height: 4px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, 0);
    z-index: -1;
  }
`;
