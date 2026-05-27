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
  EmptyHeroCard 
} from './StoreDetailStyles';

interface MenuAccordionProps {
  categorias: any[];
  products: any[];
  activeCategoriaId: number | null;
  highlightedId: number | null;
  highlightType: 'category' | 'product' | null;
  toggleCategoria: (id: number) => void;
  openForm: (type: any, data?: any) => void;
  getFullImageUrl: (url: string) => string;
  categoryRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  productRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  activeMenuId: number | null;
}

export const MenuAccordion: React.FC<MenuAccordionProps> = ({
  categorias,
  products,
  activeCategoriaId,
  highlightedId,
  highlightType,
  toggleCategoria,
  openForm,
  getFullImageUrl,
  categoryRefs,
  productRefs,
  activeMenuId
}) => {
  return (
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
                className={highlightedId === cat.id && highlightType === 'category' ? 'highlight-glow' : ''}
                ref={(el) => { categoryRefs.current[cat.id] = el; }}
              >
                <AccordionHeader onClick={() => toggleCategoria(cat.id)} $isOpen={isOpen}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3>{cat.nombre}</h3>
                    <ActionButton 
                      $variant="outline" 
                      style={{ padding: '4px 12px', height: 'auto', fontSize: '0.7rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openForm('categoria', cat);
                      }}
                    >
                      Editar
                    </ActionButton>
                  </div>
                  <div className="acc-actions">
                    <span className="count">{catProducts.length} productos</span>
                    <Chevron $isOpen={isOpen}>▼</Chevron>
                  </div>
                </AccordionHeader>

                <AccordionContentWrapper $isOpen={isOpen}>
                  <div className="acc-body">
                    <ProductsGrid>
                      {catProducts.map(prod => (
                        <ProductCardStyle
                          key={prod.id}
                          id={`product-card-${prod.id}`}
                          className={highlightedId === prod.id && highlightType === 'product' ? 'highlight-glow' : ''}
                          ref={(el) => { productRefs.current[prod.id] = el; }}
                          onClick={() => openForm('product', prod)}
                        >
                          <div className="p-img">
                            {prod.image_url ? (
                              <img src={getFullImageUrl(prod.image_url)} alt={prod.nombre} />
                            ) : (
                              <span>Sin foto</span>
                            )}
                          </div>
                          <div className="p-info">
                            <div className="p-head">
                              <h4>{prod.nombre}</h4>
                              <span className="price">
                                ${Number(prod.precio_base).toLocaleString()}
                              </span>
                            </div>
                            <p className="desc">{prod.descripcion_larga}</p>
                            {prod.tiempo_prep_estimado && (
                              <div className="prep-time">
                                <svg className="icon-time" viewBox="0 0 24 24">
                                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm5.88 15.54l-1.41 1.41-5.11-5.11V7h2v6.13l4.52 4.41z" fill="currentColor"/>
                                </svg>
                                <span>{prod.tiempo_prep_estimado} min</span>
                              </div>
                            )}
                            <div className="p-foot">
                              <span className={`status ${prod.disponible ? 'on' : 'off'}`}>
                                {prod.disponible ? 'Disponible' : 'Agotado'}
                              </span>
                              <span className="edit-link">Editar</span>
                            </div>
                          </div>
                        </ProductCardStyle>
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
  );
};
