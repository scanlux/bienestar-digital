'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled, { keyframes, css } from 'styled-components';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://trendy.sytes.net';

export default function BrandsManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBrandId, setCurrentBrandId] = useState<number | null>(null);
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

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      const res = await axios.get(`${API_URL}/api/manage/brands`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBrands(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentBrandId(null);
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
  };

  const handleOpenEditModal = (brand: any) => {
    setIsEditing(true);
    setCurrentBrandId(brand.id);
    setFormData({ 
      nombre: brand.nombre || '', 
      nit: brand.nit || '',
      telefono: brand.telefono || '',
      ciudad: brand.ciudad || '',
      direccion: brand.direccion || '',
      descripcion: brand.descripcion || '', 
      logo_url: brand.logo_url || '',
      type: brand.type || 'horizontal' 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      if (isEditing && currentBrandId) {
        await axios.put(`${API_URL}/api/manage/brands/${currentBrandId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/manage/brands`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchBrands();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredBrands = brands.filter(b => 
    b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.nit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.ciudad?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer>
      {/* Header Section */}
      <HeaderSection>
        <TitleContainer>
          <MainTitle>Cátalogo de Marcas</MainTitle>
        </TitleContainer>
        
        <ControlsRow>
          <SearchWrapper>
            <SearchInput 
              type="text" 
              placeholder="Buscar por cualquier valor" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIconIcon viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </SearchIconIcon>
          </SearchWrapper>
          
          <AddButton onClick={handleOpenCreateModal}>
            Agregar marca
          </AddButton>
        </ControlsRow>
        <Subtitle>Gestiona todos los negocios registrados en la plataforma.</Subtitle>
      </HeaderSection>

      {/* Grid Section */}
      {loading ? (
        <LoadingWrapper>
          <Spinner />
        </LoadingWrapper>
      ) : (
        <BrandsGrid>
          {filteredBrands.map((brand) => (
            <BrandCard key={brand.id}>
              <CardImageWrapper>
                <BrandImage src={brand.logo_url || 'https://via.placeholder.com/300x200?text=Sin+Imagen'} alt={brand.nombre} />
                <Badge>{brand.type}</Badge>
              </CardImageWrapper>
              
              <CardContent>
                <BrandName>{brand.nombre}</BrandName>
                
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel>Ciudad:</InfoLabel>
                    <InfoValue>{brand.ciudad || 'No definida'}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>NIT:</InfoLabel>
                    <InfoValue>{brand.nit || 'Sin registro'}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Dirección:</InfoLabel>
                    <InfoValue title={brand.direccion}>{brand.direccion || 'No especificada'}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Teléfono:</InfoLabel>
                    <InfoValue>{brand.telefono || 'N/A'}</InfoValue>
                  </InfoItem>
                </InfoGrid>

                <ActionsRow>
                  <QuickActionButton onClick={() => handleOpenEditModal(brand)}>
                    Editar Datos
                  </QuickActionButton>
                  <ManageButton onClick={() => router.push(`/admin/dashboard/brands/${brand.id}`)}>
                    Gestionar Sedes
                  </ManageButton>
                </ActionsRow>
              </CardContent>
            </BrandCard>
          ))}
          
          {filteredBrands.length === 0 && (
             <EmptyState>
                 No se encontraron resultados para "{searchTerm}"
             </EmptyState>
          )}
        </BrandsGrid>
      )}

      {/* Modal Section */}
      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{isEditing ? 'Editar Marca' : 'Nueva Marca'}</ModalTitle>
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
                {isEditing ? 'Guardar Cambios' : 'Crear Negocio'}
              </SubmitButton>
            </Form>
          </ModalContent>
        </ModalOverlay>
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
  margin-bottom: 3rem;
`;

const TitleContainer = styled.div`
  margin-bottom: 1.5rem;
`;

const MainTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  background: white;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  max-width: 500px;
`;

const SearchInput = styled.input`
  width: 100%;
  background: #fff;
  border: none;
  padding: 0.85rem 1.25rem 0.85rem 3rem;
  border-radius: 4px;
  color: #333;
  font-size: 1rem;
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
  padding: 0.85rem 2rem;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  font-size: 0.95rem;
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

const BrandsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const BrandCard = styled.div`
  background: rgba(45, 60, 45, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #10b981;
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

const BrandImage = styled.img`
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

const BrandName = styled.h3`
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #121212;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 600px;
  border-radius: 12px;
  padding: 2rem;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${fadeIn} 0.3s ease;
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
