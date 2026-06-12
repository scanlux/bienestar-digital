'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { 
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, CloseButton,
  Form, FormGrid, InputGroup, Label, Input, Select, TextArea, SubmitButton 
} from '@/components/Common/ModalStyles';
import { ActionButton } from '@/components/Common/UIElements';
import { ImageUploadZone } from '@/components/Common/ImageUploadZone';

interface CommerceFormData {
  nombre: string;
  nit: string;
  nit_dv: string;
  admin_nombres: string;
  admin_apellidos: string;
  telefono: string;
  ciudad: string;
  direccion: string;
  logo_url: string;
  descripcion: string;
  type: string;
}

interface CommerceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  currentCommerceId?: number | null;
  formData: CommerceFormData;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitted: boolean;
  modalTarget?: HTMLElement | null;
}

export const CommerceFormModal: React.FC<CommerceFormModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  currentCommerceId,
  formData,
  setFormData,
  onSubmit,
  isSubmitted,
  modalTarget
}) => {
  const router = useRouter();
  const target = modalTarget || (typeof window !== 'undefined' ? document.getElementById('modal-portal-root') : null);

  if (!isOpen || !target) return null;

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ModalTitle>{isEditing ? 'Editar Comercio' : 'Nuevo Comercio'}</ModalTitle>
            {isEditing && currentCommerceId && (
              <ActionButton
                $variant="success-solid"
                type="button"
                style={{ padding: '6px 14px', fontSize: '0.8rem', height: 'auto', borderRadius: '8px' }}
                onClick={() => {
                  onClose();
                  router.push(`/admin/dashboard/commerce/${currentCommerceId}/menus`);
                }}
              >
                Gestionar Menus
              </ActionButton>
            )}
          </div>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>
        
        <Form 
          onSubmit={onSubmit} 
          noValidate 
          className={isSubmitted ? 'was-validated' : ''}
        >
          <FormGrid>
            <InputGroup>
              <Label>Nombre Comercial</Label>
              <Input 
                required 
                type="text" 
                value={formData.nombre} 
                onChange={e => setFormData({...formData, nombre: e.target.value})} 
                placeholder="Ej: McDonald's" 
              />
            </InputGroup>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '10px', alignItems: 'end' }}>
              <InputGroup>
                <Label>NIT - CC</Label>
                <Input 
                  required 
                  type="text" 
                  value={formData.nit} 
                  onChange={e => setFormData({...formData, nit: e.target.value.replace(/\D/g, '')})} 
                  placeholder="900000000" 
                />
              </InputGroup>
              <InputGroup>
                <Label>DV</Label>
                <Input 
                  required 
                  type="text" 
                  maxLength={1}
                  style={{ textAlign: 'center', padding: '0.7rem 0.5rem' }}
                  value={formData.nit_dv} 
                  onChange={e => setFormData({...formData, nit_dv: e.target.value.replace(/\D/g, '')})} 
                  placeholder="0" 
                />
              </InputGroup>
            </div>
            <InputGroup>
              <Label>Nombres del Administrador</Label>
              <Input 
                required 
                type="text" 
                value={formData.admin_nombres} 
                onChange={e => setFormData({...formData, admin_nombres: e.target.value})} 
                placeholder="Nombres" 
              />
            </InputGroup>
            <InputGroup>
              <Label>Apellidos del Administrador</Label>
              <Input 
                required 
                type="text" 
                value={formData.admin_apellidos} 
                onChange={e => setFormData({...formData, admin_apellidos: e.target.value})} 
                placeholder="Apellidos" 
              />
            </InputGroup>
            <InputGroup>
              <Label>Telefono contacto</Label>
              <Input 
                required 
                type="text" 
                value={formData.telefono} 
                onChange={e => setFormData({...formData, telefono: e.target.value.replace(/\D/g, '')})} 
                placeholder="3001234567" 
              />
            </InputGroup>
            <InputGroup>
              <Label>Ciudad</Label>
              <Select 
                required 
                value={formData.ciudad} 
                onChange={e => setFormData({...formData, ciudad: e.target.value})}
              >
                <option value="">Seleccionar ciudad...</option>
                <option value="Yopal">Yopal</option>
                <option value="Tunja">Tunja</option>
                <option value="Villavicencio">Villavicencio</option>
                <option value="Bogota">Bogota</option>
              </Select>
            </InputGroup>
          </FormGrid>

          <InputGroup>
            <Label>Direccion Principal</Label>
            <Input 
              required 
              type="text" 
              value={formData.direccion} 
              onChange={e => setFormData({...formData, direccion: e.target.value})} 
              placeholder="Carrera 7 # 100 - 01" 
            />
          </InputGroup>

          <ImageUploadZone 
            label="Logo del Comercio"
            initialImage={formData.logo_url}
            endpoint="/api/upload/commerce"
            placeholderText="Subir Logo"
            helperText="JPG/PNG/WebP, formato libre."
            onUploadSuccess={(url) => setFormData({ ...formData, logo_url: url })}
          />

          <InputGroup>
            <Label>Descripcion</Label>
            <TextArea 
              value={formData.descripcion} 
              onChange={e => setFormData({...formData, descripcion: e.target.value})} 
              placeholder="Breve resena del negocio (Opcional)..." 
            />
          </InputGroup>

          <InputGroup>
            <Label>Tipo de Interfaz</Label>
            <Select 
              value={formData.type} 
              onChange={e => setFormData({...formData, type: e.target.value})}
            >
              <option value="Empresarial">Empresarial (TikTok Style / Videos)</option>
              <option value="Comercial">Comercial (Clasica)</option>
            </Select>
          </InputGroup>

          <SubmitButton type="submit">
            {isEditing ? 'Guardar Cambios' : 'Crear Comercio'}
          </SubmitButton>
        </Form>
      </ModalContent>
    </ModalOverlay>,
    target
  );
};
