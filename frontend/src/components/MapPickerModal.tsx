'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  z-index: 3000;
`;

const ModalContent = styled.div`
  background: #121212;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 700px;
  height: 600px;
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  animation: ${fadeIn} 0.3s ease;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  color: #fff;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5rem;
  cursor: pointer;
  &:hover { color: #fff; }
`;

const GeoButton = styled.button`
  background: #fff;
  border: none;
  color: #000;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,255,255,0.2); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SubmitButton = styled.button`
  background: #10b981;
  color: #000;
  padding: 0.6rem 2rem;
  border-radius: 6px;
  border: none;
  font-weight: 700;
  cursor: pointer;
  &:hover { background: #059669; }
`;

interface MapPickerProps {
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function MapPickerModal({ onClose, onConfirm, initialLat, initialLng }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [markerPos, setMarkerPos] = useState({ lat: initialLat || 4.6097, lng: initialLng || -74.0817 });
  const [isGeolocationLoading, setIsGeolocationLoading] = useState(false);
  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);

  useEffect(() => {
    const loadMap = () => {
      // @ts-ignore
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`;
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
        zoom: 15,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
        ]
      });
      googleMapRef.current = map;

      // @ts-ignore
      const marker = new google.maps.Marker({
        position: markerPos,
        map: map,
        draggable: true,
        // @ts-ignore
        animation: google.maps.Animation.DROP
      });
      googleMarkerRef.current = marker;

      map.addListener('click', (e: any) => {
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(pos);
        setMarkerPos(pos);
      });

      marker.addListener('dragend', () => {
        const pos = { lat: marker.getPosition()!.lat(), lng: marker.getPosition()!.lng() };
        setMarkerPos(pos);
      });
    };

    loadMap();
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGeolocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMarkerPos(newPos);
        
        if (googleMapRef.current && googleMarkerRef.current) {
          googleMapRef.current.setCenter(newPos);
          googleMapRef.current.setZoom(17);
          googleMarkerRef.current.setPosition(newPos);
        }
        setIsGeolocationLoading(false);
      },
      () => setIsGeolocationLoading(false)
    );
  };

  return (
    <ModalOverlay>
       <ModalContent>
          <ModalHeader>
             <ModalTitle>Seleccionar Ubicación Exacta</ModalTitle>
             <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>
          <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
             <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
             <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
                <GeoButton type="button" onClick={handleGetCurrentLocation} disabled={isGeolocationLoading}>
                   {isGeolocationLoading ? 'Obteniendo...' : '📍 Mi ubicación actual'}
                </GeoButton>
             </div>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                LAT: {markerPos.lat.toFixed(6)} <br/>
                LNG: {markerPos.lng.toFixed(6)}
             </div>
             <SubmitButton onClick={() => onConfirm(markerPos.lat, markerPos.lng)}>
                Confirmar Ubicación
             </SubmitButton>
          </div>
       </ModalContent>
    </ModalOverlay>
  );
}
