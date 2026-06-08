'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// Componentes Comunes
import MapPickerModal from '@/components/MapPickerModal';
import GeoPermissionModal from '@/components/Common/GeoPermissionModal';
import { useModalScroll } from '@/hooks/useModalScroll';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ActionButton, TransitionShield, LoadingState, Spinner } from '@/components/Common/UIElements';
import { useToast } from '@/context/ToastContext';
import { StoreFormModal } from '@/components/Common/StoreFormModal';
import { GenericCard } from '@/components/Common/GenericCard';

// Estilos Compartidos
import { 
  SedesGrid, SedeGhostCard, PageContainer 
} from '@/components/Common/GenericCardStyles';
import { 
  SearchInput, SearchIconIcon 
} from '@/app/admin/dashboard/commerce/components/CommerceStyles';

import { DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';

export default function CommerceStoresManagementPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [stores, setStores] = useState<any[]>([]);
  const [paymentPlatforms, setPaymentPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedStoreId, setHighlightedStoreId] = useState<number | null>(null);

  // Modal states
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [storeFormData, setStoreFormData] = useState<any>({
    id: null,
    nombre_sucursal: '',
    telefono: '',
    direccion: '',
    estado: 'no_disponible',
    image_url: '',
    latitud: '',
    longitud: '',
    schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
  });

  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null);
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const [transitionLoading, setTransitionLoading] = useState(false);

  // Permisos RBAC
  const permissions = user?.permissions || [];
  const canEdit = permissions.includes('edit_store_basic') || permissions.includes('edit_store_advanced');
  const canCreate = permissions.includes('create_store');

  // Hook de geolocalizacion centralizado
  const geo = useGeolocation({
    onCoordsConfirmed: (lat, lng) => {
      setStoreFormData((prev: any) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString()
      }));
      toast.success('Coordenadas registradas correctamente');
    },
    onCoordsFromPermission: (lat, lng) => {
      setStoreFormData((prev: any) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString()
      }));
    }
  });

  // Scroll inteligente para modales
  useModalScroll(isStoreModalOpen);
  useModalScroll(geo.showMapPicker);
  useModalScroll(geo.showGeoWarning);

  useEffect(() => {
    setHeaderTarget(document.getElementById('header-portal-root'));
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.adminType !== 'commerce' && user.actorType !== 'system_user') {
      router.push('/commerce/dashboard');
      return;
    }
    fetchData();
  }, [user, token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [storesRes, platformsRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/my-stores`, { headers }),
        axios.get(`${API_URL}/api/manage/payment-platforms`, { headers }).catch(() => ({ data: [] }))
      ]);
      setStores(storesRes.data);
      setPaymentPlatforms(platformsRes.data);
    } catch (e) {
      console.error('Error fetching stores data:', e);
      toast.error('Error al cargar la lista de sedes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setStoreFormData({
      id: null,
      nombre_sucursal: '',
      telefono: '',
      direccion: '',
      estado: 'no_disponible',
      image_url: '',
      latitud: '',
      longitud: '',
      schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
    });
    setIsStoreModalOpen(true);
  };

  const handleOpenEditModal = (store: any) => {
    setIsEditing(true);
    setStoreFormData({
      ...store,
      schedule: (store.schedule && store.schedule.length > 0)
        ? store.schedule
        : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE))
    });
    setIsStoreModalOpen(true);
  };

  const handleSelectStore = (storeId: number) => {
    router.push(`/commerce/stores/${storeId}`);
  };

  const filteredStores = stores.filter(s => 
    s.nombre_sucursal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.direccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando sedes de su comercio...</p>
      </LoadingState>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* PORTAL DE BÚSQUEDA Y BOTÓN EN CABECERA */}
      {headerTarget && createPortal(
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', width: '100%', paddingRight: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
            <SearchInput 
              type="text" 
              placeholder="Buscar sedes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIconIcon viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </SearchIconIcon>
          </div>
          {canCreate && (
            <ActionButton $variant="success" onClick={handleOpenCreateModal}>
              Nueva Sede
            </ActionButton>
          )}
        </div>,
        headerTarget
      )}

      {/* Grid de Sedes */}
      <SedesGrid>
        {filteredStores.map(store => (
          <GenericCard 
            key={store.id}
            store={store}
            isHighlighted={highlightedStoreId === store.id}
            onSelect={() => handleSelectStore(store.id)}
            onEdit={canEdit ? () => handleOpenEditModal(store) : undefined}
          />
        ))}

        {canCreate && (
          <SedeGhostCard onClick={handleOpenCreateModal}>
            <span className="icon">+</span>
            <span className="label">Nueva Sede</span>
          </SedeGhostCard>
        )}
      </SedesGrid>

      {filteredStores.length === 0 && !canCreate && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)', fontSize: '1rem' }}>
          No tienes sedes asignadas o asociadas a tu cuenta.
        </div>
      )}

      {/* Sede Form Modal */}
      <StoreFormModal 
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        onSuccess={(storeId) => {
          fetchData();
          if (storeId) {
            setHighlightedStoreId(storeId);
            setTimeout(() => setHighlightedStoreId(null), 4000);
          }
        }}
        initialData={storeFormData}
        commerceId={user?.commerceId || storeFormData.commerce_id}
        paymentPlatforms={paymentPlatforms}
        modalTarget={modalTarget}
        onOpenMapPicker={geo.handleOpenMapPicker}
        lat={storeFormData.latitud}
        lng={storeFormData.longitud}
      />

      {/* Auxiliary Modals */}
      {geo.showMapPicker && modalTarget && createPortal(
        <MapPickerModal 
          onClose={() => geo.setShowMapPicker(false)} 
          onConfirm={geo.handleConfirmCoords}
          initialLat={parseFloat(storeFormData.latitud) || undefined}
          initialLng={parseFloat(storeFormData.longitud) || undefined}
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

      {transitionLoading && modalTarget && createPortal(
        <TransitionShield />,
        modalTarget
      )}
    </div>
  );
}
