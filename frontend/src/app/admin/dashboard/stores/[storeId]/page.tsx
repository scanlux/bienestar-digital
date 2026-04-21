'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import Cookies from 'js-cookie';
import MapPickerModal from '@/components/MapPickerModal';
import GeoPermissionModal from '@/components/Common/GeoPermissionModal';
import { useModalScroll } from '@/hooks/useModalScroll';
import {
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, CloseButton,
  Form, FormGrid, InputGroup, Label, Input, Select, TextArea, SubmitButton, CheckboxGroup, GeoButton
} from '@/components/Common/ModalStyles';



const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://trendy.sytes.net';

export default function StoreContentPage({ params }: { params: { storeId: string } }) {
  const router = useRouter();

  const [menus, setMenus] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [activeCategoriaId, setActiveCategoriaId] = useState<number | null>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Modals state
  const [modalType, setModalType] = useState<null | 'menu' | 'categoria' | 'product' | 'store'>('menu');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null);
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const [showGeoWarning, setShowGeoWarning] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'denied' | 'default'>('default');

  // Scroll inteligente para modales
  useModalScroll(isModalOpen);
  useModalScroll(showMapPicker);
  useModalScroll(showGeoWarning);

  // Refs for auto-scroll
  const categoryRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const productRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const scrollToTarget = (id: number, type: 'category' | 'product') => {
    setTimeout(() => {
      const element = type === 'category' ? categoryRefs.current[id] : productRefs.current[id];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
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
      const token = Cookies.get('token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const headers = { Authorization: `Bearer ${token}` };

      const [menusRes, allProductsRes, storeRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/menus/${params.storeId}`, { headers }),
        axios.get(`${API_URL}/api/manage/products`, { headers }),
        axios.get(`${API_URL}/api/manage/store/${params.storeId}`, { headers }).catch(() => null)
      ]);

      if (storeRes && storeRes.data) {
        setStoreData(storeRes.data);
      }

      setMenus(menusRes.data);
      setProducts(allProductsRes.data);

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
      const token = Cookies.get('token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const headers = existingHeaders || { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/api/manage/categorias/${menuId}`, { headers });
      setCategorias(res.data);
      setActiveCategoriaId(null); // Close accordion on menu change
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
        // Auto scroll
        setTimeout(() => {
          categoryRefs.current[newId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return newId;
    });
  };

  const openForm = (type: 'menu' | 'categoria' | 'product' | 'store', initialData: any = {}) => {
    setModalType(type);
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setTransitionLoading(true);
    setTimeout(() => {
      setIsModalOpen(false);
      // Intentar volver al elemento si se conoce el id
      if (formData.id) {
        if (modalType === 'categoria') scrollToTarget(formData.id, 'category');
        if (modalType === 'product') scrollToTarget(formData.id, 'product');
      }
    }, 300);
    setTimeout(() => setTransitionLoading(false), 1400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = Cookies.get('token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (modalType === 'menu') {
        const payload = { ...formData, store_id: params.storeId };
        await axios.post(`${API_URL}/api/manage/menus`, payload, { headers });
        showSuccess('Menú guardado con éxito');
        fetchInitialData();
      } else if (modalType === 'categoria') {
        const payload = { ...formData, menu_id: activeMenuId };
        await axios.post(`${API_URL}/api/manage/categorias`, payload, { headers });
        showSuccess('Categoría guardada con éxito');
        if (activeMenuId) fetchCategorias(activeMenuId);
      } else if (modalType === 'store') {
        const payload = { ...formData, commerce_id: storeData?.commerce_id };
        await axios.post(`${API_URL}/api/manage/stores`, payload, { headers });
        showSuccess(formData.id ? 'Sede actualizada con éxito' : 'Sede creada con éxito');
        if (formData.id) fetchInitialData(); // Refrescar el Hero Header y la data actual de la sede
      } else if (modalType === 'product') {
        const payload = { ...formData, categoria_id: activeCategoriaId, commerce_id: storeData?.commerce_id };
        await axios.post(`${API_URL}/api/manage/products`, payload, { headers });
        showSuccess(formData.id ? 'Producto actualizado con éxito' : 'Producto creado con éxito');
        fetchInitialData(); // Para recargar productos
      }
      setTransitionLoading(true);
      setTimeout(() => {
        setIsModalOpen(false);
        // Navegar de regreso al objetivo
        if (modalType === 'categoria' && formData.id) {
          scrollToTarget(formData.id, 'category');
        } else if (modalType === 'product' && formData.id) {
          scrollToTarget(formData.id, 'product');
        }
      }, 300);
      setTimeout(() => setTransitionLoading(false), 1400);
    } catch (e: any) {
      console.error(e);
      // Solo mostrar error si no fue cancelado o algo similar
      const errorMsg = e.response?.data?.error || e.message || 'Error desconocido';
      showError('Error: ' + errorMsg);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 3500);
  };

  const handleOpenMapPicker = async () => {
    if (!navigator.geolocation) {
      showError('Tu navegador no soporta geolocalización');
      return;
    }

    try {
      // @ts-ignore
      const result = await navigator.permissions.query({ name: 'geolocation' });

      if (result.state === 'granted') {
        setShowMapPicker(true);
      } else {
        setGeoStatus(result.state);
        setShowGeoWarning(true);
        // Intentar disparar el prompt del navegador al mismo tiempo
        navigator.geolocation.getCurrentPosition(() => { }, () => { });
      }
    } catch (err) {
      // Fallback si permissions API no está disponible
      setShowGeoWarning(true);
      navigator.geolocation.getCurrentPosition(() => { }, () => { });
    }
  };

  const handleContinueGeoFlow = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Éxito: abrir mapa
        setFormData({
          ...formData,
          latitud: pos.coords.latitude.toString(),
          longitud: pos.coords.longitude.toString()
        });
        setShowGeoWarning(false);
        setShowMapPicker(true);
      },
      (err) => {
        // Error o Denegado: simplemente cerrar modal (estado inicial)
        setShowGeoWarning(false);
      }
    );
  };

  const handleConfirmCoords = (lat: number, lng: number) => {
    setFormData({
      ...formData,
      latitud: lat.toString(),
      longitud: lng.toString()
    });
    setShowMapPicker(false);
    showSuccess('Coordenadas registradas correctamente');
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando carta...</p>
      </LoadingState>
    )
  }

  return (
    <Container>
      {/* PORTALS AREA */}
      {headerTarget && createPortal(
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: '10%' }}>
          <ActionButton $variant="success" onClick={() => openForm('store')}>+ Añadir Nueva Sede</ActionButton>
        </div>,
        headerTarget
      )}

      <HeaderSection>
        {storeData && (
          <StoreHeroCard $bgImage={storeData?.image_url}>
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <div className="hero-left">
                <h1 className="super-title">{storeData.commerce_nombre} - {storeData.nombre_sucursal}</h1>
                <div className="header-buttons">
                  <ActionButton onClick={() => router.back()} style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>← Volver a Sedes</ActionButton>
                  <ActionButton $variant="success-solid" onClick={() => openForm('store', storeData)}>Editar Sede</ActionButton>
                </div>
              </div>

              <div className="hero-right">
                <div className="info-item">
                  <span className="info-label">• Teléfono</span>
                  <span className="info-value">{storeData.telefono || 'No registrado'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">• Dirección</span>
                  <span className="info-value">{storeData.direccion || 'No registrada'}</span>
                </div>
                {storeData.url_maps && (
                  <div className="info-item">
                    <span className="info-label">• Ubicación</span>
                    <a href={storeData.url_maps} target="_blank" rel="noreferrer" className="info-value highlight">Google Maps &nearr;</a>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">• Coordenadas</span>
                  <span className="info-value">{storeData.latitud ? `${Number(storeData.latitud).toFixed(4)}, ${Number(storeData.longitud).toFixed(4)}` : 'Sin GPS'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">• Estado</span>
                  <span className="info-value">{storeData.estado || 'No definido'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">• Horario</span>
                  <span className="info-value">{storeData.horario_atencion || 'No registrado'}</span>
                </div>

                {storeData.accounts && storeData.accounts.length > 0 ? (
                  storeData.accounts.map((acc: any) => (
                    <div className="info-item" key={acc.id}>
                      <span className="info-label">• Cuenta {acc.banco}</span>
                      <span className="info-value">{acc.numero_cuenta}</span>
                    </div>
                  ))
                ) : (
                  <div className="info-item">
                    <span className="info-label">• Cuenta Bancaria</span>
                    <span className="info-value">Sin configurar</span>
                  </div>
                )}
              </div>
            </div>
          </StoreHeroCard>
        )}

        <SeparatorLine />

        <div className="title-group">
          <h1 className="title">Crear Menú</h1>
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

      {menus.length > 0 && (
        <ContentArea>
          <div className="categories-header">
            <h2 className="section-title">Categorías del Menú</h2>
            {activeMenuId && (
              <ActionButton onClick={() => openForm('categoria')}>
                + Nueva Categoría
              </ActionButton>
            )}
          </div>

          <AccordionList>
            {categorias.length === 0 ? (
              <EmptyHeroCard onClick={() => openForm('categoria')}>
                <div className="icon">+</div>
                <p className="animated-text">
                  <span className="arrow">→</span> Añada una nueva Categoría <span className="arrow">←</span>
                </p>
              </EmptyHeroCard>
            ) : (
              categorias.map(cat => {
                const isOpen = activeCategoriaId === cat.id;
                const catProducts = products.filter(p => p.categoria_id === cat.id);

                return (
                  <AccordionItem
                    key={cat.id}
                    $isOpen={isOpen}
                    ref={(el) => { categoryRefs.current[cat.id] = el; }}
                  >
                    <AccordionHeader onClick={() => toggleCategoria(cat.id)} $isOpen={isOpen}>
                      <h3>{cat.nombre}</h3>
                      <div className="acc-actions">
                        <span className="count">{catProducts.length} productos</span>
                        <Chevron $isOpen={isOpen}>▼</Chevron>
                      </div>
                    </AccordionHeader>

                    <AccordionContentWrapper $isOpen={isOpen}>
                      <div className="acc-body">
                        {/* Grid de Productos */}
                        <ProductsGrid>
                          {catProducts.map(prod => (
                            <ProductCard
                              key={prod.id}
                              id={`product-card-${prod.id}`}
                              ref={(el) => { productRefs.current[prod.id] = el; }}
                              onClick={() => openForm('product', prod)}
                            >
                              <div className="p-img">
                                {prod.image_url ? <img src={prod.image_url} alt={prod.nombre} /> : <span>Sin foto</span>}
                              </div>
                              <div className="p-info">
                                <div className="p-head">
                                  <h4>{prod.nombre}</h4>
                                  <span className="price">${Number(prod.precio_base).toLocaleString()}</span>
                                </div>
                                <p className="desc">{prod.descripcion_larga}</p>
                                <div className="p-foot">
                                  <span className={`status ${prod.disponible ? 'on' : 'off'}`}>
                                    {prod.disponible ? 'Disponible' : 'Agotado'}
                                  </span>
                                  <span className="edit-link">Editar</span>
                                </div>
                              </div>
                            </ProductCard>
                          ))}

                          <ProductCreateCard onClick={() => openForm('product')}>
                            <span className="icon">+</span>
                            <p>Añadir Producto a {cat.nombre}</p>
                          </ProductCreateCard>
                        </ProductsGrid>
                      </div>
                    </AccordionContentWrapper>
                  </AccordionItem>
                );
              })
            )}
          </AccordionList>
        </ContentArea>
      )}

      {/* Modal Maestro Estandarizado */}
      {/* MODAL SECTION - Montado fuera del header para evitar recortes de scroll */}
      {isModalOpen && modalTarget && createPortal(
        <ModalOverlay onClick={closeForm}>
          <ModalContent onClick={e => e.stopPropagation()} $maxWidth={modalType === 'store' ? '800px' : (modalType === 'product' ? '650px' : '450px')}>
            <ModalHeader>
              <ModalTitle>
                {modalType === 'menu' && 'Crear Nuevo Menú'}
                {modalType === 'categoria' && 'Crear Categoría'}
                {modalType === 'product' && (formData.id ? 'Editar Producto' : 'Añadir Producto')}
                {modalType === 'store' && (formData.id ? 'Editar Sede' : 'Añadir Nueva Sede')}
              </ModalTitle>
              <CloseButton onClick={closeForm}>✕</CloseButton>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
              {/* Campos base (solo para menú/categoría/producto) */}
              {modalType !== 'store' && (
                <>
                  <InputGroup>
                    <Label>Nombre {modalType === 'product' && 'del Producto'}</Label>
                    <Input required type="text" value={formData.nombre || ''} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                  </InputGroup>

                  {modalType !== 'product' && (
                    <InputGroup>
                      <Label>Descripción corta</Label>
                      <Input type="text" value={formData.descripcion || ''} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                    </InputGroup>
                  )}
                </>
              )}

              {modalType === 'product' && (
                <>
                  <FormGrid>
                    <InputGroup>
                      <Label>Precio</Label>
                      <Input required type="number" step="0.01" value={formData.precio_base || ''} onChange={e => setFormData({ ...formData, precio_base: e.target.value })} />
                    </InputGroup>
                    <InputGroup>
                      <Label>Tiempo Estimado (ej. 15m)</Label>
                      <Input type="text" value={formData.tiempo_prep_estimado || ''} onChange={e => setFormData({ ...formData, tiempo_prep_estimado: e.target.value })} />
                    </InputGroup>
                  </FormGrid>

                  <InputGroup>
                    <Label>Descripción Atractiva</Label>
                    <TextArea required value={formData.descripcion_larga || ''} onChange={e => setFormData({ ...formData, descripcion_larga: e.target.value })} placeholder="Describe el plato de forma que genere antojo..." rows={3} />
                  </InputGroup>

                  <InputGroup>
                    <Label>URL de Fotografía (Estrategia Visual)</Label>
                    <Input type="text" value={formData.image_url || ''} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                  </InputGroup>

                  <CheckboxGroup>
                    <input type="checkbox" id="dispo" checked={formData.disponible !== false} onChange={e => setFormData({ ...formData, disponible: e.target.checked })} />
                    <label htmlFor="dispo">Producto Disponible al Público</label>
                  </CheckboxGroup>
                </>
              )}

              {modalType === 'store' && (
                <>
                  <FormGrid>
                    <InputGroup>
                      <Label>Nombre de la Sede</Label>
                      <Input required type="text" value={formData.nombre_sucursal || ''} onChange={e => setFormData({ ...formData, nombre_sucursal: e.target.value })} placeholder="Ej: Sede Centro, Sucursal Norte..." />
                    </InputGroup>
                    <InputGroup>
                      <Label>Estado</Label>
                      <Select value={formData.estado || 'abierto'} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                        <option value="abierto">Abierto</option>
                        <option value="cerrado">Cerrado</option>
                        <option value="mantenimiento">En mantenimiento</option>
                      </Select>
                    </InputGroup>
                  </FormGrid>

                  <FormGrid>
                    <InputGroup>
                      <Label>Teléfono de Contacto</Label>
                      <Input type="text" value={formData.telefono || ''} onChange={e => setFormData({ ...formData, telefono: e.target.value })} placeholder="+57 300..." />
                    </InputGroup>
                    <InputGroup>
                      <Label>Dirección física</Label>
                      <Input required type="text" value={formData.direccion || ''} onChange={e => setFormData({ ...formData, direccion: e.target.value })} placeholder="Calle 10 # 5-20" />
                    </InputGroup>
                  </FormGrid>

                  <InputGroup>
                    <Label>Ubicación en Google Maps (URL)</Label>
                    <Input type="text" value={formData.url_maps || ''} onChange={e => setFormData({ ...formData, url_maps: e.target.value })} placeholder="https://www.google.com/maps/..." />
                  </InputGroup>

                  <FormGrid>
                    <InputGroup>
                      <Label>Latitud</Label>
                      <Input type="number" step="0.00000001" value={formData.latitud || ''} onChange={e => setFormData({ ...formData, latitud: e.target.value })} placeholder="4.12345678" />
                    </InputGroup>
                    <InputGroup>
                      <Label>Longitud</Label>
                      <Input type="number" step="0.00000001" value={formData.longitud || ''} onChange={e => setFormData({ ...formData, longitud: e.target.value })} placeholder="-74.12345678" />
                    </InputGroup>
                  </FormGrid>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <GeoButton type="button" onClick={handleOpenMapPicker}>
                      <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" /></svg>
                      Registrar geolocalización
                    </GeoButton>
                  </div>

                  <InputGroup>
                    <Label>URL de Fotografía</Label>
                    <Input type="text" value={formData.image_url || ''} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                  </InputGroup>

                  <InputGroup>
                    <Label>Horario de Atención</Label>
                    <Input type="text" value={formData.horario_atencion || ''} onChange={e => setFormData({ ...formData, horario_atencion: e.target.value })} placeholder="Lun-Vie 8am-8pm, Sáb 9am-5pm" />
                  </InputGroup>
                </>
              )}

              <SubmitButton type="submit">Guardar Cambios</SubmitButton>
            </Form>
          </ModalContent>
        </ModalOverlay>,
        modalTarget
      )}

      {/* Modal del Mapa */}
      {showMapPicker && modalTarget && createPortal(
        <MapPickerModal
          onClose={() => setShowMapPicker(false)}
          onConfirm={handleConfirmCoords}
          initialLat={parseFloat(formData.latitud) || undefined}
          initialLng={parseFloat(formData.longitud) || undefined}
        />,
        modalTarget
      )}

      {/* Modal de Advertencia de Geolocalización */}
      {showGeoWarning && modalTarget && createPortal(
        <GeoPermissionModal
          status={geoStatus}
          onContinue={handleContinueGeoFlow}
          onClose={() => setShowGeoWarning(false)}
        />,
        modalTarget
      )}

      {successMessage && (
        <SuccessToast>
          <div className="icon">✓</div>
          {successMessage}
        </SuccessToast>
      )}

      {errorMessage && (
        <ErrorToast>
          <div className="icon">✕</div>
          {errorMessage}
        </ErrorToast>
      )}

      {/* Escudo de Transición Inteligente */}
      {transitionLoading && modalTarget && createPortal(
        <TransitionShield>
          <div className="spinner-grid" />
          <p style={{ marginTop: '1rem', color: '#10b981', fontWeight: 600 }}>Cargando posición...</p>
        </TransitionShield>,
        modalTarget
      )}
    </Container>
  );
}

// === STYLED COMPONENTS ===

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const TransitionShield = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  
  .spinner-grid {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(16, 185, 129, 0.1);
    border-top: 3px solid #10b981;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  .top-header-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .header-buttons {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-top: 20px;

    .title {
      font-size: 1.5rem; font-weight: 300;
      letter-spacing: -0.02em; color: #fff;
    }
  }
`;

const StoreHeroCard = styled.div<{ $bgImage?: string }>`
  position: relative;
  width: 100%;
  min-height: 200px;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 20px;
  display: flex;
  background-color: #111;
  background-image: url(${p => p.$bgImage || ''});
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .hero-overlay {
    position: absolute;
    inset: 0;
    /* Gradiente oscuro hacia la derecha que se vuelve verde oscurito con opacidad */
    background: linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(13, 33, 16, 0.85) 100%);
    z-index: 1;
  }

  .hero-content {
    position: relative;
    z-index: 2;
    padding: 30px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 30px;
  }

  .hero-left {
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;

    .super-title {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      letter-spacing: -0.01em;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
  }

  .header-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .hero-right {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(0, 0, 0, 0.4);
    padding: 20px 24px;
    border-radius: 16px;
    border: 1px solid rgba(72, 214, 76, 0.2);
    min-width: 320px;

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-size: 0.85rem;
      border-bottom: 1px dashed rgba(255,255,255,0.1);
      padding-bottom: 6px;
      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
    }
    .info-label {
      color: rgba(255,255,255,0.6);
      font-weight: 500;
    }
    .info-value {
      color: #fff;
      font-weight: 700;
      text-align: right;
      
      &.highlight {
        color: var(--emerald);
        text-decoration: underline;
      }
    }
  }

  @media (max-width: 768px) {
    .hero-content {
      flex-direction: column;
      align-items: flex-start;
    }
    .hero-right {
      width: 100%;
      min-width: auto;
    }
  }
`;

const SeparatorLine = styled.div`
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 0 -24px;
`;

const MenuControlBar = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .selector-group {
    display: flex;
    align-items: center;
    gap: 12px;
    label { font-size: 0.9rem; color: rgba(255, 255, 255, 0.5); }
  }

  .button-group {
    display: flex;
    gap: 12px;
  }
`;

const HeaderPortalContainer = styled.div`
  display: flex;
  align-items: center;
`;

const SelectPremium = styled.select`
  appearance: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 10px 40px 10px 16px;
  border-radius: 10px;
  font-size: 0.95rem; font-weight: 600;
  outline: none; cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 14px top 50%;
  background-size: 10px auto;
  transition: all 0.2s;
  min-width: 320px;
  max-width: 100%;
  
  &:focus { border-color: var(--emerald); }
  option { background: #111; color: #fff; }
`;

const ActionButton = styled.button<{ $variant?: 'outline' | 'success-soft' | 'success-solid' }>`
  background: ${p => {
    if (p.$variant === 'success-solid') return 'var(--emerald)';
    if (p.$variant === 'outline') return 'transparent';
    if (p.$variant === 'success-soft') return 'rgba(72, 214, 76, 0.25)'; // Más verde, menos opaco
    return 'rgba(72, 214, 76, 0.1)';
  }};
  color: ${p => {
    if (p.$variant === 'success-solid') return '#000';
    if (p.$variant === 'outline') return 'rgba(255,255,255,0.6)';
    return 'var(--emerald)';
  }};
  border: 1px solid ${p => {
    if (p.$variant === 'success-solid') return 'var(--emerald)';
    if (p.$variant === 'outline') return 'rgba(255,255,255,0.1)';
    if (p.$variant === 'success-soft') return 'rgba(72, 214, 76, 0.4)';
    return 'rgba(72, 214, 76, 0.2)';
  }};
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.85rem; font-weight: 700; cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: ${p => {
    if (p.$variant === 'success-solid') return '#50e854';
    if (p.$variant === 'outline') return 'rgba(255,255,255,0.05)';
    if (p.$variant === 'success-soft') return 'rgba(72, 214, 76, 0.35)';
    return 'rgba(72, 214, 76, 0.2)';
  }};
    color: ${p => {
    if (p.$variant === 'success-solid') return '#000';
    if (p.$variant === 'outline') return '#fff';
    return 'var(--emerald)';
  }};
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  .categories-header {
     display: flex; 
     justify-content: flex-start; 
     align-items: center;
     gap: 20px;
     .section-title { font-size: 1.2rem; font-weight: 600; color: #fff; }
  }
`;

const AccordionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AccordionItem = styled.div<{ $isOpen: boolean }>`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${p => p.$isOpen ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.3s ease;
`;

const AccordionHeader = styled.div<{ $isOpen: boolean }>`
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: ${p => p.$isOpen ? 'rgba(72, 214, 76, 0.05)' : 'transparent'};
  transition: background 0.2s;

  &:hover { background: rgba(255, 255, 255, 0.04); }

  h3 { 
     font-size: 1.1rem; font-weight: 600; 
     color: ${p => p.$isOpen ? 'var(--emerald)' : '#fff'};
     transition: color 0.3s;
  }
  
  .acc-actions {
     display: flex; align-items: center; gap: 16px;
     .count { font-size: 0.8rem; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 20px; }
  }
`;

const Chevron = styled.span<{ $isOpen: boolean }>`
  font-size: 0.8rem;
  color: ${p => p.$isOpen ? 'var(--emerald)' : 'rgba(255,255,255,0.3)'};
  transform: ${p => p.$isOpen ? 'rotate(-180deg)' : 'rotate(0deg)'};
  transition: transform 0.3s ease, color 0.3s ease;
`;

/* Pure CSS Accordion Magic */
const AccordionContentWrapper = styled.div<{ $isOpen: boolean }>`
  display: grid;
  grid-template-rows: ${p => p.$isOpen ? '1fr' : '0fr'};
  transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  .acc-body {
    overflow: hidden;
  }
`;

const ProductsGrid = styled.div`
  padding: 0 24px 24px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: ${p => p.children ? '16px' : '0'};
`;

const ProductCard = styled.div`
  display: flex;
  gap: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(72, 214, 76, 0.3);
    box-shadow: 0 4px 20px rgba(72, 214, 76, 0.05);
  }

  .p-img {
    width: 80px; height: 80px; border-radius: 10px; background: #1a1a1a; flex-shrink: 0; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    img { width: 100%; height: 100%; object-fit: cover; }
    span { font-size: 10px; color: rgba(255,255,255,0.2); }
  }

  .p-info {
    flex: 1; display: flex; flex-direction: column; justify-content: space-between;
    .p-head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
      h4 { font-size: 0.95rem; font-weight: 700; color: #fff; line-height: 1.2; }
      .price { color: var(--emerald); font-weight: 700; font-size: 0.9rem; }
    }
    .desc { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    
    .p-foot {
      display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;
      .status { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
      .status.on { background: rgba(72, 214, 76, 0.1); color: var(--emerald); }
      .status.off { background: rgba(255, 95, 95, 0.1); color: #ff5f5f; }
      .edit-link { font-size: 0.75rem; color: rgba(255,255,255,0.3); text-decoration: underline; }
    }
  }
`;

const ProductCreateCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: transparent;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 114px;

  .icon { font-size: 24px; color: rgba(255,255,255,0.2); }
  p { font-size: 0.85rem; color: rgba(255,255,255,0.4); text-align: center; font-weight: 500;}

  &:hover {
    border-color: rgba(72, 214, 76, 0.4);
    background: rgba(72, 214, 76, 0.02);
    .icon { color: var(--emerald); }
    p { color: rgba(255,255,255,0.7); }
  }
`;

const EmptyState = styled.div`
  border: 1px dashed rgba(255, 255, 255, 0.1);
  padding: 40px;
  text-align: center;
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
`;

const EmptyHeroCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: transparent;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 60px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 20px;

  &:hover {
    border-color: rgba(72, 214, 76, 0.4);
    background: rgba(72, 214, 76, 0.02);
  }

  .icon {
    font-size: 32px;
    color: rgba(255,255,255,0.2);
    transition: color 0.2s;
  }

  &:hover .icon {
    color: var(--emerald);
  }

  .animated-text {
    font-size: 1.5rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 16px;
    animation: colorShift 4s infinite;
  }

  .arrow {
    animation: fadeArrow 1.5s infinite alternate;
  }

  @keyframes colorShift {
    0% { color: #fff; }
    33% { color: rgb(72, 214, 76); }
    66% { color: #ccc; }
    100% { color: #fff; }
  }

  @keyframes fadeArrow {
    0% { opacity: 0; color: rgba(17, 17, 17, 1); } /* Blend with dark bg */
    100% { opacity: 1; color: inherit; }
  }
`;

// Estilos de modal y formulario centralizados en @/components/Common/ModalStyles

const LoadingState = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; gap: 16px;
  p { font-size: 0.9rem; color: rgba(255, 255, 255, 0.3); font-weight: 600; }
`;

const Spinner = styled.div`
  width: 32px; height: 32px; border: 2px solid rgba(72, 214, 76, 0.1); border-top-color: var(--emerald); border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const SuccessToast = styled.div`
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(72, 214, 76, 0.95);
  color: #000;
  padding: 16px 32px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  box-shadow: 0 10px 30px rgba(72, 214, 76, 0.3);
  z-index: 2000;
  animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  .icon {
    width: 24px;
    height: 24px;
    background: #000;
    color: rgb(72, 214, 76);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 14px;
  }

  @keyframes toastIn {
    from { 
      transform: translateX(-50%) translateY(100px);
      opacity: 0;
    }
    to { 
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
`;

const ErrorToast = styled(SuccessToast)`
  background: rgba(255, 95, 95, 0.95);
  box-shadow: 0 10px 30px rgba(255, 95, 95, 0.3);
  .icon { color: #ff5f5f; }
`;
