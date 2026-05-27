'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';

// Componentes Comunes
import MapPickerModal from '@/components/MapPickerModal';
import GeoPermissionModal from '@/components/Common/GeoPermissionModal';
import { useModalScroll } from '@/hooks/useModalScroll';
import { useGeolocation } from '@/hooks/useGeolocation';
import { ActionButton, TransitionShield, LoadingState, Spinner, HeaderBackButton } from '@/components/Common/UIElements';
import { useToast } from '@/context/ToastContext';
import { PremiumSwitch, SwitchGroup } from '@/components/Common/ModalStyles';

// Componentes Locales (Refactorizados)
import { Container, HeaderSection, MenuControlBar, SelectPremium, SeparatorLine } from './components/StoreDetailStyles';
import { StoreHero } from './components/StoreHero';
import { StoreFormModal } from '@/components/Common/StoreFormModal';

import { DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';
import { formatTime, getFullImageUrl } from '@/utils';
import { getCommerceReturnUrl } from '@/utils/commerceNavigation';

// Estilos locales específicos para la selección del catálogo
const SectionTitle = styled.h2`
  font-size: 1.3rem;
  font-weight: 400;
  color: #fff;
  margin: 0 0 8px 0;
  letter-spacing: -0.01em;
`;

const SectionDesc = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0 0 20px 0;
`;

const MenuSelectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 1rem;
`;

const MenuSelectionCard = styled.div<{ $isEnabled: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${p => p.$isEnabled ? 'rgba(72, 214, 76, 0.02)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${p => p.$isEnabled ? 'rgba(72, 214, 76, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  padding: 16px 24px;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: ${p => p.$isEnabled ? 'rgba(72, 214, 76, 0.3)' : 'rgba(255, 255, 255, 0.15)'};
  }
  .menu-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    margin-right: 24px;
    h3 { font-size: 1.05rem; font-weight: 600; color: #fff; margin: 0; }
    p { font-size: 0.8rem; color: rgba(255, 255, 255, 0.4); margin: 0; }
  }
`;

const CategorySelectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 1rem;
`;

const CategorySelectionCard = styled.div<{ $isEnabled: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${p => p.$isEnabled ? 'rgba(72, 214, 76, 0.02)' : 'rgba(255, 255, 255, 0.01)'};
  border: 1px solid ${p => p.$isEnabled ? 'rgba(72, 214, 76, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 12px;
  padding: 16px 24px;
  transition: all 0.2s ease;
  
  .cat-info {
    flex: 1;
    margin-right: 24px;
    h3 { font-size: 1rem; font-weight: 600; color: ${p => p.$isEnabled ? '#fff' : 'rgba(255, 255, 255, 0.5)'}; margin: 0; }
    p { font-size: 0.8rem; color: rgba(255, 255, 255, 0.3); margin: 4px 0 0 0; }
  }
  
  .actions-group {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
  }
`;

export default function StoreContentPage({ params }: { params: { storeId: string } }) {
  const router = useRouter();
  const toast = useToast();

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

  // Filtrar menús maestros habilitados localmente en la sede
  const enabledStoreMenus = masterMenus.filter(mm => 
    storeMenus.some(sm => sm.menu_id === mm.id && sm.disponible === 1)
  );

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
      <HeaderBackButton onClick={() => router.push(getCommerceReturnUrl(storeData?.commerce_id))}>
        ← Volver
      </HeaderBackButton>
      <HeaderSection>
        <StoreHero 
          storeData={storeData}
          getFullImageUrl={getFullImageUrl}
          formatTime={formatTime}
          onEdit={openStoreEditForm}
        />
      </HeaderSection>
 
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
                    <PremiumSwitch 
                      id={`menu-switch-${m.id}`}
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleMenuToggle(m.id, checked)}
                    />
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
                          <PremiumSwitch 
                            id={`cat-switch-${cat.id}`}
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleCategoryToggle(cat.id, checked)}
                          />
                        </div>
                        <ActionButton 
                          $variant={isEnabled ? "success" : "outline"} 
                          style={{ padding: '8px 16px', height: 'auto', fontSize: '0.8rem', opacity: isEnabled ? 1 : 0.35, cursor: isEnabled ? 'pointer' : 'not-allowed' }}
                          onClick={() => {
                            if (isEnabled) {
                              router.push(`/admin/dashboard/stores/${params.storeId}/catalog/${cat.id}`);
                            }
                          }}
                        >
                          Gestionar Productos
                        </ActionButton>
                      </div>
                    </CategorySelectionCard>
                  );
                })}
              </CategorySelectionList>
            )}
          </>
        )}
      </div>

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
