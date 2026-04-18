'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import styled, { keyframes, css } from 'styled-components';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MapPickerModal from '@/components/MapPickerModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://trendy.sytes.net';

export default function CommerceManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [commerces, setCommerces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    setPortalTarget(document.getElementById('header-portal-root'));
  }, []);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCommerceId, setCurrentCommerceId] = useState<number | null>(null);
  const [highlightedCommerceId, setHighlightedCommerceId] = useState<number | null>(null);
  
  // Toast states
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };
  const [formData, setFormData] = useState({ 
    nombre: '', 
    nit: '',
    telefono: '',
    ciudad: '',
    direccion: '',
    descripcion: '', 
    logo_url: '',
    type: 'horizontal' 
  });

  // Sedes states
  const [sedesModalOpen, setSedesModalOpen] = useState(false);
  const [createSedeModalOpen, setCreateSedeModalOpen] = useState(false);
  const [isEditingSede, setIsEditingSede] = useState(false);
  const [sedesDelComercio, setSedesDelComercio] = useState<any[]>([]);
  const [selectedCommerce, setSelectedCommerce] = useState<any>(null);
  const [loadingSedes, setLoadingSedes] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [sedeFormData, setSedeFormData] = useState<any>({
    id: null,
    nombre_sucursal: '',
    telefono: '',
    direccion: '',
    horario_atencion: '',
    estado: 'abierto',
    image_url: '',
    url_maps: '',
    latitud: '',
    longitud: ''
  });

  useEffect(() => {
    fetchCommerces();
  }, []);

  const fetchCommerces = async () => {
    setLoading(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const res = await axios.get(`${API_URL}/api/manage/commerces`, {
        headers: { Authorization: `Bearer ${token}` }
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

  const scrollToCommerce = (commerceId: number) => {
    setHighlightedCommerceId(commerceId);
    setTimeout(() => {
      const element = document.getElementById(`commerce-card-${commerceId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 600);
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentCommerceId(null);
    setFormData({ 
      nombre: '', 
      nit: '',
      telefono: '',
      ciudad: '',
      direccion: '',
      descripcion: '', 
      logo_url: '',
      type: 'horizontal' 
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
      telefono: commerce.telefono || '',
      ciudad: commerce.ciudad || '',
      direccion: commerce.direccion || '',
      descripcion: commerce.descripcion || '', 
      logo_url: commerce.logo_url || '',
      type: commerce.type || 'horizontal' 
    });
    setIsModalOpen(true);
    scrollToTop();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      let savedCommerceId = currentCommerceId;
      
      if (isEditing && currentCommerceId) {
        await axios.put(`${API_URL}/api/manage/commerces/${currentCommerceId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        const res = await axios.post(`${API_URL}/api/manage/commerces`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Si es creación, podríamos obtener el ID del response si el backend lo envía
        if (res.data && res.data.id) savedCommerceId = res.data.id;
      }
      
      setIsModalOpen(false);
      await fetchCommerces();
      showSuccess(isEditing ? 'Comercio actualizado correctamente' : 'Nuevo comercio creado con éxito');
      
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
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const res = await axios.get(`${API_URL}/api/manage/stores/${commerce.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stores = res.data;
      if (stores.length === 0) {
        setSedeFormData({ 
          id: null,
          nombre_sucursal: '', 
          telefono: '', 
          direccion: '', 
          horario_atencion: '', 
          estado: 'abierto', 
          image_url: '',
          url_maps: '',
          latitud: '',
          longitud: ''
        });
        setIsEditingSede(false);
        setCreateSedeModalOpen(true);
        scrollToTop();
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

  const handleCrearOSedeAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const payload = { ...sedeFormData, commerce_id: selectedCommerce?.id };
      await axios.post(`${API_URL}/api/manage/stores`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess(isEditingSede ? 'Sede actualizada con éxito' : 'Nueva sede creada con éxito');
      setCreateSedeModalOpen(false);
      if (sedesModalOpen) {
        // Refrescar lista de sedes
        handleGestionarSedes(selectedCommerce);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSedeFromModal = (sede: any) => {
    setSedeFormData({
      id: sede.id,
      nombre_sucursal: sede.nombre_sucursal || '',
      telefono: sede.telefono || '',
      direccion: sede.direccion || '',
      horario_atencion: sede.horario_atencion || '',
      estado: sede.estado || 'abierto',
      image_url: sede.image_url || '',
      url_maps: sede.url_maps || '',
      latitud: sede.latitud || '',
      longitud: sede.longitud || ''
    });
    setIsEditingSede(true);
    setCreateSedeModalOpen(true);
  };

  const handleOpenMapPicker = () => {
    setShowMapPicker(true);
  };

  const handleConfirmCoords = (lat: number, lng: number) => {
    setSedeFormData({
      ...sedeFormData,
      latitud: lat.toString(),
      longitud: lng.toString()
    });
    setShowMapPicker(false);
  };

  return (
    <PageContainer>
      {/* Herramientas Inyectadas en el Layout via Portal */}
      {portalTarget && createPortal(
        <ControlsRow>
          <SearchWrapper>
            <SearchInput 
              type="text" 
              placeholder="Busca por cualquier valor" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIconIcon viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </SearchIconIcon>
          </SearchWrapper>
          
          <AddButton onClick={handleOpenCreateModal}>
            Agregar comercio
          </AddButton>
        </ControlsRow>,
        portalTarget
      )}

      {/* Grid Section */}
      {loading ? (
        <LoadingWrapper>
          <Spinner />
        </LoadingWrapper>
      ) : (
        <CommercesGrid style={{ marginTop: '1rem' }}>
          {filteredCommerces.map((commerce) => (
            <CommerceCard 
              key={commerce.id} 
              id={`commerce-card-${commerce.id}`}
              $isHighlighted={highlightedCommerceId === commerce.id}
            >
              <CardImageWrapper>
                <CommerceImage src={commerce.logo_url || 'https://via.placeholder.com/300x200?text=Sin+Imagen'} alt={commerce.nombre} />
                <Badge>{commerce.type}</Badge>
              </CardImageWrapper>
              
              <CardContent>
                <CommerceName>{commerce.nombre}</CommerceName>
                
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel>Ciudad:</InfoLabel>
                    <InfoValue>{commerce.ciudad || 'No definida'}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>NIT:</InfoLabel>
                    <InfoValue>{commerce.nit || 'Sin registro'}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Dirección:</InfoLabel>
                    <InfoValue title={commerce.direccion}>{commerce.direccion || 'No especificada'}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Teléfono:</InfoLabel>
                    <InfoValue>{commerce.telefono || 'N/A'}</InfoValue>
                  </InfoItem>
                </InfoGrid>

                <ActionsRow>
                  <QuickActionButton onClick={() => handleOpenEditModal(commerce)}>
                    Editar Datos
                  </QuickActionButton>
                  <ManageButton
                    onClick={() => handleGestionarSedes(commerce)}
                    disabled={loadingSedes && selectedCommerce?.id === commerce.id}
                  >
                    {loadingSedes && selectedCommerce?.id === commerce.id ? 'Cargando...' : 'Gestionar Sedes'}
                  </ManageButton>
                </ActionsRow>
              </CardContent>
            </CommerceCard>
          ))}
          
          {filteredCommerces.length === 0 && (
             <EmptyState>
                 No se encontraron resultados para &quot;{searchTerm}&quot;
             </EmptyState>
          )}
        </CommercesGrid>
      )}

      {/* Modal Section */}
      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{isEditing ? 'Editar Comercio' : 'Nuevo Comercio'}</ModalTitle>
              <CloseButton onClick={() => setIsModalOpen(false)}>✕</CloseButton>
            </ModalHeader>
            
            <Form onSubmit={handleSubmit}>
              <FormGrid>
                <InputGroup>
                  <Label>Nombre Comercial</Label>
                  <Input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: McDonald's" />
                </InputGroup>
                <InputGroup>
                  <Label>NIT</Label>
                  <Input required type="text" value={formData.nit} onChange={e => setFormData({...formData, nit: e.target.value})} placeholder="900.000.000-1" />
                </InputGroup>
                <InputGroup>
                  <Label>Ciudad</Label>
                  <Input required type="text" value={formData.ciudad} onChange={e => setFormData({...formData, ciudad: e.target.value})} placeholder="Bogotá, Medellín..." />
                </InputGroup>
                <InputGroup>
                  <Label>Teléfono</Label>
                  <Input required type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} placeholder="+57 300..." />
                </InputGroup>
              </FormGrid>

              <InputGroup>
                <Label>Dirección Principal</Label>
                <Input required type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} placeholder="Carrera 7 # 100 - 01" />
              </InputGroup>

              <InputGroup>
                <Label>URL del Logo</Label>
                <Input type="text" value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} placeholder="https://..." />
              </InputGroup>

              <InputGroup>
                <Label>Descripción</Label>
                <TextArea required value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} placeholder="Breve reseña del negocio..." />
              </InputGroup>

              <InputGroup>
                <Label>Tipo de Interfaz</Label>
                <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="horizontal">Horizontal (Clásica)</option>
                  <option value="vertical">Vertical (TikTok Style)</option>
                </Select>
              </InputGroup>

              <SubmitButton type="submit">
                {isEditing ? 'Guardar Cambios' : 'Crear Comercio'}
              </SubmitButton>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal: Seleccionar Sede (2+ sedes) */}
      {sedesModalOpen && selectedCommerce && (
        <ModalOverlay onClick={() => setSedesModalOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: '780px' }}>
            <ModalHeader>
              <div>
                <ModalTitle>Sedes de {selectedCommerce.nombre}</ModalTitle>
                <SedeModalSubtitle>Selecciona una sede para administrarla</SedeModalSubtitle>
              </div>
              <CloseButton onClick={() => setSedesModalOpen(false)}>x</CloseButton>
            </ModalHeader>

            <SedesGrid>
              {sedesDelComercio.map(sede => (
                <SedeCard key={sede.id} $bgImage={sede.image_url} onClick={() => router.push(`/admin/dashboard/stores/${sede.id}`)}>
                  <div className="card-overlay" />
                  <div className="card-content">
                    <SedeCardHeader>
                      <SedeEstadoBadge estado={sede.estado}>
                        {sede.estado}
                      </SedeEstadoBadge>
                    </SedeCardHeader>
                    <SedeNombre>{sede.nombre_sucursal || `Sede #${sede.id}`}</SedeNombre>
                    <SedeInfo>
                      <SedeInfoRow>
                        <SedeInfoIcon viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor"/></SedeInfoIcon>
                        <span>{sede.telefono || 'Sin teléfono'}</span>
                      </SedeInfoRow>
                    </SedeInfo>
                    <SedeEditBtn onClick={(e) => { e.stopPropagation(); handleEditSedeFromModal(sede); }}>
                      Editar Datos &rarr;
                    </SedeEditBtn>
                  </div>
                </SedeCard>
              ))}
              
              <SedeGhostCard onClick={() => {
                setSedeFormData({ id: null, nombre_sucursal: '', telefono: '', direccion: '', horario_atencion: '', estado: 'abierto', image_url: '', url_maps: '', latitud: '', longitud: '' });
                setIsEditingSede(false);
                setCreateSedeModalOpen(true);
              }}>
                <span className="icon">+</span>
                <span className="label">Nueva Sede</span>
              </SedeGhostCard>
            </SedesGrid>
            
            {showSuccessToast && (
              <SuccessToast>
                <div className="toast-icon">✓</div>
                <div className="toast-text">{successMessage}</div>
              </SuccessToast>
            )}
            
            {portalTarget && highlightedCommerceId && createPortal(
              showSuccessToast && (
                <SuccessToast style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9000 }}>
                  <div className="toast-icon">✓</div>
                  <div className="toast-text">{successMessage}</div>
                </SuccessToast>
              ),
              document.body
            )}
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Modal: Crear/Editar Sede (Estandarizado Ancho) */}
      {createSedeModalOpen && selectedCommerce && (
        <ModalOverlay onClick={() => setCreateSedeModalOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <ModalHeader>
              <div>
                <ModalTitle>{isEditingSede ? 'Configurar Sede' : 'Crear Primera Sede'}</ModalTitle>
                <SedeModalSubtitle>{selectedCommerce.nombre} - Gestión de Sucursal</SedeModalSubtitle>
              </div>
              <CloseButton onClick={() => setCreateSedeModalOpen(false)}>x</CloseButton>
            </ModalHeader>

            <Form onSubmit={handleCrearOSedeAction}>
              <FormGrid>
                <InputGroup>
                  <Label>Nombre de la Sede</Label>
                  <Input
                    required
                    type="text"
                    value={sedeFormData.nombre_sucursal}
                    onChange={e => setSedeFormData({...sedeFormData, nombre_sucursal: e.target.value})}
                    placeholder="Ej: Sede Centro, Sucursal Norte..."
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Estado</Label>
                  <Select
                    value={sedeFormData.estado}
                    onChange={e => setSedeFormData({...sedeFormData, estado: e.target.value})}
                  >
                    <option value="abierto">Abierto</option>
                    <option value="cerrado">Cerrado</option>
                    <option value="mantenimiento">En mantenimiento</option>
                  </Select>
                </InputGroup>
              </FormGrid>

              <FormGrid>
                <InputGroup>
                  <Label>Teléfono de Contacto</Label>
                  <Input
                    type="text"
                    value={sedeFormData.telefono}
                    onChange={e => setSedeFormData({...sedeFormData, telefono: e.target.value})}
                    placeholder="+57 300..."
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Dirección</Label>
                  <Input
                    required
                    type="text"
                    value={sedeFormData.direccion}
                    onChange={e => setSedeFormData({...sedeFormData, direccion: e.target.value})}
                    placeholder="Calle 10 # 5-20"
                  />
                </InputGroup>
              </FormGrid>

              <InputGroup>
                <Label>URL de Fotografía</Label>
                <Input
                  type="text"
                  value={sedeFormData.image_url}
                  onChange={e => setSedeFormData({...sedeFormData, image_url: e.target.value})}
                  placeholder="https://..."
                />
              </InputGroup>

              <InputGroup>
                <Label>Ubicación en Google Maps (URL)</Label>
                <Input
                  type="text"
                  value={sedeFormData.url_maps || ''}
                  onChange={e => setSedeFormData({...sedeFormData, url_maps: e.target.value})}
                  placeholder="https://www.google.com/maps/..."
                />
              </InputGroup>

              <FormGrid>
                <InputGroup>
                  <Label>Latitud</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={sedeFormData.latitud || ''}
                    onChange={e => setSedeFormData({...sedeFormData, latitud: e.target.value})}
                    placeholder="4.12345678"
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Longitud</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={sedeFormData.longitud || ''}
                    onChange={e => setSedeFormData({...sedeFormData, longitud: e.target.value})}
                    placeholder="-74.12345678"
                  />
                </InputGroup>
              </FormGrid>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
                <GeoButton type="button" onClick={handleOpenMapPicker}>
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/></svg>
                  Registrar geolocalización
                </GeoButton>
              </div>

              <InputGroup>
                <Label>Horario de Atención</Label>
                <Input
                  type="text"
                  value={sedeFormData.horario_atencion}
                  onChange={e => setSedeFormData({...sedeFormData, horario_atencion: e.target.value})}
                  placeholder="Lun-Vie 8am-8pm, Sáb 9am-5pm"
                />
              </InputGroup>

              <SubmitButton type="submit" disabled={loadingSedes} style={{ marginTop: '10px' }}>
                {isEditingSede ? 'Guardar Cambios' : 'Crear Sede y Continuar'}
              </SubmitButton>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}
      {/* Modal del Mapa */}
      {showMapPicker && (
        <MapPickerModal 
          onClose={() => setShowMapPicker(false)} 
          onConfirm={handleConfirmCoords}
          initialLat={parseFloat(sedeFormData.latitud) || undefined}
          initialLng={parseFloat(sedeFormData.longitud) || undefined}
        />
      )}
    </PageContainer>
  );
}

// ------------- ANIMACIONES NATIVAS -------------
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ------------- STYLED COMPONENTS -------------
const PageContainer = styled.div`
  animation: ${fadeIn} 0.5s ease forwards;
`;

const HeaderSection = styled.div`
  margin: -2rem -2rem 2rem -2rem; /* Negativo para pegar al borde del layout */
  padding: 1.25rem 2.5rem;
  position: sticky;
  top: -2rem; /* Pegado justo debajo del GlassHeader */
  background: var(--Background); /* Fondo sólido */
  z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-right: 1rem;
`;

const SectionTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  letter-spacing: -0.01em;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1.4;
  max-width: 980px;
  margin-right: 2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  background: #fff;
  border: none;
  padding: 0.6rem 1.25rem 0.6rem 3rem;
  border-radius: 4px;
  color: #333;
  font-size: 0.95rem;
  outline: none;
  
  &::placeholder {
    color: #999;
  }
`;

const SearchIconIcon = styled.svg`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #999;
`;

const AddButton = styled.button`
  background: #10b981;
  color: #000;
  padding: 0.6rem 2rem;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);

  &:hover {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
  }
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  margin-top: 0.75rem;
`;

const CommercesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const CommerceCard = styled.div<{ $isHighlighted?: boolean }>`
  background: rgba(45, 60, 45, 0.4);
  border: 1px solid ${props => props.$isHighlighted ? '#eab308' : 'rgba(255, 255, 255, 0.1)'};
  box-shadow: ${props => props.$isHighlighted ? '0 0 25px rgba(234, 179, 8, 0.4)' : 'none'};
  border-width: ${props => props.$isHighlighted ? '2px' : '1px'};
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${props => props.$isHighlighted ? '#eab308' : '#10b981'};
    background: rgba(45, 60, 45, 0.6);
    transform: translateY(-4px);
  }
`;

const CardImageWrapper = styled.div`
  height: 200px;
  position: relative;
  overflow: hidden;
  background: #000;
`;

const CommerceImage = styled.img`
  width: 100%;
  height: 100%;
  object-cover: center;
`;

const Badge = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const CardContent = styled.div`
  padding: 1.5rem;
`;

const CommerceName = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
`;

const InfoLabel = styled.span`
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
`;

const InfoValue = styled.span`
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const QuickActionButton = styled.button`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const ManageButton = styled.button`
  flex: 1.2;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 5rem;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(16, 185, 129, 0.1);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 5rem;
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Aliniado al inicio para coincidir con el auto-scroll */
  padding: 5vh 2rem; /* Espaciado superior dinámico */
  z-index: 1000;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

const ModalContent = styled.div`
  background: #121212;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 650px;
  border-radius: 16px;
  padding: 2.5rem;
  position: relative;
  height: auto;
  margin: 0 auto; /* Centrado solo horizontal, respeta el flex-start vertical */
  animation: ${fadeIn} 0.3s ease;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  color: #fff;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5rem;
  cursor: pointer;
  
  &:hover {
    color: #fff;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.8rem 1rem;
  border-radius: 6px;
  color: #fff;
  outline: none;
  
  &:focus {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }
`;

const TextArea = styled.textarea`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.8rem 1rem;
  border-radius: 6px;
  color: #fff;
  height: 100px;
  resize: none;
  outline: none;
  
  &:focus {
    border-color: #10b981;
  }
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.8rem 1rem;
  border-radius: 6px;
  color: #fff;
  outline: none;
`;

const SubmitButton = styled.button`
  background: #10b981;
  color: #000;
  padding: 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  
  &:hover {
    background: #059669;
  }
`;

// --- Sedes Modal Styles ---
const SedeModalSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  margin-top: 0.25rem;
`;

const SedesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    padding: 0 10px;
  }
`;

const SedeCard = styled.div<{ $bgImage?: string }>`
  position: relative;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background-color: #111;
  background-image: url(${p => p.$bgImage || ''});
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  
  .card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 100%);
    z-index: 1;
    transition: all 0.3s;
  }

  .card-content {
    position: relative;
    z-index: 2;
    padding: 1.25rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: #10b981;
    .card-overlay {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(0,0,0,0.9) 100%);
    }
  }
