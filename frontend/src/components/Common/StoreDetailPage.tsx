'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import styled from 'styled-components';
import { MenuAccordion } from '@/components/Common/CommerceCatalog/MenuAccordion';

const EditIconButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-right: 16px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:active {
    transform: scale(0.95);
  }
`;

// Componentes Comunes
import { useModalScroll } from '@/hooks/useModalScroll';
import { useCardHighlight } from '@/hooks/useCardHighlight';
import { ActionButton, TransitionShield, LoadingState, Spinner, GlassHeaderBackButton } from '@/components/Common/UIElements';
import { useToast } from '@/context/ToastContext';
import { PremiumSwitch } from '@/components/Common/ModalStyles';
import { useAuth } from '@/context/AuthContext';
import { StoreInfoCard } from '@/components/Common/StoreInfoCard';
import { StoreModals } from '@/components/Common/CommerceCatalog/StoreModals';

// Estilos Consolidados
import { 
  Container, HeaderSection, MenuControlBar, SelectPremium,
  SectionTitle, SectionDesc, MenuSelectionList, MenuSelectionCard,
  CategorySelectionList, CategorySelectionCard, StoreHeroCard, SedeEstadoBadge
} from './StoreDetailStyles';
import { GlobalFeedbackStyles } from './CommerceCatalog/StoreDetailStyles';

import { DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';
import { formatTime, getFullImageUrl } from '@/utils';
import { getCommerceReturnUrl } from '@/utils/commerceNavigation';

// Componente Local StoreHero (Integrado en el archivo común)
interface StoreHeroProps {
  storeData: any;
}

const StoreHero: React.FC<StoreHeroProps> = ({ 
  storeData
}) => {
  if (!storeData) return null;

  return (
    <StoreHeroCard $bgImage={getFullImageUrl(storeData?.image_url)}>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="hero-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
            <h1 className="super-title" style={{ marginBottom: 0 }}>
              {storeData.commerce_nombre} - {storeData.nombre_sucursal}
            </h1>
            <SedeEstadoBadge estado={storeData.estado}>
              {storeData.estado}
            </SedeEstadoBadge>
          </div>
        </div>

        <StoreInfoCard 
          storeData={storeData} 
          formatTime={formatTime} 
        />
      </div>
    </StoreHeroCard>
  );
};

export default function StoreDetailPage({ params }: { params: { storeId: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { user } = useAuth();

  const isAdminPath = pathname.startsWith('/admin');
  const permissions = user?.permissions || [];
  
  // Guardas de seguridad RBAC dinámicas
  const canViewCatalog = isAdminPath || permissions.includes('view_catalog');
  const canEnableStoreCatalog = permissions.includes('enable_store_catalog');
  const canWriteCatalog = isAdminPath || permissions.includes('write_catalog');
  const canEditBasic = isAdminPath || permissions.includes('edit_store_basic');
  const canEditAdvanced = isAdminPath || permissions.includes('edit_store_advanced');

  const [storeData, setStoreData] = useState<any>(null);
  const [masterMenus, setMasterMenus] = useState<any[]>([]);
  const [storeMenus, setStoreMenus] = useState<any[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentPlatforms, setPaymentPlatforms] = useState<any[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<{ [catId: number]: any[] }>({});
  const [activeCategoriaId, setActiveCategoriaId] = useState<number | null>(null);
  const categoryRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const productRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogModalType, setCatalogModalType] = useState<'menu' | 'categoria' | 'product' | null>(null);
  const [catalogFormData, setCatalogFormData] = useState<any>({});
  
  const {
    highlightedId: highlightedProductId,
    setHighlightedId: setHighlightedProductId,
    transitionLoading,
    setTransitionLoading,
    transitionMessage,
    setTransitionMessage,
    triggerHighlightFlow,
    clearHighlight: clearHighlightProduct
  } = useCardHighlight({ scrollDelay: 500 });
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const [headerPortalTarget, setHeaderPortalTarget] = useState<HTMLElement | null>(null);

  useModalScroll(isCatalogModalOpen);

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
    setHeaderPortalTarget(document.getElementById('header-back-portal-root'));
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [params.storeId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      // 1. Obtener la sede con su info y commerce_id
      const storeRes = await axios.get(`${API_URL}/api/manage/store/${params.storeId}`, { headers });
      const store = storeRes.data;
      setStoreData(store);

      const commerceId = store.commerce_id;

      // 2. Obtener plataformas de pago y los datos del catálogo de la sede
      const [platformsRes, menusRes, storeMenusRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/payment-platforms`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/manage/menus?storeId=${params.storeId}`, { headers }),
        axios.get(`${API_URL}/api/manage/store-menus/${params.storeId}`, { headers })
      ]);

      setPaymentPlatforms(platformsRes.data);
      setMasterMenus(menusRes.data);
      setStoreMenus(storeMenusRes.data);

      // Seleccionar por defecto el primer menú que esté habilitado para la sede
      const enabledMenus = menusRes.data.filter((mm: any) => 
        storeMenusRes.data.some((sm: any) => sm.menu_id === mm.id && sm.disponible === 1)
      );

      if (enabledMenus.length > 0) {
        const firstEnabledId = enabledMenus[0].id;
        setSelectedMenuId(firstEnabledId);
        fetchStoreCategories(firstEnabledId);
      } else if (menusRes.data.length > 0) {
        setSelectedMenuId(menusRes.data[0].id);
        fetchStoreCategories(menusRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar datos del catálogo de la sede');
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreCategories = async (menuId: number) => {
    setLoadingCategories(true);
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/store-categories/${params.storeId}/${menuId}`, { headers });
      setCategories(res.data);

      // Cargar productos por categoría en paralelo
      const prodMap: { [catId: number]: any[] } = {};
      const prodPromises = res.data.map(async (cat: any) => {
        try {
          const prodRes = await axios.get(
            `${API_URL}/api/manage/store-products/${params.storeId}/${cat.id}`,
            { headers }
          );
          prodMap[cat.id] = prodRes.data;
        } catch { prodMap[cat.id] = []; }
      });
      await Promise.all(prodPromises);
      setProductsByCategory(prodMap);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar las categorías de la sede');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleMenuToggle = async (menuId: number, isEnabled: boolean) => {
    setTransitionMessage('Actualizando Menú...');
    setTransitionLoading(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/api/manage/store-menus`, {
        store_id: Number(params.storeId),
        menu_id: menuId,
        disponible: isEnabled ? 1 : 0
      }, { headers });

      // Recargar habilitaciones de menús
      const storeMenusRes = await axios.get(`${API_URL}/api/manage/store-menus/${params.storeId}`, { headers });
      setStoreMenus(storeMenusRes.data);
      toast.success(isEnabled ? 'Menú habilitado para la sede' : 'Menú deshabilitado para la sede');
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar disponibilidad del menú');
    } finally {
      setTimeout(() => setTransitionLoading(false), 500);
    }
  };

  const handleCategoryToggle = async (categoriaId: number, isEnabled: boolean) => {
    setTransitionMessage('Actualizando Categoría...');
    setTransitionLoading(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/api/manage/store-categories`, {
        store_id: Number(params.storeId),
        categoria_id: categoriaId,
        disponible: isEnabled ? 1 : 0
      }, { headers });

      // Actualizar el estado local de categorías
      setCategories(prev => 
        prev.map(c => c.id === categoriaId ? { ...c, habilitada: isEnabled ? 1 : 0 } : c)
      );
      toast.success(isEnabled ? 'Categoría habilitada para la sede' : 'Categoría deshabilitada para la sede');
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar disponibilidad de la categoría');
    } finally {
      setTimeout(() => setTransitionLoading(false), 500);
    }
  };

  const handleProductToggle = async (productId: number, isEnabled: boolean) => {
    setTransitionMessage('Actualizando Producto...');
    setTransitionLoading(true);
    try {
      const headers = getAuthHeaders();
      let product: any = null;
      for (const catId of Object.keys(productsByCategory)) {
        product = productsByCategory[Number(catId)].find(p => p.id === productId);
        if (product) break;
      }
      await axios.post(`${API_URL}/api/manage/store-products`, {
        store_id: Number(params.storeId),
        product_id: productId,
        precio_local: product?.precio_local ?? null,
        tiempo_prep_local: product?.tiempo_prep_local ?? null,
        disponible: isEnabled ? 1 : 0
      }, { headers });

      // Actualizar mapa local
      setProductsByCategory(prev => {
        const next = { ...prev };
        for (const catId of Object.keys(next)) {
          next[Number(catId)] = next[Number(catId)].map(p =>
            p.id === productId ? { ...p, disponible: isEnabled ? 1 : 0, habilitado: isEnabled ? 1 : 0 } : p
          );
        }
        return next;
      });
      toast.success(isEnabled ? 'Producto habilitado para la sede' : 'Producto deshabilitado para la sede');
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar disponibilidad del producto');
    } finally {
      setTimeout(() => setTransitionLoading(false), 500);
    }
  };

  const openNewMenuForm = () => {
    setCatalogModalType('menu');
    setCatalogFormData({});
    setIsCatalogModalOpen(true);
  };

  const openEditMenuForm = (menuObj: any) => {
    setCatalogModalType('menu');
    setCatalogFormData(menuObj);
    setIsCatalogModalOpen(true);
  };

  const openNewCategoryForm = () => {
    setCatalogModalType('categoria');
    setCatalogFormData({});
    setIsCatalogModalOpen(true);
  };

  const handleCatalogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = getAuthHeaders();
    try {
      if (catalogModalType === 'menu') {
        const payload = { ...catalogFormData, store_id: Number(params.storeId) };
        
        setTransitionMessage(catalogFormData.id ? 'Actualizando Menú...' : 'Creando Menú...');
        setTransitionLoading(true);
        
        await axios.post(`${API_URL}/api/manage/menus`, payload, { headers });
        toast.success(catalogFormData.id ? 'Menú actualizado con éxito' : 'Menú creado con éxito');
        
        setIsCatalogModalOpen(false);
        await fetchInitialData();
      } else if (catalogModalType === 'categoria') {
        if (!selectedMenuId) {
          toast.error('Debe seleccionar un menú para poder crear la categoría.');
          return;
        }
        const payload = { ...catalogFormData, menu_id: selectedMenuId };
        const isUpdate = !!catalogFormData.id;
        
        setTransitionMessage(isUpdate ? 'Actualizando Categoría...' : 'Creando Categoría...');
        setTransitionLoading(true);
        
        await axios.post(`${API_URL}/api/manage/categorias`, payload, { headers });
        toast.success(isUpdate ? 'Categoría actualizada con éxito' : 'Categoría creada con éxito');
        
        setIsCatalogModalOpen(false);
        await fetchStoreCategories(selectedMenuId);
      } else if (catalogModalType === 'product') {
        setTransitionMessage(catalogFormData.id ? 'Actualizando Producto...' : 'Creando Producto...');
        setTransitionLoading(true);
        
        const payload = {
          id: catalogFormData.id || undefined,
          store_id: Number(params.storeId),
          menu_id: selectedMenuId,
          categoria_id: catalogFormData.categoria_id || activeCategoriaId,
          nombre: catalogFormData.nombre,
          descripcion_larga: catalogFormData.descripcion_larga,
          precio_base: Number(catalogFormData.precio_base),
          tiempo_prep_estimado: Number(catalogFormData.tiempo_prep_estimado),
          image_url: catalogFormData.image_url,
          disponible: catalogFormData.disponible !== false ? 1 : 0,
          es_vegetariano: catalogFormData.es_vegetariano ? 1 : 0
        };

        await axios.post(`${API_URL}/api/manage/products`, payload, { headers });

        toast.success(catalogFormData.id ? 'Producto actualizado con éxito' : 'Producto creado con éxito');
        setIsCatalogModalOpen(false);
        if (selectedMenuId) await fetchStoreCategories(selectedMenuId);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.message || 'Error desconocido';
      toast.error('Error: ' + errorMsg);
    } finally {
      setTransitionLoading(false);
    }
  };

  const handleMenuSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuId = Number(e.target.value);
    setSelectedMenuId(menuId);
    fetchStoreCategories(menuId);
  };

  const openStoreEditForm = () => {
    router.push(`/commerce/stores/${storeData.id}/profile`);
  };

  const handleCatalogRedirect = () => {
    if (isAdminPath) {
      router.push(`/admin/dashboard/commerce/${storeData?.commerce_id}/menus`);
    } else {
      router.push('/commerce/catalog');
    }
  };

  const handleBackClick = () => {
    if (isAdminPath) {
      router.push(getCommerceReturnUrl(storeData?.commerce_id));
    } else {
      router.push('/commerce/store-admins');
    }
  };

  // Filtrar menús maestros habilitados localmente en la sede
  const enabledStoreMenus = masterMenus.filter(mm => 
    storeMenus.some(sm => sm.menu_id === mm.id && sm.disponible === 1)
  );

  const showBackButton = isAdminPath || user?.adminType !== 'store';

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
      {headerPortalTarget && createPortal(
        <>
          {showBackButton && (
            <GlassHeaderBackButton onClick={handleBackClick}>
              ← Volver
            </GlassHeaderBackButton>
          )}
          {(canEditBasic || canEditAdvanced) && (
            <ActionButton 
              $variant="success-solid" 
              style={{ fontSize: '0.85rem', padding: '6px 12px', height: '36px', marginRight: '12px' }}
              onClick={openStoreEditForm}
            >
              Editar Sede
            </ActionButton>
          )}
        </>,
        headerPortalTarget
      )}
      <HeaderSection>
        <StoreHero storeData={storeData} />
      </HeaderSection>
  
      {!canViewCatalog ? (
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid rgba(255,255,255,0.06)', 
          borderRadius: '16px', 
          padding: '40px 24px', 
          maxWidth: '100%', 
          width: '100%', 
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✨</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
            Plan Premium Requerido: Gestión de Catálogo
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', maxWidth: '480px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
            Esta funcionalidad requiere activar el plan Empresarial o poseer el rol de Administrador Comercial. Para más detalles, ponte en contacto con la gerencia de tu comercio.
          </p>
          <ActionButton 
            $variant="luminous" 
            style={{ padding: '10px 24px' }}
            onClick={handleBackClick}
          >
            Volver
          </ActionButton>
        </div>
      ) : (
        <>
          {/* SECCIÓN 1: Gestión de Menús */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', maxWidth: '100%', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px' }}>
              <div>
                <SectionTitle style={{ marginBottom: '4px' }}>Gestión de Menús</SectionTitle>
                <SectionDesc style={{ margin: 0 }}>Gestiona los menús y disponibilidad directamente para esta sede física.</SectionDesc>
              </div>
              {canWriteCatalog && (
                <ActionButton 
                  onClick={openNewMenuForm}
                  style={{ flexShrink: 0, padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  + Nuevo Menú
                </ActionButton>
              )}
            </div>
            
            {masterMenus.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                No hay menús configurados para esta sede. Crea uno nuevo para comenzar.
              </div>
            ) : (
              <MenuSelectionList>
                {masterMenus.map(m => {
                  const isEnabled = storeMenus.some(sm => sm.menu_id === m.id && sm.disponible === 1);
                  return (
                    <MenuSelectionCard key={m.id} $isEnabled={isEnabled}>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        {canWriteCatalog && (
                          <EditIconButton 
                            type="button"
                            onClick={() => openEditMenuForm(m)}
                            title="Editar Menú"
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                          </EditIconButton>
                        )}
                        <div className="menu-info">
                          <h3>{m.nombre}</h3>
                          {m.descripcion && <p>{m.descripcion}</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {canEnableStoreCatalog ? (
                          <PremiumSwitch 
                            id={`menu-switch-${m.id}`}
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleMenuToggle(m.id, checked)}
                          />
                        ) : (
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: isEnabled ? 'var(--emerald, #48d64c)' : 'rgba(255,255,255,0.2)',
                            background: isEnabled ? 'rgba(72,214,76,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isEnabled ? 'rgba(72,214,76,0.2)' : 'rgba(255,255,255,0.05)'}`,
                            padding: '4px 10px',
                            borderRadius: '6px'
                          }}>
                            {isEnabled ? 'Habilitado' : 'Deshabilitado'}
                          </span>
                        )}
                      </div>
                    </MenuSelectionCard>
                  );
                })}
              </MenuSelectionList>
            )}
          </div>

          {/* SECCIÓN 2: Gestión de Categorías y Productos */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', marginTop: '12px', maxWidth: '100%', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#fff', margin: 0 }}>Categorías y Productos</h2>
                {enabledStoreMenus.length > 0 && (
                  <SelectPremium 
                    value={selectedMenuId || ''} 
                    onChange={handleMenuSelect}
                    style={{ minWidth: '220px', padding: '8px 32px 8px 12px', fontSize: '0.9rem', height: '38px' }}
                  >
                    {enabledStoreMenus.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </SelectPremium>
                )}
              </div>
              {canWriteCatalog && enabledStoreMenus.length > 0 && (
                <ActionButton 
                  onClick={openNewCategoryForm}
                  style={{ flexShrink: 0, padding: '8px 16px', fontSize: '0.85rem', height: '38px' }}
                >
                  + Nueva Categoría
                </ActionButton>
              )}
            </div>

            {enabledStoreMenus.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                Debes habilitar al menos un Menú en la sección superior para poder configurar sus categorías y productos.
              </div>
            ) : (
              <>
                {loadingCategories ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <Spinner />
                  </div>
                ) : (
                  <GlobalFeedbackStyles>
                    <MenuAccordion
                      categorias={categories}
                      productsByCategory={productsByCategory}
                      activeCategoriaId={activeCategoriaId}
                      highlightedId={highlightedProductId}
                      highlightType="product"
                      onProductHighlight={(productId, categoryId) => {
                        triggerHighlightFlow(productId, 'product-card', 'Desplegando producto...', () => {
                          if (activeCategoriaId !== categoryId) {
                            setActiveCategoriaId(categoryId);
                          }
                        });
                      }}
                      clearProductHighlight={clearHighlightProduct}
                      toggleCategoria={(catId) => setActiveCategoriaId(prev => prev === catId ? null : catId)}
                      openForm={(type, data) => {
                        setCatalogModalType(type);
                        setCatalogFormData(data || {});
                        setIsCatalogModalOpen(true);
                      }}
                      getFullImageUrl={getFullImageUrl}
                      categoryRefs={categoryRefs}
                      productRefs={productRefs}
                      activeMenuId={selectedMenuId}
                      hasWritePermission={canWriteCatalog}
                      isStoreContext={true}
                      onCategoryToggle={handleCategoryToggle}
                      onProductToggle={handleProductToggle}
                      canEnableStoreCatalog={canEnableStoreCatalog}
                      hideHeader={true}
                    />
                  </GlobalFeedbackStyles>
                )}
              </>
            )}
          </div>
        </>
      )}


      {/* Catalog Modals (Menu / Category / Product Creation) */}
      <StoreModals 
        isModalOpen={isCatalogModalOpen}
        modalType={catalogModalType}
        formData={catalogFormData}
        setFormData={setCatalogFormData}
        closeForm={() => setIsCatalogModalOpen(false)}
        handleSubmit={handleCatalogSubmit}
        showError={toast.error}
        modalTarget={modalTarget}
        isStoreContext={true}
      />

      {/* Sede Form Modal removed, now editing is handled via Profile Page */}

      {transitionLoading && modalTarget && createPortal(
        <TransitionShield message={transitionMessage} />,
        modalTarget
      )}
    </Container>
  );
}
