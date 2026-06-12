'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MapPickerModal from '@/components/MapPickerModal';
import GeoPermissionModal from '@/components/Common/GeoPermissionModal';
import { useModalScroll } from '@/hooks/useModalScroll';
import { useGeolocation } from '@/hooks/useGeolocation';
import { StoreFormModal } from '@/components/Common/StoreFormModal';
import { TransitionShield, ActionButton, LoadingState, Spinner } from '@/components/Common/UIElements';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';
import { formatTime, getFullImageUrl } from '@/utils';
import { COMMERCE_HIGHLIGHT_PARAM } from '@/utils/commerceNavigation';

// Refactored Components
import { PageContainer, CommercesGrid, EmptyState, SearchInput, SearchIconIcon, SedeGhostCard } from './components/CommerceStyles';
import { CommerceCard } from './components/CommerceCard';
import { SedesManagementModal } from '@/components/Common/SedesManagementModal';
import { CommerceFormModal } from '@/components/Common/CommerceFormModal';

// formatTime y getFullImageUrl importados desde @/utils

export default function CommerceManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastProcessedHighlightRef = useRef<string | null>(null);
  const { user } = useAuth();
  const [commerces, setCommerces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null);
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    setHeaderTarget(document.getElementById('header-portal-root'));
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCommerceId, setCurrentCommerceId] = useState<number | null>(null);
  const [highlightedCommerceId, setHighlightedCommerceId] = useState<number | null>(null);
  const [highlightedSedeId, setHighlightedSedeId] = useState<number | null>(null);
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const toast = useToast();
  const [transitionLoading, setTransitionLoading] = useState(false);

  useEffect(() => {
    if (!isModalOpen) setIsSubmitted(false);
  }, [isModalOpen]);

  const [formData, setFormData] = useState({ 
    nombre: '', 
    nit: '',
    nit_dv: '',
    telefono: '',
    ciudad: '',
    direccion: '',
    descripcion: '', 
    logo_url: '',
    type: 'Empresarial',
    admin_nombres: '',
    admin_apellidos: ''
  });

  // Sedes states
  const [sedesModalOpen, setSedesModalOpen] = useState(false);
  const [createSedeModalOpen, setCreateSedeModalOpen] = useState(false);
  const [sedesDelComercio, setSedesDelComercio] = useState<any[]>([]);
  const [selectedCommerce, setSelectedCommerce] = useState<any>(null);
  const [loadingSedes, setLoadingSedes] = useState(false);
  const [sedeFormData, setSedeFormData] = useState<any>({
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
  const [paymentPlatforms, setPaymentPlatforms] = useState<any[]>([]);

  // Hook de geolocalizacion centralizado
  const geo = useGeolocation({
    onCoordsConfirmed: (lat, lng) => {
      setSedeFormData((prev: any) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString()
      }));
    },
    onCoordsFromPermission: (lat, lng) => {
      setSedeFormData((prev: any) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString()
      }));
    }
  });

  // Scroll inteligente para modales
  useModalScroll(isModalOpen);
  useModalScroll(sedesModalOpen);
  useModalScroll(createSedeModalOpen);
  useModalScroll(geo.showMapPicker);
  useModalScroll(geo.showGeoWarning);

  useEffect(() => {
    fetchCommerces();
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/manage/payment-platforms`, {
        headers: getAuthHeaders()
      });
      setPaymentPlatforms(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchCommerces = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/manage/commerces`, {
        headers: getAuthHeaders()
      });
      setCommerces(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const scrollToTop = () => {
    const container = document.getElementById('admin-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeMainModal = () => {
    setTransitionLoading(true);
    setTimeout(() => {
      setIsModalOpen(false);
      if (currentCommerceId) {
        scrollToCommerce(currentCommerceId);
      }
    }, 300);
    setTimeout(() => setTransitionLoading(false), 1400);
  };

  const closeSedesModal = () => {
    setTransitionLoading(true);
    setTimeout(() => {
      setSedesModalOpen(false);
      if (selectedCommerce?.id) {
        scrollToCommerce(selectedCommerce.id);
      }
    }, 300);
    setTimeout(() => setTransitionLoading(false), 1400);
  };

  const closeCreateSedeModal = () => {
    setCreateSedeModalOpen(false);
  };

  const scrollToCommerce = (commerceId: number) => {
    setHighlightedCommerceId(commerceId);
    setTimeout(() => {
      const element = document.getElementById(`commerce-card-${commerceId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 600);
  };

  const runCommerceHighlightFlow = (commerceId: number) => {
    setTransitionLoading(true);
    scrollToCommerce(commerceId);
    setTimeout(() => setTransitionLoading(false), 1400);
  };

  useEffect(() => {
    const raw = searchParams.get(COMMERCE_HIGHLIGHT_PARAM);
    if (!raw) {
      lastProcessedHighlightRef.current = null;
      return;
    }
    if (loading || raw === lastProcessedHighlightRef.current) return;

    const commerceId = Number(raw);
    if (Number.isNaN(commerceId) || commerces.length === 0) return;
    if (!commerces.some((c) => c.id === commerceId)) return;

    lastProcessedHighlightRef.current = raw;
    runCommerceHighlightFlow(commerceId);
    router.replace('/admin/dashboard/commerce', { scroll: false });
  }, [loading, commerces, searchParams, router]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentCommerceId(null);
    setFormData({ 
      nombre: '', 
      nit: '',
      nit_dv: '',
      telefono: '',
      ciudad: '',
      direccion: '',
      descripcion: '', 
      logo_url: '',
      type: 'Empresarial',
      admin_nombres: '',
      admin_apellidos: ''
    });
    setIsModalOpen(true);
    scrollToTop();
  };

  const handleOpenEditModal = (commerce: any) => {
    setIsEditing(true);
    setCurrentCommerceId(commerce.id);
    setFormData({ 
      nombre: commerce.nombre || '', 
      nit: commerce.nit || '',
      nit_dv: commerce.nit_dv || '',
      telefono: commerce.telefono || '',
      ciudad: commerce.ciudad || '',
      direccion: commerce.direccion || '',
      descripcion: commerce.descripcion || '', 
      logo_url: commerce.logo_url || '',
      type: commerce.type || 'Empresarial',
      admin_nombres: commerce.admin_nombres || '',
      admin_apellidos: commerce.admin_apellidos || ''
    });
    setIsModalOpen(true);
    scrollToTop();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);
    
    if (!e.currentTarget.checkValidity()) {
      toast.error('Faltan campos obligatorios. Revisa los recuadros en rojo.');
      return;
    }

    if (!formData.logo_url) {
      toast.error('Debe subir el logo del comercio (Estrategia Visual obligatoria).');
      return;
    }

    try {
      const headers = getAuthHeaders();
      let savedCommerceId = currentCommerceId;
      
      if (isEditing && currentCommerceId) {
        await axios.put(`${API_URL}/api/manage/commerces/${currentCommerceId}`, formData, {
          headers
        });
      } else {
        const res = await axios.post(`${API_URL}/api/manage/commerces`, formData, {
          headers
        });
        if (res.data && res.data.id) savedCommerceId = res.data.id;
      }
      
      setIsModalOpen(false);
      await fetchCommerces();
      toast.success(isEditing ? 'Comercio actualizado correctamente' : 'Nuevo comercio creado con éxito');
      
      if (savedCommerceId) {
        scrollToCommerce(savedCommerceId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCommerces = commerces.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.nit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.ciudad?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGestionarSedes = async (commerce: any) => {
    setSelectedCommerce(commerce);
    setLoadingSedes(true);
    try {
      const res = await axios.get(`${API_URL}/api/manage/stores/${commerce.id}`, {
        headers: getAuthHeaders()
      });
      const stores = res.data;
      if (stores.length === 0) {
        setSedeFormData({ 
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
        setCreateSedeModalOpen(true);
        scrollToTop();
      } else if (stores.length === 1) {
        router.push(`/admin/dashboard/stores/${stores[0].id}`);
      } else {
        setSedesDelComercio(stores);
        setSedesModalOpen(true);
        scrollToTop();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSedes(false);
    }
  };

  const fetchSedes = async (commerceId: number) => {
    try {
      const res = await axios.get(`${API_URL}/api/manage/stores/${commerceId}`, {
        headers: getAuthHeaders()
      });
      setSedesDelComercio(res.data);
    } catch (e) { console.error(e); }
  };

  const handleEditSedeFromModal = (sede: any) => {
    router.push(`/commerce/stores/${sede.id}/profile`);
  };

  // Logica de geolocalizacion manejada por useGeolocation hook

  return (
    <PageContainer>
      {/* PORTALS AREA */}
      {headerTarget && createPortal(
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', width: '100%', paddingRight: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
            <SearchInput 
              type="text" 
              placeholder="Busca por cualquier valor" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIconIcon viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </SearchIconIcon>
          </div>
          <ActionButton $variant="success" onClick={handleOpenCreateModal}>
            Agregar comercio
          </ActionButton>
        </div>,
        headerTarget
      )}

      {/* Grid Section */}
      {loading ? (
        <LoadingState>
          <Spinner />
          <p>Cargando catálogo de comercios...</p>
        </LoadingState>
      ) : (
        <CommercesGrid style={{ marginTop: '1rem' }}>
          {filteredCommerces.map((commerce) => (
            <CommerceCard 
              key={commerce.id}
              commerce={commerce}
              isHighlighted={highlightedCommerceId === commerce.id}
              getFullImageUrl={getFullImageUrl}
              onEdit={handleOpenEditModal}
              onManageSedes={handleGestionarSedes}
              isLoadingSedes={loadingSedes}
              isSelected={selectedCommerce?.id === commerce.id}
            />
          ))}
          
          <SedeGhostCard onClick={handleOpenCreateModal}>
            <span className="icon">+</span>
            <span className="label">Nuevo Comercio</span>
          </SedeGhostCard>
          
          {filteredCommerces.length === 0 && (
            <EmptyState>
              No se encontraron resultados para &quot;{searchTerm}&quot;
            </EmptyState>
          )}
        </CommercesGrid>
      )}

      {/* Main Commerce Modal */}
      <CommerceFormModal
        isOpen={isModalOpen}
        onClose={closeMainModal}
        isEditing={isEditing}
        currentCommerceId={currentCommerceId}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitted={isSubmitted}
        modalTarget={modalTarget}
      />

      {/* Sedes Management Modal */}
      <SedesManagementModal 
        isOpen={sedesModalOpen}
        onClose={closeSedesModal}
        selectedCommerce={selectedCommerce}
        sedes={sedesDelComercio}
        highlightedSedeId={highlightedSedeId}
        modalTarget={modalTarget}
        getFullImageUrl={getFullImageUrl}
        formatTime={formatTime}
        onEditSede={handleEditSedeFromModal}
        onNewSede={() => {
          setSedeFormData({ id: null, nombre_sucursal: '', telefono: '', direccion: '', open_time: '', close_time: '', is_24h: 0, estado: 'no_disponible', image_url: '', latitud: '', longitud: '' });
          setCreateSedeModalOpen(true);
        }}
        onSelectSede={(sedeId) => router.push(`/admin/dashboard/stores/${sedeId}`)}
      />

      {/* Sede Form Modal */}
      <StoreFormModal 
        isOpen={createSedeModalOpen}
        onClose={closeCreateSedeModal}
        onSuccess={(sedeId) => {
          if (selectedCommerce) fetchSedes(selectedCommerce.id);
          if (sedeId) setHighlightedSedeId(sedeId);
        }}
        initialData={sedeFormData}
        commerceId={selectedCommerce?.id}
        paymentPlatforms={paymentPlatforms}
        modalTarget={modalTarget}
        onOpenMapPicker={geo.handleOpenMapPicker}
        lat={sedeFormData.latitud}
        lng={sedeFormData.longitud}
      />

      {/* Auxiliary Modals */}
      {geo.showMapPicker && modalTarget && createPortal(
        <MapPickerModal 
          onClose={() => geo.setShowMapPicker(false)} 
          onConfirm={geo.handleConfirmCoords}
          initialLat={parseFloat(sedeFormData.latitud) || undefined}
          initialLng={parseFloat(sedeFormData.longitud) || undefined}
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
    </PageContainer>
  );
}
