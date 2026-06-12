'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Componentes Comunes
import { useModalScroll } from '@/hooks/useModalScroll';
import { ActionButton, TransitionShield, LoadingState, Spinner, HeaderBackButton } from '@/components/Common/UIElements';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

// Componentes Locales
import { Container, HeaderSection, MenuControlBar, SelectPremium, SeparatorLine, EmptyHeroCard, GlobalFeedbackStyles } from './StoreDetailStyles';
import { MenuAccordion } from './MenuAccordion';
import { StoreModals } from './StoreModals';

import { API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';
import { getFullImageUrl } from '@/utils';
import { getCommerceReturnUrl } from '@/utils/commerceNavigation';

interface CommerceCatalogPageProps {
  commerceId: number;
  isAdminView: boolean;
}

export const CommerceCatalogPage: React.FC<CommerceCatalogPageProps> = ({ commerceId, isAdminView }) => {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const hasWritePermission = isAdminView || (user?.permissions || []).includes('write_catalog');

  const [menus, setMenus] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [activeCategoriaId, setActiveCategoriaId] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [highlightType, setHighlightType] = useState<'category' | 'product' | null>(null);
  const [commerceData, setCommerceData] = useState<any>(null);

  const [modalType, setModalType] = useState<null | 'menu' | 'categoria' | 'product'>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('Sincronizando...');
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);

  useModalScroll(isModalOpen);

  const categoryRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const productRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const scrollToTarget = (id: number, type: 'category' | 'product', categoriaId?: number) => {
    if (type === 'product' && categoriaId) {
      setActiveCategoriaId(categoriaId);
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

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [commerceId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const [menusRes, allProductsRes, commerceRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/menus/${commerceId}`, { headers }),
        axios.get(`${API_URL}/api/manage/products?commerceId=${commerceId}`, { headers }),
        axios.get(`${API_URL}/api/manage/commerces/${commerceId}`, { headers }).catch(() => null)
      ]);

      if (commerceRes && commerceRes.data) {
        setCommerceData(commerceRes.data);
      }

      setMenus(menusRes.data);
      setProducts(allProductsRes.data);

      if (menusRes.data.length > 0) {
        setActiveMenuId(menusRes.data[0].id);
        fetchCategorias(menusRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar catálogo inicial');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async (menuId: number) => {
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

  const openForm = (type: 'menu' | 'categoria' | 'product', initialData: any = {}) => {
    setModalType(type);
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const closeForm = () => {
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
        const payload = { ...formData, commerce_id: commerceId };
        const isNewMenu = !formData.id;
        const res = await axios.post(`${API_URL}/api/manage/menus`, payload, { headers });
        const finalId = formData.id || res.data.id;
        toast.success(formData.id ? 'Menú actualizado con éxito' : 'Menú creado con éxito');
        
        await fetchInitialData();
        if (finalId) {
          setActiveMenuId(finalId);
          fetchCategorias(finalId);
        }

        setIsModalOpen(false);
        setTransitionMessage('Sincronizando Menú...');
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
        const targetCategoriaId = formData.categoria_id || activeCategoriaId;
        const payload = { ...formData, categoria_id: activeCategoriaId, commerce_id: commerceId };
        const res = await axios.post(`${API_URL}/api/manage/products`, payload, { headers });
        const finalId = formData.id || res.data.id;
        toast.success(formData.id ? 'Producto actualizado con éxito' : 'Producto creado con éxito');
        
        try {
          const productsRes = await axios.get(`${API_URL}/api/manage/products?commerceId=${commerceId}`, { headers });
          setProducts(productsRes.data);
        } catch (err) { console.error(err); }
        
        setIsModalOpen(false);
        setTransitionMessage('Sincronizando Producto...');
        setTransitionLoading(true);
        setTimeout(() => {
          scrollToTarget(finalId, 'product', targetCategoriaId);
        }, 300);
        setTimeout(() => setTransitionLoading(false), 1400);
        return;
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

  const handleBack = () => {
    if (isAdminView) {
      router.push(getCommerceReturnUrl(commerceId.toString()));
    } else {
      router.push('/commerce/dashboard');
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando catálogo maestro...</p>
      </LoadingState>
    );
  }

  return (
    <Container>
      <HeaderBackButton onClick={handleBack}>
        ← Volver
      </HeaderBackButton>
      <HeaderSection>
        <div className="top-header-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
            {commerceData?.logo_url && (
              <img 
                src={getFullImageUrl(commerceData.logo_url)} 
                alt={commerceData.nombre} 
                style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }} 
              />
            )}
            <div>
              <h1 className="title" style={{ fontSize: '1.8rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                Catálogo Maestro: {commerceData?.nombre}
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>
                Gestiona los menús, categorías y productos maestros del comercio.
              </p>
            </div>
          </div>
        </div>

        <SeparatorLine />

        <div className="title-group" style={{ marginTop: '10px' }}>
          <h1 className="title" style={{ fontSize: '1.4rem' }}>Administración del Catálogo Maestro</h1>
        </div>

        {menus.length === 0 ? (
          hasWritePermission ? (
            <EmptyHeroCard onClick={() => openForm('menu')}>
              <div className="icon">+</div>
              <p className="animated-text">
                <span className="arrow">→</span> Añada un nuevo Menú <span className="arrow">←</span>
              </p>
            </EmptyHeroCard>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
              No hay menús registrados en este comercio.
            </div>
          )
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
            <div className="button-group">
              {activeMenuId && hasWritePermission && (
                <ActionButton 
                  $variant="outline" 
                  onClick={() => {
                    const menuObj = menus.find(m => m.id === activeMenuId);
                    if (menuObj) openForm('menu', menuObj);
                  }}
                >
                  Editar Menú
                </ActionButton>
              )}
              {hasWritePermission && (
                <ActionButton onClick={() => openForm('menu')}>+ Nuevo Menú</ActionButton>
              )}
            </div>
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
            hasWritePermission={hasWritePermission}
          />
        )}
      </GlobalFeedbackStyles>

      <StoreModals 
        isModalOpen={isModalOpen}
        modalType={modalType}
        formData={formData}
        setFormData={setFormData}
        closeForm={closeForm}
        handleSubmit={handleSubmit}
        showError={toast.error}
        modalTarget={modalTarget}
      />

      {transitionLoading && modalTarget && createPortal(
        <TransitionShield message={transitionMessage} />,
        modalTarget
      )}
    </Container>
  );
};
