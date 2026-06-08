'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';

// Componentes Comunes
import MapPickerModal from '@/components/MapPickerModal';
import GeoPermissionModal from '@/components/Common/GeoPermissionModal';
import { useModalScroll } from '@/hooks/useModalScroll';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ActionButton, TransitionShield, LoadingState, Spinner, GlassHeaderBackButton } from '@/components/Common/UIElements';
import { useToast } from '@/context/ToastContext';
import { PremiumSwitch } from '@/components/Common/ModalStyles';
import { useAuth } from '@/context/AuthContext';
import { StoreInfoCard } from '@/components/Common/StoreInfoCard';
import { StoreFormModal } from '@/components/Common/StoreFormModal';

// Estilos Consolidados
import { 
  Container, HeaderSection, MenuControlBar, SelectPremium,
  SectionTitle, SectionDesc, MenuSelectionList, MenuSelectionCard,
  CategorySelectionList, CategorySelectionCard, StoreHeroCard, SedeEstadoBadge 
} from './StoreDetailStyles';

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
  
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeFormData, setStoreFormData] = useState<any>({});
  
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('Sincronizando...');
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const [headerPortalTarget, setHeaderPortalTarget] = useState<HTMLElement | null>(null);

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

  useModalScroll(isStoreModalOpen);
  useModalScroll(geo.showMapPicker);
  useModalScroll(geo.showGeoWarning);

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

      // 2. Obtener plataformas de pago y los datos del catálogo maestro del comercio y habilitaciones locales
      const [platformsRes, menusRes, storeMenusRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/payment-platforms`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/manage/menus/${commerceId}`, { headers }),
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

  const handleMenuSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuId = Number(e.target.value);
    setSelectedMenuId(menuId);
    fetchStoreCategories(menuId);
  };

  const openStoreEditForm = () => {
    const schedule = (storeData.schedule && storeData.schedule.length > 0) 
      ? storeData.schedule 
      : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
    
    let accounts = storeData.accounts ? [...storeData.accounts] : [];
    accounts.sort((a: any, b: any) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0));
    
    setStoreFormData({ ...storeData, schedule, accounts });
    setIsStoreModalOpen(true);
  };

  const closeStoreForm = () => {
    setIsStoreModalOpen(false);
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
              style={{ fontSize: '0.85rem', padding: '6px 12px', height: '36px', marginRight: '20px' }}
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
          maxWidth: '720px', 
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
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', maxWidth: '720px', width: '100%' }}>
            <SectionTitle>Gestión de Menús</SectionTitle>
            <SectionDesc>Habilita o deshabilita los menús del catálogo maestro para esta sede física.</SectionDesc>
            
            {masterMenus.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                No hay menús configurados en el Catálogo Maestro de este comercio. Ve a la gestión de comercio para añadirlos.
              </div>
            ) : (
              <MenuSelectionList>
                {masterMenus.map(m => {
                  const isEnabled = storeMenus.some(sm => sm.menu_id === m.id && sm.disponible === 1);
                  return (
                    <MenuSelectionCard key={m.id} $isEnabled={isEnabled}>
                      <div className="menu-info">
                        <h3>{m.nombre}</h3>
                        {m.descripcion && <p>{m.descripcion}</p>}
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
      
          {/* SECCIÓN 2: Gestión de Categorías */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', marginTop: '12px', maxWidth: '720px', width: '100%' }}>
            <SectionTitle>Gestión de Categorías</SectionTitle>
            <SectionDesc>Selecciona un menú disponible y habilita individualmente cada una de sus categorías.</SectionDesc>
     
            {enabledStoreMenus.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                Debes habilitar al menos un Menú en la sección superior para poder configurar sus categorías.
              </div>
            ) : (
              <>
                <MenuControlBar style={{ marginBottom: '20px' }}>
                  <div className="selector-group">
                    <label>Ver menú habilitado:</label>
                    <SelectPremium 
                      value={selectedMenuId || ''} 
                      onChange={handleMenuSelect}
                      style={{ minWidth: '260px' }}
                    >
                      {enabledStoreMenus.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </SelectPremium>
                  </div>
                </MenuControlBar>
      
                {loadingCategories ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <Spinner />
                  </div>
                ) : categories.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                    Este menú no posee categorías asociadas en el catálogo maestro.
                  </div>
                ) : (
                  <CategorySelectionList>
                    {categories.map(cat => {
                      const isEnabled = cat.habilitada === 1 || cat.habilitada === true;
                      return (
                        <CategorySelectionCard key={cat.id} $isEnabled={isEnabled}>
                          <div className="cat-info">
                            <h3>{cat.nombre}</h3>
                            {cat.descripcion && <p>{cat.descripcion}</p>}
                          </div>
                          <div className="actions-group">
                            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                              {canEnableStoreCatalog ? (
                                <PremiumSwitch 
                                  id={`cat-switch-${cat.id}`}
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => handleCategoryToggle(cat.id, checked)}
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
                                  {isEnabled ? 'Habilitada' : 'Deshabilitada'}
                                </span>
                              )}
                            </div>
                            {isEnabled && canWriteCatalog && (
                              <ActionButton 
                                $variant="success" 
                                style={{ padding: '8px 16px', height: 'auto', fontSize: '0.8rem' }}
                                onClick={() => {
                                  if (isAdminPath) {
                                    router.push(`/admin/dashboard/stores/${params.storeId}/catalog/${cat.id}`);
                                  } else {
                                    router.push(`/commerce/stores/${params.storeId}/catalog/${cat.id}`);
                                  }
                                }}
                              >
                                Gestionar Productos
                              </ActionButton>
                            )}
                          </div>
                        </CategorySelectionCard>
                      );
                    })}
                  </CategorySelectionList>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Sede Form Modal */}
      <StoreFormModal 
        isOpen={isStoreModalOpen}
        onClose={closeStoreForm}
        onSuccess={() => {
          fetchInitialData();
        }}
        initialData={storeFormData}
        commerceId={storeData?.commerce_id}
        paymentPlatforms={paymentPlatforms}
        modalTarget={modalTarget}
        onOpenMapPicker={geo.handleOpenMapPicker}
        lat={storeFormData.latitud}
        lng={storeFormData.longitud}
      />

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
        <TransitionShield message={transitionMessage} />,
        modalTarget
      )}
    </Container>
  );
}
