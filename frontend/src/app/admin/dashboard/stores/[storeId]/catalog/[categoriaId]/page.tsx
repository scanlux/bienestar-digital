'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';

// Componentes Comunes
import { useModalScroll } from '@/hooks/useModalScroll';
import { ActionButton, TransitionShield, LoadingState, Spinner, HeaderBackButton } from '@/components/Common/UIElements';
import { useToast } from '@/context/ToastContext';
import { 
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, CloseButton, 
  Form, FormGrid, InputGroup, Label, Input, TextArea, SubmitButton, SwitchGroup, PremiumSwitch 
} from '@/components/Common/ModalStyles';

import { API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';
import { getFullImageUrl } from '@/utils';

// Estilos locales específicos
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ProductSelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 1rem;
`;

const ProductSelectionCard = styled.div<{ $isEnabled: boolean }>`
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${p => p.$isEnabled ? 'rgba(72, 214, 76, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s ease;
  position: relative;
  min-height: 200px;
  
  // Opacidad y escala de grises si está deshabilitado
  opacity: ${p => p.$isEnabled ? 1 : 0.45};
  filter: ${p => p.$isEnabled ? 'none' : 'grayscale(0.8)'};
  
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: ${p => p.$isEnabled ? 'rgba(72, 214, 76, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  }
  
  .card-top {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
  }
  
  .p-img {
    width: 120px;
    height: 120px;
    border-radius: 12px;
    background: #1a1a1a;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
    img { width: 100%; height: 100%; object-fit: cover; }
    span { font-size: 10px; color: rgba(255,255,255,0.2); }
  }
  
  .p-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    h4 { font-size: 0.95rem; font-weight: 700; color: #fff; line-height: 1.2; margin: 0; }
    .prices {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 6px;
      .price-base { font-size: 0.75rem; color: rgba(255,255,255,0.3); }
      .price-effective { color: var(--emerald); font-weight: 700; font-size: 0.9rem; }
    }
  }
  
  .desc {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.4);
    margin: 6px 0 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding-top: 12px;
    margin-top: auto;
  }
`;

const InfoBox = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  padding-bottom: 8px;
  &:last-child { border: none; padding-bottom: 0; }
  span.label { font-size: 0.85rem; color: rgba(255, 255, 255, 0.4); }
  span.val { font-size: 0.85rem; color: #fff; font-weight: 500; }
`;

export default function StoreCategoryCatalogPage({ params }: { params: { storeId: string, categoriaId: string } }) {
  const router = useRouter();
  const toast = useToast();

  const [products, setProducts] = useState<any[]>([]);
  const [storeData, setStoreData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal de edición local
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [precioLocal, setPrecioLocal] = useState<string>('');
  const [tiempoLocal, setTiempoLocal] = useState<string>('');

  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('Sincronizando...');
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);

  useModalScroll(isEditModalOpen);

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [params.storeId, params.categoriaId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      // 1. Cargar datos de la sede, de la categoría y productos habilitados en esta sede
      const [storeRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/store/${params.storeId}`, { headers }),
        axios.get(`${API_URL}/api/manage/store-products/${params.storeId}/${params.categoriaId}`, { headers })
      ]);

      setStoreData(storeRes.data);
      setProducts(productsRes.data);

      // Cargar info de la categoría para el título
      const commerceId = storeRes.data.commerce_id;
      const menusRes = await axios.get(`${API_URL}/api/manage/menus/${commerceId}`, { headers });
      
      // Buscar la categoría entre los menús del comercio
      let foundCat: any = null;
      for (const m of menusRes.data) {
        const catRes = await axios.get(`${API_URL}/api/manage/categorias/${m.id}`, { headers });
        const match = catRes.data.find((c: any) => c.id === Number(params.categoriaId));
        if (match) {
          foundCat = match;
          break;
        }
      }
      setCategoryData(foundCat);

    } catch (e) {
      console.error(e);
      toast.error('Error al cargar productos de la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = async (productId: number, isEnabled: boolean) => {
    setTransitionMessage('Actualizando Producto...');
    setTransitionLoading(true);
    try {
      const headers = getAuthHeaders();
      const product = products.find(p => p.id === productId);
      
      await axios.post(`${API_URL}/api/manage/store-products`, {
        store_id: Number(params.storeId),
        product_id: productId,
        precio_local: product.precio_local,
        tiempo_prep_local: product.tiempo_prep_local,
        disponible: isEnabled ? 1 : 0
      }, { headers });

      // Actualizar estado local
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, habilitado: isEnabled ? 1 : 0 } : p)
      );
      toast.success(isEnabled ? 'Producto habilitado para la sede' : 'Producto deshabilitado para la sede');
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar disponibilidad del producto');
    } finally {
      setTimeout(() => setTransitionLoading(false), 500);
    }
  };

  const handleOpenEditModal = (product: any) => {
    setCurrentProduct(product);
    // Pre-poblar los campos con el valor local si existe, o con el valor base como valor real del campo (NO placeholder)
    setPrecioLocal(product.precio_local !== null ? String(product.precio_local) : String(product.precio_base));
    setTiempoLocal(product.tiempo_prep_local !== null ? String(product.tiempo_prep_local) : String(product.tiempo_prep_estimado));
    setIsEditModalOpen(true);
  };

  const handleSaveProductConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;

    setTransitionMessage('Guardando configuración...');
    setTransitionLoading(true);
    try {
      const headers = getAuthHeaders();
      
      const numPrecio = precioLocal.trim() === '' ? null : Number(precioLocal);
      const numTiempo = tiempoLocal.trim() === '' ? null : Number(tiempoLocal);

      await axios.post(`${API_URL}/api/manage/store-products`, {
        store_id: Number(params.storeId),
        product_id: currentProduct.id,
        precio_local: numPrecio,
        tiempo_prep_local: numTiempo,
        disponible: 1
      }, { headers });

      // Recargar la información del catálogo para actualizar los precios locales en pantalla
      const productsRes = await axios.get(`${API_URL}/api/manage/store-products/${params.storeId}/${params.categoriaId}`, { headers });
      setProducts(productsRes.data);
      
      setIsEditModalOpen(false);
      toast.success('Configuración local guardada con éxito');
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar configuración local del producto');
    } finally {
      setTimeout(() => setTransitionLoading(false), 500);
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando catálogo de productos...</p>
      </LoadingState>
    );
  }

  return (
    <Container>
      <HeaderBackButton onClick={() => router.push(`/admin/dashboard/stores/${params.storeId}`)}>
        ← Volver
      </HeaderBackButton>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ marginTop: '12px' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 600, color: '#fff', margin: 0 }}>
            Productos de {categoryData?.nombre || 'Categoría'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>
            Habilitación individual de productos para la sede: <strong style={{ color: 'var(--emerald)' }}>{storeData?.nombre_sucursal}</strong>
          </p>
        </div>
      </div>

      <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

      {products.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
          No hay productos creados para esta categoría en el Catálogo Maestro de este comercio.
        </div>
      ) : (
        <ProductSelectionGrid>
          {products.map(prod => {
            const isEnabled = prod.habilitado === 1 || prod.habilitado === true;
            const hasLocalPrice = prod.precio_local !== null;
            const priceToDisplay = hasLocalPrice ? prod.precio_local : prod.precio_base;
            
            return (
              <ProductSelectionCard key={prod.id} $isEnabled={isEnabled}>
                <div className="card-top">
                  <div className="p-img">
                    {prod.image_url ? (
                      <img src={getFullImageUrl(prod.image_url)} alt={prod.nombre} />
                    ) : (
                      <span>Sin foto</span>
                    )}
                  </div>
                  <div className="p-info">
                    <h4>{prod.nombre}</h4>
                    <div className="prices">
                      {hasLocalPrice && (
                        <span className="price-base">Base: ${Number(prod.precio_base).toLocaleString()}</span>
                      )}
                      <span className="price-effective">
                        ${Number(priceToDisplay).toLocaleString()}
                        {hasLocalPrice && <strong style={{ fontSize: '0.65rem', marginLeft: '6px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>(Local)</strong>}
                      </span>
                    </div>
                    {prod.descripcion_larga && <p className="desc" style={{ marginTop: '8px' }}>{prod.descripcion_larga}</p>}
                  </div>
                </div>

                <div className="card-bottom">
                  <ActionButton
                    style={{ padding: '6px 12px', height: 'auto', fontSize: '0.75rem', opacity: isEnabled ? 1 : 0.25, cursor: isEnabled ? 'pointer' : 'not-allowed' }}
                    onClick={() => {
                      if (isEnabled) handleOpenEditModal(prod);
                    }}
                  >
                    Editar Precio
                  </ActionButton>
                  
                  <PremiumSwitch 
                    id={`prod-switch-${prod.id}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleProductToggle(prod.id, checked)}
                  />
                </div>
              </ProductSelectionCard>
            );
          })}
        </ProductSelectionGrid>
      )}

      {/* MODAL DE EDICIÓN LOCAL DE PRODUCTO */}
      {isEditModalOpen && modalTarget && createPortal(
        <ModalOverlay onClick={() => setIsEditModalOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()} $maxWidth="625px">
            <ModalHeader>
              <ModalTitle>Producto: {currentProduct?.nombre}</ModalTitle>
              <CloseButton type="button" onClick={() => setIsEditModalOpen(false)}>✕</CloseButton>
            </ModalHeader>

            <Form onSubmit={handleSaveProductConfig}>
              <InfoBox style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Datos Maestros (Referencia)
                </p>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'flex-start' }}>
                  {currentProduct?.image_url && (
                    <img
                      src={getFullImageUrl(currentProduct.image_url)}
                      alt={currentProduct.nombre}
                      style={{ width: '140px', height: '140px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    />
                  )}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <InfoRow style={{ fontSize: '0.95rem', paddingBottom: '6px', borderBottom: 'none' }}>
                      <span className="label" style={{ fontSize: '0.95rem' }}>Precio Base sugerido:</span>
                      <span className="val" style={{ fontSize: '0.95rem' }}>${Number(currentProduct?.precio_base).toLocaleString()}</span>
                    </InfoRow>
                    <InfoRow style={{ fontSize: '0.95rem', paddingBottom: '6px', borderBottom: 'none' }}>
                      <span className="label" style={{ fontSize: '0.95rem' }}>Tiempo estimado base:</span>
                      <span className="val" style={{ fontSize: '0.95rem' }}>{currentProduct?.tiempo_prep_estimado} minutos</span>
                    </InfoRow>
                    {currentProduct?.es_vegetariano === 1 && (
                      <InfoRow style={{ fontSize: '0.95rem', paddingBottom: '6px', borderBottom: 'none' }}>
                        <span className="label" style={{ fontSize: '0.95rem' }}>Opcion:</span>
                        <span className="val" style={{ fontSize: '0.95rem', color: 'var(--emerald)' }}>Vegetariano</span>
                      </InfoRow>
                    )}
                    {currentProduct?.descripcion_larga && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.4)' }}>Descripcion:</span>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: 1.4 }}>{currentProduct?.descripcion_larga}</p>
                      </div>
                    )}
                  </div>
                </div>
              </InfoBox>

              {/* Campos Editables Locales */}
              <FormGrid>
                <InputGroup>
                  <Label>Precio Local</Label>
                  <Input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={precioLocal} 
                    onChange={e => setPrecioLocal(e.target.value)} 
                    placeholder={String(currentProduct?.precio_base)}
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Tiempo Preparación (Minutos)</Label>
                  <Input 
                    required
                    type="number" 
                    min="1"
                    value={tiempoLocal} 
                    onChange={e => setTiempoLocal(e.target.value)} 
                    placeholder={String(currentProduct?.tiempo_prep_estimado)}
                  />
                </InputGroup>
              </FormGrid>

              <SubmitButton type="submit" style={{ marginTop: '1rem' }}>Guardar en Sede</SubmitButton>
            </Form>
          </ModalContent>
        </ModalOverlay>,
        modalTarget
      )}

      {transitionLoading && modalTarget && createPortal(
        <TransitionShield message={transitionMessage} />,
        modalTarget
      )}
    </Container>
  );
}
