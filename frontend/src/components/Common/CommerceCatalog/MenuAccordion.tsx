'use client';

import React from 'react';
import { ActionButton } from '@/components/Common/UIElements';
import { 
  ContentArea, 
  AccordionList, 
  AccordionItem, 
  AccordionHeader, 
  Chevron, 
  AccordionContentWrapper, 
  ProductsGrid, 
  ProductCardStyle, 
  ProductCreateCard, 
  EmptyHeroCard,
  EditIconButton
} from './StoreDetailStyles';

import { PremiumSwitch } from '@/components/Common/ModalStyles';

interface MenuAccordionProps {
  categorias: any[];
  products?: any[];
  productsByCategory?: { [catId: number]: any[] };
  activeCategoriaId: number | null;
  highlightedId: number | null;
  highlightType: 'category' | 'product' | null;
  toggleCategoria: (id: number) => void;
  openForm: (type: 'menu' | 'categoria' | 'product', data?: any) => void;
  getFullImageUrl: (url: string) => string;
  categoryRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  productRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  activeMenuId: number | null;
  hasWritePermission: boolean;

  // --- Contexto de Sede (opcionales) ---
  isStoreContext?: boolean;
  onCategoryToggle?: (categoriaId: number, isEnabled: boolean) => void;
  onProductToggle?: (productId: number, isEnabled: boolean) => void;
  canEnableStoreCatalog?: boolean;
  hideHeader?: boolean;
  onProductHighlight?: (productId: number, categoryId: number) => void;
  clearProductHighlight?: (productId?: number) => void;
}