`;

const SedeGhostCard = styled.div`
  height: 200px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.3);
  transition: all 0.2s;

  .icon { font-size: 2rem; }
  .label { font-size: 0.9rem; font-weight: 600; }

  &:hover {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
    color: #10b981;
  }
`;

const SedeEditBtn = styled.button`
  background: none;
  border: none;
  color: #10b981;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
  padding: 0;
  margin-top: 5px;
  &:hover { text-decoration: underline; }
`;

const slideUp = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const SuccessToast = styled.div`
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  background: #10b981;
  color: #000;
  padding: 12px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
  animation: ${slideUp} 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
  z-index: 2000;

  .toast-icon {
    width: 24px;
    height: 24px;
    background: rgba(0,0,0,0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const SedeCardHeader = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const SedeEstadoBadge = styled.span<{ estado: string }>`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  background: ${({ estado }) =>
    estado === 'abierto' ? 'rgba(16, 185, 129, 0.15)' :
    estado === 'cerrado' ? 'rgba(239, 68, 68, 0.15)' :
    'rgba(234, 179, 8, 0.15)'};
  color: ${({ estado }) =>
    estado === 'abierto' ? '#10b981' :
    estado === 'cerrado' ? '#ef4444' :
    '#eab308'};
`;

const SedeNombre = styled.h4`
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
`;

const SedeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const SedeInfoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
`;

const SedeInfoIcon = styled.svg`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 1px;
  color: rgba(255, 255, 255, 0.3);
`;

const GeoButton = styled.button`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: #10b981;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SedeCardArrow = styled.span`
  font-size: 0.75rem;
  color: #10b981;
  font-weight: 600;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255,255,255,0.05);
`;
