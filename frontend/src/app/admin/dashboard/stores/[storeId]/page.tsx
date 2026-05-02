'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Componentes Comunes
import MapPickerModal from '@/components/MapPickerModal';
import GeoPermissionModal from '@/components/Common/GeoPermissionModal';
import { useModalScroll } from '@/hooks/useModalScroll';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ActionButton, TransitionShield, LoadingState, Spinner } from '@/components/Common/UIElements';
import { useToast } from '@/context/ToastContext';

// Componentes Locales (Refactorizados)
import { Container, HeaderSection, MenuControlBar, SelectPremium, SeparatorLine, EmptyHeroCard, GlobalFeedbackStyles } from './components/StoreDetailStyles';
import { StoreHero } from './components/StoreHero';
import { MenuAccordion } from './components/MenuAccordion';
import { StoreModals } from './components/StoreModals';
import { StoreFormModal } from '@/components/Common/StoreFormModal';

import { DAYS, DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';
import { formatTime, getFullImageUrl } from '@/utils';

// formatTime y getFullImageUrl importados desde @/utils

export default function StoreContentPage({ params }: { params: { storeId: string } }) {
  const router = useRouter();
  const toast = useToast();

  const [menus, setMenus] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [activeCategoriaId, setActiveCategoriaId] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [highlightType, setHighlightType] = useState<'category' | 'product' | null>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [paymentPlatforms, setPaymentPlatforms] = useState<any[]>([]);

  const [modalType, setModalType] = useState<null | 'menu' | 'categoria' | 'product' | 'store'>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('Sincronizando...');
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null);
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);

  // Hook de geolocalizacion centralizado
  const geo = useGeolocation({
    onCoordsConfirmed: (lat, lng) => {
      setFormData((prev: any) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString()
      }));
      toast.success('Coordenadas registradas correctamente');
    },
    onCoordsFromPermission: (lat, lng) => {
      setFormData((prev: any) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString()
      }));
    }
  });

  useModalScroll(isModalOpen);
  useModalScroll(geo.showMapPicker);
  useModalScroll(geo.showGeoWarning);

  const categoryRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const productRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const scrollToTarget = (id: number, type: 'category' | 'product', categoriaId?: number) => {
    if (type === 'product' && categoriaId) {
      // Abrir la categoria primero para que el producto sea visible en el DOM
      setActiveCategoriaId(categoriaId);
      // Esperar a que la animacion del accordion termine (grid-template-rows 0.4s)
      setTimeout(() => {
        const element = productRefs.current[id];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(id);
          setHighlightType('product');
        }
      }, 500);
    } else {
      setTimeout(() => {
        const element = type === 'category' ? categoryRefs.current[id] : productRefs.current[id];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(id);
          setHighlightType(type);
        }
      }, 400);
    }
  };

  const handleUpdateAccount = (idx: number, field: string, value: any) => {
    const newAccs = [...formData.accounts];
    newAccs[idx][field] = value;
    setFormData({ ...formData, accounts: newAccs });
  };

  const handleRemoveAccount = (idx: number) => {
    const newAccs = [...formData.accounts];
    newAccs.splice(idx, 1);
    setFormData({ ...formData, accounts: newAccs });
  };

  const handleSetPrincipalAccount = (idx: number) => {
    const newAccs = [...formData.accounts];
    newAccs.forEach((a, i) => a.es_principal = i === idx);
    setFormData({ ...formData, accounts: newAccs });
  };

  useEffect(() => {
    setHeaderTarget(document.getElementById('header-portal-root'));
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [params.storeId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const [menusRes, allProductsRes, storeRes, platformsRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/menus/${params.storeId}`, { headers }),
        axios.get(`${API_URL}/api/manage/products`, { headers }),
        axios.get(`${API_URL}/api/manage/store/${params.storeId}`, { headers }).catch(() => null),
        axios.get(`${API_URL}/api/manage/payment-platforms`, { headers }).catch(() => ({ data: [] }))
      ]);

      if (storeRes && storeRes.data) {
        setStoreData(storeRes.data);
      }

      setMenus(menusRes.data);
      setProducts(allProductsRes.data);
      setPaymentPlatforms(platformsRes.data);

      if (menusRes.data.length > 0) {
        setActiveMenuId(menusRes.data[0].id);
        fetchCategorias(menusRes.data[0].id, headers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async (menuId: number, existingHeaders?: any) => {
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/categorias/${menuId}`, { headers });
      setCategorias(res.data);
      setActiveCategoriaId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMenuSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuId = Number(e.target.value);
    setActiveMenuId(menuId);
    fetchCategorias(menuId);
  };

  const toggleCategoria = (catId: number) => {
    setActiveCategoriaId(prev => {
      const newId = prev === catId ? null : catId;
      if (newId !== null) {
        setTimeout(() => {
          categoryRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return newId;
    });
  };

  const openForm = (type: 'menu' | 'categoria' | 'product' | 'store', initialData: any = {}) => {
    setModalType(type);
    if (type === 'store') {
      const schedule = (initialData.schedule && initialData.schedule.length > 0) 
        ? initialData.schedule 
        : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
      
      // Ordenar cuentas para que la principal aparezca primero al abrir el modal
      let accounts = initialData.accounts ? [...initialData.accounts] : [];
      accounts.sort((a: any, b: any) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0));
      
      setFormData({ ...initialData, schedule, accounts });
    } else {
      setFormData(initialData);
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    // Si es gestión de sede (cabecera), cerramos instantáneamente sin transición
    if (modalType === 'store') {
      setIsModalOpen(false);
      return;
    }

    setTransitionMessage('Sincronizando...');
    setTransitionLoading(true);
    setTimeout(() => {
      setIsModalOpen(false);
      if (formData.id) {
        if (modalType === 'categoria') scrollToTarget(formData.id, 'category');
        if (modalType === 'product') scrollToTarget(formData.id, 'product', formData.categoria_id);
      }
    }, 300);
    setTimeout(() => setTransitionLoading(false), 1400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = getAuthHeaders();

    try {
      if (modalType === 'menu') {
        const payload = { ...formData, store_id: params.storeId };
        const isNewMenu = !formData.id;
        const res = await axios.post(`${API_URL}/api/manage/menus`, payload, { headers });
        const finalId = formData.id || res.data.id;
        toast.success('Menú guardado con éxito');
        
        await fetchInitialData();
        if (finalId) {
          setActiveMenuId(finalId);
          fetchCategorias(finalId);
        }

        setIsModalOpen(false);
        setTransitionMessage('Sincronizando Men\u00fa...');
        setTransitionLoading(true);
        if (isNewMenu) {
          setTimeout(() => {
            const container = document.getElementById('admin-scroll-container');
            if (container) {
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
          }, 150);
        }
        setTimeout(() => setTransitionLoading(false), 1400);
        return;
      } else if (modalType === 'product') {
        if (!formData.image_url) {
          toast.error('Debe subir una fotografía del producto (Estrategia Visual obligatoria)');
          return;
        }
        // Capturar la categoriaId ANTES de cualquier cambio de estado
        const targetCategoriaId = formData.categoria_id || activeCategoriaId;
        const payload = { ...formData, categoria_id: activeCategoriaId, commerce_id: storeData?.commerce_id };
        const res = await axios.post(`${API_URL}/api/manage/products`, payload, { headers });
        const finalId = formData.id || res.data.id;
        toast.success(formData.id ? 'Producto actualizado con éxito' : 'Producto creado con éxito');
        
        // Solo refrescar productos (NO usar fetchInitialData que desmonta el accordion y destruye refs)
        try {
          const productsRes = await axios.get(`${API_URL}/api/manage/products`, { headers });
          setProducts(productsRes.data);
        } catch (err) { console.error(err); }
        
        setIsModalOpen(false);
        setTransitionMessage('Sincronizando Producto...');
        setTransitionLoading(true);
        setTimeout(() => {
          scrollToTarget(finalId, 'product', targetCategoriaId);
        }, 300);
        setTimeout(() => setTransitionLoading(false), 1400);
        return; // Salir para evitar la lógica genérica de abajo
      } else if (modalType === 'categoria') {
        const payload = { ...formData, menu_id: activeMenuId };
        const res = await axios.post(`${API_URL}/api/manage/categorias`, payload, { headers });
        const finalId = formData.id || res.data.id;
        toast.success('Categoría guardada con éxito');
        if (activeMenuId) fetchCategorias(activeMenuId);
        
        setTransitionMessage('Sincronizando Categoría...');
        setTransitionLoading(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setActiveCategoriaId(finalId);
          setTimeout(() => {
            scrollToTarget(finalId, 'category');
          }, 400);
        }, 300);
        setTimeout(() => setTransitionLoading(false), 1400);
        return;
      }
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.response?.data?.error || e.message || 'Error desconocido';
      toast.error('Error: ' + errorMsg);
    }
  };


  // Logica de geolocalizacion manejada por useGeolocation hook

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando información de la sede...</p>
      </LoadingState>
    );
  }

  return (
    <Container>
      {headerTarget && createPortal(
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: '10%' }}>
          <ActionButton $variant="success-solid" onClick={() => openForm('store')}>+ Añadir Nueva Sede</ActionButton>
        </div>,
        headerTarget
      )}

      <HeaderSection>
        <StoreHero 
          storeData={storeData}
          getFullImageUrl={getFullImageUrl}
          formatTime={formatTime}
          onBack={() => router.back()}
          onEdit={() => openForm('store', storeData)}
        />

        <SeparatorLine />

        <div className="title-group">
          <h1 className="title">Gestionar Carta</h1>
        </div>

        {menus.length === 0 ? (
          <EmptyHeroCard onClick={() => openForm('menu')}>
            <div className="icon">+</div>
            <p className="animated-text">
              <span className="arrow">→</span> Añada un nuevo Menú <span className="arrow">←</span>
            </p>
          </EmptyHeroCard>
        ) : (
          <MenuControlBar>
            <div className="selector-group">
              <label>Seleccionar menú:</label>
              <SelectPremium value={activeMenuId || ''} onChange={handleMenuSelect}>
                {menus.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </SelectPremium>
            </div>
            <ActionButton onClick={() => openForm('menu')}>+ Nuevo Menú</ActionButton>
          </MenuControlBar>
        )}
      </HeaderSection>

      <GlobalFeedbackStyles>
        {menus.length > 0 && (
          <MenuAccordion 
            categorias={categorias}
            products={products}
            activeCategoriaId={activeCategoriaId}
            highlightedId={highlightedId}
            highlightType={highlightType}
            toggleCategoria={toggleCategoria}
            openForm={openForm}
            getFullImageUrl={getFullImageUrl}
            categoryRefs={categoryRefs}
            productRefs={productRefs}
            activeMenuId={activeMenuId}
          />
        )}
      </GlobalFeedbackStyles>

      <StoreModals 
        isModalOpen={isModalOpen && modalType !== 'store'}
        modalType={modalType as any}
        formData={formData}
        setFormData={setFormData}
        closeForm={closeForm}
        handleSubmit={handleSubmit}
        showError={toast.error}
        modalTarget={modalTarget}
      />

      <StoreFormModal 
        isOpen={isModalOpen && modalType === 'store'}
        onClose={closeForm}
        onSuccess={() => {
          fetchInitialData();
        }}
        initialData={formData}
        commerceId={storeData?.commerce_id}
        paymentPlatforms={paymentPlatforms}
        modalTarget={modalTarget}
        onOpenMapPicker={geo.handleOpenMapPicker}
        lat={formData.latitud}
        lng={formData.longitud}
      />

      {geo.showMapPicker && modalTarget && createPortal(
        <MapPickerModal
          onClose={() => geo.setShowMapPicker(false)}
          onConfirm={geo.handleConfirmCoords}
          initialLat={parseFloat(formData.latitud) || undefined}
          initialLng={parseFloat(formData.longitud) || undefined}
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
        <TransitionShield message={transitionMessage} />,
        modalTarget
      )}
    </Container>
  );
}
