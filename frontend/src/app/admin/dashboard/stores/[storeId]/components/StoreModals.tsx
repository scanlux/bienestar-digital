'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalTitle, 
  CloseButton, 
  Form, 
  FormGrid, 
  InputGroup, 
  Label, 
  Input, 
  Select, 
  TextArea, 
  SubmitButton, 
  CheckboxGroup, 
  GeoButton, 
  GeoInfo,
  SwitchGroup,
  PremiumSwitch
} from '@/components/Common/ModalStyles';
import { ImageUploadZone } from '@/components/Common/ImageUploadZone';
import { ActionButton } from '@/components/Common/UIElements';
import { PaymentAccountCard } from '@/components/Common/PaymentAccountCard';
import { ScheduleGrid, AccountsContainer } from './StoreDetailStyles';

interface StoreModalsProps {
  isModalOpen: boolean;
  modalType: 'menu' | 'categoria' | 'product' | null;
  formData: any;
  setFormData: (data: any) => void;
  closeForm: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  showError: (msg: string) => void;
  modalTarget: HTMLElement | null;
}

export const StoreModals: React.FC<StoreModalsProps> = ({
  isModalOpen,
  modalType,
  formData,
  setFormData,
  closeForm,
  handleSubmit,
  showError,
  modalTarget
}) => {
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  // Reset isSubmitted when modal opens/closes
  React.useEffect(() => {
    if (!isModalOpen) setIsSubmitted(false);
  }, [isModalOpen]);

  const handleLocalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);
    
    if (!e.currentTarget.checkValidity()) {
      showError('Faltan campos obligatorios. Revisa los recuadros en rojo.');
      return;
    }

    if (modalType === 'product' && !formData.image_url) {
      showError('Debe subir una fotografía del producto (Estrategia Visual obligatoria).');
      return;
    }
    
    handleSubmit(e);
  };
  if (!isModalOpen || !modalTarget || !modalType) return null;

  return createPortal(
    <ModalOverlay onClick={closeForm}>
      <ModalContent 
        onClick={e => e.stopPropagation()} 
        $maxWidth={modalType === 'product' ? '650px' : '450px'}
      >
        <ModalHeader>
          <ModalTitle>
            {modalType === 'menu' && 'Crear Nuevo Menú'}
            {modalType === 'categoria' && (formData.id ? 'Editar Categoría' : 'Crear Categoría')}
            {modalType === 'product' && (formData.id ? 'Editar Producto' : 'Añadir Producto')}
          </ModalTitle>
          <CloseButton type="button" onClick={closeForm}>✕</CloseButton>
        </ModalHeader>

        <Form 
          onSubmit={handleLocalSubmit} 
          noValidate 
          className={isSubmitted ? 'was-validated' : ''}
        >
          {modalType === 'product' && (
            <FormGrid style={{ marginBottom: '1rem' }}>
              <SwitchGroup>
                <label htmlFor="dispo">Disponible al Público</label>
                <PremiumSwitch 
                  id="dispo"
                  checked={formData.disponible !== false}
                  onCheckedChange={(checked) => setFormData({ ...formData, disponible: checked })}
                />
              </SwitchGroup>

              <SwitchGroup>
                <label htmlFor="veggie">Opción Vegetariana</label>
                <PremiumSwitch 
                  id="veggie"
                  checked={formData.es_vegetariano === true || formData.es_vegetariano === 1}
                  onCheckedChange={(checked) => setFormData({ ...formData, es_vegetariano: checked })}
                />
              </SwitchGroup>
            </FormGrid>
          )}

          {modalType && (
            <>
              <InputGroup>
                <Label>Nombre {modalType === 'product' && 'del Producto'}</Label>
                <Input 
                  required 
                  type="text" 
                  value={formData.nombre || ''} 
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                />
              </InputGroup>
              {modalType !== 'product' && (
                <InputGroup>
                  <Label>Descripción corta</Label>
                  <Input 
                    type="text" 
                    value={formData.descripcion || ''} 
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })} 
                  />
                </InputGroup>
              )}
            </>
          )}

          {modalType === 'product' && (
            <>
              <FormGrid>
                <InputGroup>
                  <Label>Precio</Label>
                  <Input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={formData.precio_base || ''} 
                    onChange={e => setFormData({ ...formData, precio_base: e.target.value })} 
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Tiempo Estimado (Minutos)</Label>
                  <Input 
                    required
                    type="number" 
                    min="1"
                    placeholder="Ej: 15"
                    value={formData.tiempo_prep_estimado || ''} 
                    onChange={e => setFormData({ ...formData, tiempo_prep_estimado: e.target.value })} 
                  />
                </InputGroup>
              </FormGrid>
              <InputGroup>
                <Label>Descripción Atractiva</Label>
                <TextArea 
                  required 
                  value={formData.descripcion_larga || ''} 
                  onChange={e => setFormData({ ...formData, descripcion_larga: e.target.value })} 
                  placeholder="Describe el plato de forma que genere antojo..." 
                  rows={3} 
                />
              </InputGroup>
              <InputGroup>
                <Label>Etiquetas Semánticas (Automáticas + Manuales)</Label>
                <Input 
                  type="text" 
                  value={formData.tags || ''} 
                  placeholder="Ej: postre, helado, chocolate"
                  onChange={e => setFormData({ ...formData, tags: e.target.value })} 
                />
              </InputGroup>
              <ImageUploadZone 
                label="Fotografía del Producto (Estrategia Visual)"
                initialImage={formData.image_url}
                endpoint="/api/upload/product"
                placeholderText="Subir Foto del Plato"
                helperText="Muestra tu mejor plato para generar antojo."
                onUploadSuccess={(url) => setFormData({ ...formData, image_url: url })}
              />
            </>
          )}

          <SubmitButton type="submit">Guardar Cambios</SubmitButton>
        </Form>
      </ModalContent>
    </ModalOverlay>,
    modalTarget
  );
};