export const MenuAccordion: React.FC<MenuAccordionProps> = ({
  categorias,
  products = [],
  productsByCategory,
  activeCategoriaId,
  highlightedId,
  highlightType,
  toggleCategoria,
  openForm,
  getFullImageUrl,
  categoryRefs,
  productRefs,
  activeMenuId,
  hasWritePermission,
  isStoreContext = false,
  onCategoryToggle,
  onProductToggle,
  canEnableStoreCatalog = false,
  hideHeader = false,
  onProductHighlight,
  clearProductHighlight
}) => {
  return (
    <ContentArea>
      {!hideHeader && (
        <div className="categories-header">
          <h2 className="section-title">Categorías del Menú</h2>
          {activeMenuId && hasWritePermission && (
            <ActionButton onClick={() => openForm('categoria')}>
              + Nueva Categoría
            </ActionButton>
          )}
        </div>
      )}

      <AccordionList>
        {categorias.length === 0 ? (
          hasWritePermission ? (
            <EmptyHeroCard onClick={() => openForm('categoria')}>
              <div className="icon">+</div>
              <p className="animated-text">
                <span className="arrow">→</span> Añada una nueva Categoría <span className="arrow">←</span>
              </p>
            </EmptyHeroCard>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
              No hay categorías registradas en este menú.
            </div>
          )
        ) : (
          categorias.map(cat => {
            const isOpen = activeCategoriaId === cat.id;
            
            // Obtener productos de la categoría (usando mapa indexado o filtrando lista plana)
            const catProducts = productsByCategory 
              ? (productsByCategory[cat.id] || [])
              : products.filter(p => p.categoria_id === cat.id);

            const isCatEnabled = isStoreContext ? (cat.habilitada === 1 || cat.habilitada === true) : undefined;
            const showThumbnails = !isOpen && catProducts.length > 0;

            return (
              <AccordionItem
                key={cat.id}
                $isOpen={isOpen}
                $isEnabled={isCatEnabled}
                className={highlightedId === cat.id && highlightType === 'category' ? 'highlight-glow' : ''}
                ref={(el) => { categoryRefs.current[cat.id] = el; }}
              >
                <AccordionHeader onClick={() => toggleCategoria(cat.id)} $isOpen={isOpen}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {hasWritePermission && (
                        <EditIconButton 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openForm('categoria', cat);
                          }}
                          title="Editar Categoría"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </EditIconButton>
                      )}
                      <h3>{cat.nombre}</h3>
                    </div>

                    <div className="acc-actions">
                      <span className="count">{catProducts.length} productos</span>
                      {isStoreContext && onCategoryToggle && (
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                          {canEnableStoreCatalog ? (
                            <PremiumSwitch
                              id={`store-cat-switch-${cat.id}`}
                              checked={cat.habilitada === 1 || cat.habilitada === true}
                              onCheckedChange={(checked) => onCategoryToggle(cat.id, checked)}
                            />
                          ) : (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: (cat.habilitada === 1 || cat.habilitada === true) ? 'rgba(72, 214, 76, 0.1)' : 'rgba(255, 95, 95, 0.1)',
                              color: (cat.habilitada === 1 || cat.habilitada === true) ? 'var(--emerald)' : '#ff5f5f'
                            }}>
                              {(cat.habilitada === 1 || cat.habilitada === true) ? 'Habilitada' : 'Deshabilitada'}
                            </span>
                          )}
                        </div>
                      )}
                      <Chevron $isOpen={isOpen}>▼</Chevron>
                    </div>
                  </div>

                  {showThumbnails && (
                    <div className="header-thumbnails" onClick={e => e.stopPropagation()}>
                      <div className="thumb-scroll-wrapper">
                        {catProducts.map(prod => (
                          <div 
                            key={prod.id} 
                            className="thumb-item" 
                            title={prod.nombre}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onProductHighlight) {
                                onProductHighlight(prod.id, cat.id);
                              }
                            }}
                          >
                            {prod.image_url ? (
                              <img src={getFullImageUrl(prod.image_url)} alt={prod.nombre} />
                            ) : (
                              <span className="thumb-placeholder">
                                {prod.nombre.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AccordionHeader>

                <AccordionContentWrapper $isOpen={isOpen}>
                  <div className="acc-body">
                    <ProductsGrid>
                      {catProducts.map(prod => {
                        const isProdEnabled = isStoreContext ? (prod.habilitado === 1 || prod.habilitado === true) : undefined;
                        const priceVal = isStoreContext ? (prod.precio_efectivo !== undefined ? prod.precio_efectivo : prod.precio_base) : prod.precio_base;
                        const timeVal = isStoreContext ? (prod.tiempo_efectivo !== undefined ? prod.tiempo_efectivo : prod.tiempo_prep_estimado) : prod.tiempo_prep_estimado;

                        const isHighlighted = highlightedId === prod.id && highlightType === 'product';

                        return (
                          <ProductCardStyle
                            key={prod.id}
                            id={`product-card-${prod.id}`}
                            $isEnabled={isProdEnabled}
                            $isDisponible={prod.disponible === 1 || prod.disponible === true}
                            $isHighlighted={isHighlighted}
                            ref={(el) => { productRefs.current[prod.id] = el; }}
                            onMouseEnter={() => {
                              if (isHighlighted && clearProductHighlight) {
                                clearProductHighlight(prod.id);
                              }
                            }}
                            onClick={(e) => {
                              if (isHighlighted && clearProductHighlight) {
                                e.stopPropagation();
                                clearProductHighlight(prod.id);
                              } else {
                                if (hasWritePermission) openForm('product', prod);
                              }
                            }}
                            style={{ cursor: hasWritePermission ? 'pointer' : 'default' }}
                          >
                            <div className="p-left-col">
                              <div className="p-img">
                                {prod.image_url ? (
                                  <>
                                    <img 
                                      src={getFullImageUrl(prod.image_url)} 
                                      alt={prod.nombre} 
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const sibling = e.currentTarget.nextElementSibling;
                                        if (sibling) {
                                          (sibling as HTMLElement).style.display = 'inline';
                                        }
                                      }}
                                    />
                                    <span style={{ display: 'none' }}>Sin foto</span>
                                  </>
                                ) : (
                                  <span>Sin foto</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="p-info">
                              <div className="p-info-body">
                                <h4>{prod.nombre}</h4>
                                {timeVal && (
                                  <div className="prep-time">
                                    <svg className="icon-time" viewBox="0 0 24 24">
                                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm5.88 15.54l-1.41 1.41-5.11-5.11V7h2v6.13l4.52 4.41z" fill="currentColor"/>
                                    </svg>
                                    <span>Tiempo espera {timeVal} min</span>
                                  </div>
                                )}
                                <span className="price">
                                  ${Number(priceVal).toLocaleString()}
                                </span>
                              </div>
                              
                              <div className="p-info-foot">
                                <div className="action-control">
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                                    {isStoreContext && onProductToggle && (
                                      <div onClick={e => e.stopPropagation()}>
                                        <PremiumSwitch
                                          id={`store-prod-switch-${prod.id}`}
                                          checked={prod.habilitado === 1 || prod.habilitado === true}
                                          onCheckedChange={(checked) => onProductToggle(prod.id, checked)}
                                        />
                                      </div>
                                    )}
                                    {hasWritePermission && <span className="edit-link">Editar</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </ProductCardStyle>
                        );
                      })}

                      {hasWritePermission && (
                        <ProductCreateCard onClick={() => openForm('product', { categoria_id: cat.id })}>
                          <span className="icon">+</span>
                          <p>Añadir Producto a {cat.nombre}</p>
                        </ProductCreateCard>
                      )}
                    </ProductsGrid>
                  </div>
                </AccordionContentWrapper>
              </AccordionItem>
            );
          })
        )}
      </AccordionList>
    </ContentArea>
  );
};
