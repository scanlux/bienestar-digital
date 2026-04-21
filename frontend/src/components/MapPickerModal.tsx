'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, 
  CloseButton, SubmitButton, GeoButton, Spinner 
} from './Common/ModalStyles';
import { useModalScroll } from '@/hooks/useModalScroll';

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
        disableDefaultUI: false,
        zoomControl: true,
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
    <ModalOverlay onClick={onClose}>
       <ModalContent onClick={e => e.stopPropagation()} $maxWidth="850px" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
          <ModalHeader>
             <div>
                <ModalTitle>Seleccionar Ubicación Exacta</ModalTitle>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                   Arrastra el marcador o haz click en el mapa para situar la sede
                </div>
             </div>
             <CloseButton onClick={onClose}>✕</CloseButton>
          </ModalHeader>

          <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)', background: '#0e0e0e' }}>
             {!isMapLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                   <Spinner />
                </div>
             )}
             <div ref={mapRef} style={{ width: '100%', height: '100%', opacity: isMapLoaded ? 1 : 0, transition: 'opacity 0.3s' }} />
             
             {isMapLoaded && (
                <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
                   <GeoButton type="button" onClick={handleGetCurrentLocation} disabled={isGeolocationLoading}>
                      {isGeolocationLoading ? 'Obteniendo...' : '📍 Mi ubicación actual'}
                   </GeoButton>
                </div>
             )}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
