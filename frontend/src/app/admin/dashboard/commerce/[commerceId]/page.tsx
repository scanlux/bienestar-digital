'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingState, Spinner, HeaderBackButton } from '@/components/Common/UIElements';
import { FloatingSuccessToast, FloatingErrorToast } from '@/components/Common/Toasts';
import { useToast } from '@/context/ToastContext';
import { getAuthHeaders } from '@/utils/auth';
import { formatTime } from '@/utils';
import { API_URL } from '@/constants';
import {
  PageWrapper, HeaderSection, BackButton, TitleSection, SubtitleText,
  CreateButton, StoresGrid, StoreCard, CardContent, CardHeader, Badge,
  CardFooter, FooterButton, EmptyMessage
} from './StoresManagementStyles';
import MapPickerModal from '@/components/MapPickerModal';
import GeoPermissionModal from '@/components/Common/GeoPermissionModal';
import { useModalScroll } from '@/hooks/useModalScroll';
import { useGeolocation } from '@/hooks/useGeolocation';
import { StoreFormModal } from '@/components/Common/StoreFormModal';
export default function StoresManagementPage({ params }: { params: { commerceId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentPlatforms, setPaymentPlatforms] = useState<any[]>([]);
  const toast = useToast();
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);

  // Hook de geolocalizacion centralizado
  const geo = useGeolocation({
    onCoordsConfirmed: () => {},
    onCoordsFromPermission: () => {}
  });

  useModalScroll(isModalOpen);
  useModalScroll(geo.showMapPicker);
  useModalScroll(geo.showGeoWarning);

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
    fetchPlatforms();
  }, []);

  useEffect(() => {
    fetchStores();
  }, [params.commerceId]);

  const fetchPlatforms = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/manage/payment-platforms`, {
        headers: getAuthHeaders()
      });
      setPaymentPlatforms(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/manage/stores/${params.commerceId}`, {
        headers: getAuthHeaders()
      });
      setStores(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <HeaderBackButton onClick={() => router.push('/admin/dashboard/commerce')}>
        ← Volver
      </HeaderBackButton>
      <HeaderSection>
        <div>
          <TitleSection>
            Sedes Físicas <span>Activas</span>
          </TitleSection>
          <SubtitleText>Gestiona los locales comerciales para el comercio seleccionado.</SubtitleText>
        </div>
        
        <CreateButton onClick={() => setIsModalOpen(true)}>
          + Nueva Sede
        </CreateButton>
      </HeaderSection>

      {loading ? (
        <LoadingState>
          <Spinner />
          <p>Cargando sedes...</p>
        </LoadingState>
      ) : (
        <StoresGrid>
          {stores.map((store) => (
            <StoreCard key={store.id}>
              <div className="card-overlay" />
              <CardContent>
                <CardHeader>
                  <h3>{store.nombre_sucursal}</h3>
                  <div className="badges">
                    {typeof store.is_currently_open === 'boolean' && (
                      <Badge className={store.is_currently_open ? 'open-now' : 'closed'}>
                        {store.is_currently_open ? 'Abierto Ahora' : 'Cerrado'}
                      </Badge>
                    )}
                    <Badge className={store.estado === 'abierto' ? 'open' : 'inactive'}>
                      {store.estado}
                    </Badge>
                  </div>
                </CardHeader>
                <div className="info-group">
                  <p><span className="icon">📍</span> {store.direccion}</p>
                  <p className="schedule">
                    <span className="icon">🕒</span> 
                    {(() => {
                         const currentDay = new Date().getDay();
                         const todaySchedule = store.schedule?.find((s: any) => s.day_index === currentDay);
                         
                         if (!todaySchedule) return 'Sin horario asignado';
                         if (todaySchedule.status !== 'abierto') return 'Cerrado hoy';
                         if (todaySchedule.is_24h) {
                           const hasMaintenance = todaySchedule.open_time && todaySchedule.close_time && todaySchedule.open_time !== todaySchedule.close_time;
                           return hasMaintenance 
                             ? `24 Horas (Mant: ${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)})`
                             : '24 Horas';
                         }
                         if (todaySchedule.open_time && todaySchedule.close_time) {
                           return `${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)}`;
                         }
                         return 'Sin horario definido';
                    })()}
                  </p>
                </div>
                
                <div className="card-footer">
                  <FooterButton onClick={() => router.push(`/admin/dashboard/stores/${store.id}`)}>
                    Menús y Productos →
                  </FooterButton>
                </div>
              </CardContent>
            </StoreCard>
          ))}
          
          {stores.length === 0 && (
             <EmptyMessage>
                 No hay sedes registradas para este comercio. <br/>
                 <span>Usa el botón superior para crear una sucursal.</span>
             </EmptyMessage>
          )}
        </StoresGrid>
      )}

      <StoreFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchStores();
        }}
        initialData={undefined}
        commerceId={Number(params.commerceId)}
        paymentPlatforms={paymentPlatforms}
        modalTarget={modalTarget}
        onOpenMapPicker={geo.handleOpenMapPicker}
        lat={undefined}
        lng={undefined}
      />

      {geo.showMapPicker && modalTarget && createPortal(
        <MapPickerModal
          onClose={() => geo.setShowMapPicker(false)}
          onConfirm={geo.handleConfirmCoords}
          initialLat={undefined}
          initialLng={undefined}
        />,
        modalTarget
      )}

      {geo.showGeoWarning && modalTarget && createPortal(
        <GeoPermissionModal
          status={geo.geoStatus}
          onContinue={geo.handleContinueGeoFlow}
          onClose={() => geo.setShowGeoWarning(false)}
        />,
        modalTarget
      )}

    </PageWrapper>
  );
}


