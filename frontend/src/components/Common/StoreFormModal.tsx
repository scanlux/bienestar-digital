'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
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
  SubmitButton,
  CheckboxGroup,
  GeoButton,
  GeoInfo,
  ScheduleGrid,
  AccountsContainer,
  MaintenanceBtn,
  RemoveMaintenanceBtn
} from '@/components/Common/ModalStyles';
import { ImageUploadZone } from '@/components/Common/ImageUploadZone';
import { ActionButton, TransitionShield } from '@/components/Common/UIElements';
import { PaymentAccountCard } from '@/components/Common/PaymentAccountCard';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { DAYS, DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { formatTime } from '@/utils';

// --- ICONOS SVG INLINE (PREVENCIÓN DE EMOJIS - REGLA DE ORO) ---
const PlusIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease' }}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ShopIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const UserIconSvg = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: 'var(--emerald)' }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PhoneIconSvg = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: 'rgba(255, 255, 255, 0.4)' }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

// --- COMPONENTES ESTILIZADOS PARA CLONACIÓN (LOOK PREMIUM) ---
const CloneOptionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 6px;
  margin-top: 1rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

const CloneOptionCard = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: ${(props: { $selected: boolean }) => props.$selected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1.5px solid ${(props: { $selected: boolean }) => props.$selected ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: ${(props: { $selected: boolean }) => props.$selected ? '0 0 16px rgba(16, 185, 129, 0.12)' : 'none'};

  &:hover {
    background: ${(props: { $selected: boolean }) => props.$selected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)'};
    border-color: ${(props: { $selected: boolean }) => props.$selected ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.2)'};
    transform: translateY(-1px);
    
    svg {
      transform: scale(1.05);
    }
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const StoreImageWrapper = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const EmptyCatalogIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  border: 1.5px dashed rgba(255, 255, 255, 0.15);
  transition: all 0.2s ease;
`;

const StoreMetaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex-grow: 1;
  text-align: left;
`;

const StoreNameText = styled.h4`
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
`;

const StoreAdminText = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  display: flex;
  align-items: center;
`;

const StorePhoneText = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
  display: flex;
  align-items: center;
`;

interface StoreFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (storeId: number) => void;
  initialData?: any;
  commerceId: number;
  paymentPlatforms: any[];
  modalTarget?: HTMLElement | null;
  onOpenMapPicker: () => void;
  lat?: string;
  lng?: string;
}

// --- SUB-COMPONENTE PARA FILA DE HORARIO (PREVENCIÓN CÓDIGO ESPAGUETI) ---
const ScheduleRow: React.FC<{
  day: any;
  idx: number;
  onUpdate: (idx: number, updates: any) => void;
  onAlert: (message: string) => void;
  formatTime: (time: string | null) => string;
  disabled?: boolean;
}> = ({ day, idx, onUpdate, onAlert, formatTime, disabled = false }) => {
  const is24h = day.is_24h === 1 || day.is_24h === true;
  const isInvalid = day.status === 'abierto' && 
    day.open_time && 
    day.close_time && 
    (is24h 
      ? (day.open_time !== day.close_time && day.open_time >= day.close_time && day.close_time !== '00:00')
      : (day.open_time >= day.close_time && day.close_time !== '00:00') || (day.open_time === day.close_time)
    );

  const hasMaintenance = is24h && day.open_time !== day.close_time;

  return (
    <div className="grid-row" style={{ opacity: day.status !== 'abierto' ? 0.4 : 1, transition: 'opacity 0.3s ease' }}>
      <span className="day-name">{DAYS[day.day_index]}</span>
      
      <select
        value={day.status}
        disabled={disabled}
        onChange={(e) => onUpdate(idx, { status: e.target.value })}
        className={`status-select ${day.status}`}
      >
        <option value="abierto">Abierto</option>
        <option value="cerrado">Cerrado</option>
      </select>

      <div className="time-inputs">
        {!is24h ? (
          <>
            <div />
            <Input
              type="time"
              disabled={disabled || day.status !== 'abierto'}
              className={isInvalid ? 'invalid-time' : ''}
              value={day.open_time || '08:00'}
              onChange={(e) => onUpdate(idx, { open_time: e.target.value })}
              onBlur={() => isInvalid && onAlert('Horario inválido. La hora inicial debe ser menor a la hora final.')}
            />
            <span className="sep">-</span>
            <Input
              type="time"
              disabled={disabled || day.status !== 'abierto'}
              className={isInvalid ? 'invalid-time' : ''}
              value={day.close_time || '20:00'}
              onChange={(e) => onUpdate(idx, { close_time: e.target.value })}
              onBlur={() => isInvalid && onAlert('Horario inválido. La hora inicial debe ser menor a la hora final.')}
            />
            <div />
          </>
        ) : (
          <>
            {hasMaintenance ? (
              <>
                <div />
                <Input
                  type="time"
                  disabled={disabled}
                  className={`maintenance-mode ${isInvalid ? 'invalid-time' : ''}`}
                  value={day.open_time || '00:00'}
                  onChange={(e) => onUpdate(idx, { open_time: e.target.value })}
                  onBlur={() => isInvalid && onAlert('Horario de mantenimiento inválido. El inicio debe ser menor al fin.')}
                  title="Inicio de mantenimiento"
                />
                <span className="sep" style={{ color: '#f97316' }}>M</span>
                <Input
                  type="time"
                  disabled={disabled}
                  className={`maintenance-mode ${isInvalid ? 'invalid-time' : ''}`}
                  value={day.close_time || '00:00'}
                  onChange={(e) => onUpdate(idx, { close_time: e.target.value })}
                  onBlur={() => isInvalid && onAlert('Horario de mantenimiento inválido. El inicio debe ser menor al fin.')}
                  title="Fin de mantenimiento"
                />
                {!disabled ? (
                  <RemoveMaintenanceBtn 
                    type="button" 
                    onClick={() => onUpdate(idx, { open_time: '00:00', close_time: '00:00' })}
                    title="Quitar horario de mantenimiento"
                  >
                    ✕
                  </RemoveMaintenanceBtn>
                ) : <div />}
              </>
            ) : (
              <>
                <div />
                {!disabled ? (
                  <MaintenanceBtn 
                    type="button" 
                    onClick={() => onUpdate(idx, { open_time: '02:00', close_time: '04:00' })}
                  >
                    + Agregar Mantenimiento
                  </MaintenanceBtn>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)' }}>Sin mantenimiento</span>
                )}
                <div />
              </>
            )}
          </>
        )}
      </div>

      <CheckboxGroup style={{ padding: 0, justifyContent: 'center' }}>
        <input
          type="checkbox"
          disabled={disabled || day.status !== 'abierto'}
          checked={is24h}
          onChange={(e) => {
            const checked = e.target.checked;
            onUpdate(idx, { 
              is_24h: checked ? 1 : 0,
              open_time: checked ? '00:00' : '08:00',
              close_time: checked ? '00:00' : '20:00'
            });
          }}
          title="Marcar si abre 24h"
        />
      </CheckboxGroup>
    </div>
  );
};

export const StoreFormModal: React.FC<StoreFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  commerceId,
  paymentPlatforms,
  modalTarget,
  onOpenMapPicker,
  lat,
  lng
}) => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];

  const [step, setStep] = useState(1);
  const [availableStores, setAvailableStores] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    nombre_sucursal: '',
    telefono: '',
    direccion: '',
    latitud: '',
    longitud: '',
    estado: 'no_disponible',
    contacto_directo: '',
    image_url: '',
    schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)),
    accounts: [],
    telefono_domicilio: '',
    admin_nombres: '',
    admin_apellidos: '',
    matricula: '',
    admin_email: '',
    admin_email_confirm: '',
    admin_password: '',
    cloneSourceStoreId: ''
  });

  const isEditMode = false;
  const canEditBasic = true;
  const canEditAdvanced = true;
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'exists' | 'invalid'>('idle');
  const [emailConfirmStatus, setEmailConfirmStatus] = useState<'idle' | 'matched' | 'mismatched' | 'empty'>('idle');
  const toast = useToast();
  const { showAlert } = useAlert();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showShield, setShowShield] = useState(false);
  const [shieldMessage, setShieldMessage] = useState('Optimizando imagen...');

  useEffect(() => {
    if (isOpen && commerceId) {
      const fetchAvailableStores = async () => {
        try {
          const headers = getAuthHeaders();
          const res = await axios.get(`${API_URL}/api/manage/stores/${commerceId}`, { headers });
          setAvailableStores(res.data || []);
        } catch (err) {
          console.error('Error fetching stores for catalog copy:', err);
        }
      };
      fetchAvailableStores();
    } else {
      setAvailableStores([]);
    }
  }, [isOpen, commerceId]);

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      setIsSubmitted(false);
      setStep(1);
      setSelectedImageFile(null);
      setShowShield(false);
      return;
    }

    if (isOpen && !hasInitialized) {
      setSelectedImageFile(null);
      setShowShield(false);

      setFormData({
        commerce_id: commerceId,
        nombre_sucursal: '',
        telefono: '',
        direccion: '',
        latitud: '',
        longitud: '',
        estado: 'no_disponible',
        contacto_directo: '',
        fecha_regreso: '',
        image_url: '',
        schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)),
        accounts: [],
        telefono_domicilio: '',
        admin_nombres: '',
        admin_apellidos: '',
        matricula: '',
        admin_email: '',
        admin_email_confirm: '',
        admin_password: '',
        cloneSourceStoreId: ''
      });
      setHasInitialized(true);
      setStep(1);
    }
  }, [isOpen, commerceId, hasInitialized]);

  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setFormData((prev: any) => ({ ...prev, latitud: lat, longitud: lng }));
    }
  }, [lat, lng]);

  useEffect(() => {
    if (isEditMode) return;

    const email = formData.admin_email || '';
    if (!email) {
      setEmailStatus('idle');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('invalid');
      return;
    }

    setEmailStatus('checking');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/mobile/check-user?email=${encodeURIComponent(email)}`);
        if (res.data && res.data.exists) {
          setEmailStatus('exists');
        } else {
          setEmailStatus('available');
        }
      } catch (err) {
        console.error('Error checking email availability:', err);
        setEmailStatus('idle');
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.admin_email, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;

    const email = formData.admin_email || '';
    const confirm = formData.admin_email_confirm || '';

    if (!confirm) {
      setEmailConfirmStatus('empty');
      return;
    }

    if (email === confirm) {
      setEmailConfirmStatus('matched');
    } else {
      setEmailConfirmStatus('mismatched');
    }
  }, [formData.admin_email, formData.admin_email_confirm, isEditMode]);

  const getSteps = () => {
    const list = [
      { id: 'basic', label: 'Detalles de Sede' }
    ];
    
    const clonableStores = availableStores.filter((s: any) => 
      Number(s.menu_count) > 0 && 
      Number(s.category_count) > 0 && 
      Number(s.product_count) > 0
    );
    
    if (!isEditMode && clonableStores.length > 0) {
      list.push({ id: 'clone', label: 'Copiar Catálogo' });
    }
    
    list.push(
      { id: 'media', label: 'Multimedia y Ubicación' },
      { id: 'hours', label: 'Horarios Operativos' },
      { id: 'admin', label: 'Cuentas y Administrador' }
    );
    
    return list;
  };

  const stepsList = getSteps();
  const currentStepId = !isEditMode ? stepsList[step - 1]?.id : null;
  const currentStepLabel = !isEditMode ? stepsList[step - 1]?.label : '';
  const totalSteps = stepsList.length;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (!isEditMode) {
      if (currentStepId === 'basic') {
        if (!e.currentTarget.checkValidity()) {
          showAlert({
            title: 'Campos incompletos',
            message: 'Faltan campos obligatorios. Revisa los recuadros en rojo.'
          });
          return;
        }
        setStep(step + 1);
        setIsSubmitted(false);
        return;
      }

      if (currentStepId === 'clone') {
        setStep(step + 1);
        setIsSubmitted(false);
        return;
      }

      if (currentStepId === 'media') {
        if (!formData.image_url && !selectedImageFile) {
          showAlert({
            title: 'Imagen requerida',
            message: 'Debe subir una fotografía de la sede (Estrategia Visual obligatoria).'
          });
          return;
        }
        setStep(step + 1);
        setIsSubmitted(false);
        return;
      }

      if (currentStepId === 'hours') {
        const invalidDays = formData.schedule.filter((day: any) => {
          if (day.status !== 'abierto' || !day.open_time || !day.close_time) return false;
          const is24h = day.is_24h === 1 || day.is_24h === true;
          
          if (is24h) {
            return day.open_time !== day.close_time && day.open_time >= day.close_time && day.close_time !== '00:00';
          } else {
            return (day.open_time >= day.close_time && day.close_time !== '00:00') || (day.open_time === day.close_time);
          }
        });

        if (invalidDays.length > 0) {
          showAlert({ 
            title: 'Horario no permitido',
            message: 'Ningún rango puede cruzar la medianoche en una sola fila. Para horarios nocturnos, termina el día a las 00:00 e inicia el siguiente a las 00:00.' 
          });
          return;
        }
        setStep(step + 1);
        setIsSubmitted(false);
        return;
      }

      if (currentStepId === 'admin') {
        if (!e.currentTarget.checkValidity()) {
          showAlert({
            title: 'Campos incompletos',
            message: 'Faltan campos obligatorios. Revisa los recuadros en rojo.'
          });
          return;
        }

        if (emailStatus === 'exists') {
          showAlert({
            title: 'Correo no disponible',
            message: 'El correo electrónico del administrador ya está registrado.'
          });
          return;
        }

        if (emailStatus === 'checking') {
          showAlert({
            title: 'Comprobando correo',
            message: 'Esperando comprobación de disponibilidad del correo...'
          });
          return;
        }

        if (emailStatus === 'invalid') {
          showAlert({
            title: 'Correo inválido',
            message: 'El formato del correo electrónico ingresado no es válido.'
          });
          return;
        }

        if (emailConfirmStatus === 'mismatched') {
          showAlert({
            title: 'Discrepancia de correos',
            message: 'Los correos electrónicos ingresados no coinciden.'
          });
          return;
        }
      }
    } else {
      if (!e.currentTarget.checkValidity()) {
        showAlert({
          title: 'Campos incompletos',
          message: 'Faltan campos obligatorios. Revisa los recuadros en rojo.'
        });
        return;
      }

      if (!formData.image_url && !selectedImageFile) {
        showAlert({
          title: 'Imagen requerida',
          message: 'Debe subir una fotografía de la sede (Estrategia Visual obligatoria).'
        });
        return;
      }

      const invalidDays = formData.schedule.filter((day: any) => {
        if (day.status !== 'abierto' || !day.open_time || !day.close_time) return false;
        const is24h = day.is_24h === 1 || day.is_24h === true;
        
        if (is24h) {
          return day.open_time !== day.close_time && day.open_time >= day.close_time && day.close_time !== '00:00';
        } else {
          return (day.open_time >= day.close_time && day.close_time !== '00:00') || (day.open_time === day.close_time);
        }
      });

      if (invalidDays.length > 0) {
        showAlert({ 
          title: 'Horario no permitido',
          message: 'Ningún rango puede cruzar la medianoche en una sola fila. Para horarios nocturnos, termina el día a las 00:00 e inicia el siguiente a las 00:00.' 
        });
        return;
      }
    }

    setLoading(true);
    const headers = getAuthHeaders();
    let finalImageUrl = formData.image_url;

    try {
      if (selectedImageFile) {
        setShowShield(true);
        setShieldMessage('Optimizando imagen...');

        const uploadData = new FormData();
        uploadData.append('image', selectedImageFile);

        const token = headers.Authorization ? headers.Authorization.split(' ')[1] : '';

        const uploadRes = await axios.post(`${API_URL}/api/upload/store`, uploadData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });

        if (uploadRes.data && uploadRes.data.success) {
          finalImageUrl = uploadRes.data.url;
        } else {
          throw new Error('No se pudo subir la imagen.');
        }
      }

      setShieldMessage('Guardando datos...');

      const payload = { 
        ...formData, 
        image_url: finalImageUrl,
        commerce_id: commerceId,
        contacto_directo: `${formData.admin_nombres || ''} ${formData.admin_apellidos || ''}`.trim()
      };
      const res = await axios.post(`${API_URL}/api/manage/stores`, payload, { headers });
      toast.success(formData.id ? 'Sede actualizada exitosamente' : 'Sede y administrador creados exitosamente');
      onSuccess(res.data.id);
      onClose();
    } catch (e: any) {
      console.error(e);
      showAlert({
        title: 'Error al guardar',
        message: 'Error al guardar la sede: ' + (e.response?.data?.error || e.message)
      });
    } finally {
      setLoading(false);
      setShowShield(false);
    }
  };

  const handleUpdateSchedule = (index: number, updates: any) => {
    const newSched = [...formData.schedule];
    newSched[index] = { ...newSched[index], ...updates };
    setFormData({ ...formData, schedule: newSched });
  };

  const handleUpdateAccount = (idx: number, field: string, value: any) => {
    const newAccs = [...formData.accounts];
    newAccs[idx][field] = value;
    setFormData({ ...formData, accounts: newAccs });
  };

  const handleRemoveAccount = (idx: number) => {
    const newAccs = [...formData.accounts];
    newAccs.splice(idx, 1);
    setFormData({ ...formData, accounts: newAccs });
  };

  const handleSetPrincipalAccount = (idx: number) => {
    const newAccs = [...formData.accounts];
    newAccs.forEach((a, i) => a.es_principal = i === idx);
    setFormData({ ...formData, accounts: newAccs });
  };

  if (!isOpen || !modalTarget) return null;

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="800px">
        <ModalHeader>
          <ModalTitle>
            {isEditMode 
              ? 'Editar Sede' 
              : `Añadir Nueva Sede - Paso ${step} de ${totalSteps} (${currentStepLabel})`
            }
          </ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <Form 
          onSubmit={handleSubmit} 
          noValidate 
          className={isSubmitted ? 'was-validated' : ''}
        >
          {/* STEP 1 (Or Edit Mode) */}
          {(currentStepId === 'basic' || isEditMode) && (
            <FormGrid>
              <InputGroup>
                <Label>Nombre de la Sede</Label>
                <Input
                  required
                  type="text"
                  disabled={!canEditAdvanced}
                  value={formData.nombre_sucursal || ''}
                  onChange={e => setFormData({ ...formData, nombre_sucursal: e.target.value })}
                  placeholder="Ej: Sede Centro, Sucursal Norte..."
                />
              </InputGroup>
              <InputGroup>
                <Label>Matrícula Mercantil</Label>
                <Input
                  required
                  type="text"
                  disabled={!canEditAdvanced}
                  value={formData.matricula || ''}
                  onChange={e => setFormData({ ...formData, matricula: e.target.value })}
                  placeholder="Ej: 123456-12"
                />
              </InputGroup>

              <InputGroup>
                <Label>Estado</Label>
                <Select
                  value={formData.estado || 'no_disponible'}
                  disabled={!canEditBasic}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, estado: val });
                  }}
                >
                  <option value="operativo">Operativo (Abierto)</option>
                  <option value="mantenimiento">En Mantenimiento / Pausa</option>
                  <option value="vacaciones">Cerrado por Vacaciones</option>
                  <option value="no_disponible">No Disponible / Cerrado</option>
                </Select>
              </InputGroup>
            </FormGrid>
          )}

          {(currentStepId === 'basic' || isEditMode) && formData.estado && formData.estado !== 'operativo' && (
            <FormGrid style={{ marginBottom: '16px' }}>
              <InputGroup>
                <Label>Fecha estimada de regreso (Opcional)</Label>
                <Input
                  type="date"
                  disabled={!canEditBasic}
                  value={formData.fecha_regreso ? formData.fecha_regreso.split('T')[0] : ''}
                  onChange={e => setFormData({ ...formData, fecha_regreso: e.target.value })}
                />
              </InputGroup>
              <div />
            </FormGrid>
          )}

          {(currentStepId === 'basic' || isEditMode) && (
            <FormGrid>
              <InputGroup>
                <Label>Teléfono Domicilio</Label>
                <Input
                  required
                  type="text"
                  disabled={!canEditBasic}
                  value={formData.telefono_domicilio || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9+ ]/g, '');
                    setFormData({ ...formData, telefono_domicilio: val });
                  }}
                  placeholder="+57 300..."
                />
              </InputGroup>
              <InputGroup>
                <Label>Dirección física</Label>
                <Input
                  required
                  type="text"
                  disabled={!canEditAdvanced}
                  value={formData.direccion || ''}
                  onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Calle 10 # 5-20"
                />
              </InputGroup>
            </FormGrid>
          )}

          {/* STEP CLONE CATALOG (Only Creation Mode and when availableStores.length > 0) */}
          {(currentStepId === 'clone') && (
            <div style={{ animation: 'fadeIn 0.4s ease-out', marginTop: '0px' }}>
              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              <div style={{ marginBottom: '1.5rem' }}>
                <Label style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                  ¿Deseas copiar el catálogo de productos?
                </Label>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>
                  Elige si deseas iniciar esta sede con el catálogo vacío o copiar la estructura de platos, categorías e ingredientes de una de tus sedes existentes.
                </div>
              </div>

              <CloneOptionsGrid>
                {/* Opción 1: Iniciar vacío */}
                <CloneOptionCard 
                  $selected={formData.cloneSourceStoreId === ''} 
                  onClick={() => setFormData({ ...formData, cloneSourceStoreId: '' })}
                >
                  <EmptyCatalogIcon>
                    <PlusIconSvg />
                  </EmptyCatalogIcon>
                  <StoreMetaInfo>
                    <StoreNameText>Iniciar vacío (Sin catálogo)</StoreNameText>
                    <StoreAdminText>Crearás el catálogo de platos, categorías y precios desde cero.</StoreAdminText>
                  </StoreMetaInfo>
                </CloneOptionCard>

                {/* Opción 2+: Sedes existentes */}
                {availableStores.filter((s: any) => 
                  Number(s.menu_count) > 0 && 
                  Number(s.category_count) > 0 && 
                  Number(s.product_count) > 0
                ).map((s: any) => {
                  const hasPhoto = !!s.image_url;
                  const adminName = `${s.admin_nombres || ''} ${s.admin_apellidos || ''}`.trim() || s.contacto_directo || 'Sin administrador';
                  return (
                    <CloneOptionCard 
                      key={s.id}
                      $selected={formData.cloneSourceStoreId === String(s.id) || formData.cloneSourceStoreId === s.id} 
                      onClick={() => setFormData({ ...formData, cloneSourceStoreId: String(s.id) })}
                    >
                      <StoreImageWrapper>
                        {hasPhoto ? (
                          <img src={s.image_url} alt={s.nombre_sucursal} />
                        ) : (
                          <ShopIconSvg />
                        )}
                      </StoreImageWrapper>
                      <StoreMetaInfo>
                        <StoreNameText>{s.nombre_sucursal}</StoreNameText>
                        <StoreAdminText>
                          <UserIconSvg /> Admin: {adminName}
                        </StoreAdminText>
                        <StorePhoneText>
                          <PhoneIconSvg /> Teléfono: {s.telefono || 'Sin teléfono'}
                        </StorePhoneText>
                      </StoreMetaInfo>
                    </CloneOptionCard>
                  );
                })}
              </CloneOptionsGrid>
            </div>
          )}

          {/* STEP 2 (Or Edit Mode) */}
          {(currentStepId === 'media' || isEditMode) && (
            <div style={{ animation: 'fadeIn 0.4s ease-out', marginTop: isEditMode ? '15px' : '0px' }}>
              {!isEditMode && (
                <style>{`
                  @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
              )}
              <InputGroup style={{ marginTop: isEditMode ? '15px' : '0px' }}>
                <Label>Geolocalización</Label>
                <GeoButton 
                  type="button" 
                  disabled={!canEditAdvanced} 
                  onClick={canEditAdvanced ? onOpenMapPicker : undefined}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
                  </svg>
                  Registrar ubicación en mapa
                </GeoButton>
                {formData.latitud && formData.longitud && (
                  <GeoInfo>
                    <div className="geo-tag">Lat: <strong>{Number(formData.latitud).toFixed(6)}</strong></div>
                    <div className="geo-tag">Lng: <strong>{Number(formData.longitud).toFixed(6)}</strong></div>
                  </GeoInfo>
                )}
              </InputGroup>

              <div style={{ marginTop: '30px' }}>
                <ImageUploadZone
                  label="Fotografía de la Sede"
                  disabled={!canEditBasic}
                  initialImage={formData.image_url}
                  endpoint="/api/upload/store"
                  placeholderText="Subir Foto Horizontal"
                  helperText="Mínimo 1080px de ancho, vista landscape."
                  onFileSelected={(file) => setSelectedImageFile(file)}
                />
              </div>
            </div>
          )}

          {/* STEP 3 (Or Edit Mode) */}
          {(currentStepId === 'hours' || isEditMode) && (
            <div style={{ animation: 'fadeIn 0.4s ease-out', marginTop: isEditMode ? '15px' : '0px' }}>
              <InputGroup style={{ marginTop: isEditMode ? '15px' : '0px' }}>
                <Label>Horarios Semanales</Label>
                <ScheduleGrid>
                  <div className="grid-header">
                    <span>Día</span>
                    <span>Estado</span>
                    <span>Horario / Mantenimiento</span>
                    <span>¿24H?</span>
                  </div>
                  {formData.schedule.map((day: any, idx: number) => (
                    <ScheduleRow
                      key={day.day_index}
                      day={day}
                      idx={idx}
                      disabled={!canEditBasic}
                      onUpdate={handleUpdateSchedule}
                      onAlert={(msg) => showAlert({ message: msg })}
                      formatTime={formatTime}
                    />
                  ))}
                </ScheduleGrid>
              </InputGroup>
            </div>
          )}

          {/* STEP 4 (Or Edit Mode) */}
          {(currentStepId === 'admin' || isEditMode) && (
            <div style={{ animation: 'fadeIn 0.4s ease-out', marginTop: isEditMode ? '15px' : '0px' }}>
              <InputGroup style={{ marginTop: isEditMode ? '15px' : '0px' }}>
                <Label>Billeteras y Cuentas Bancarias</Label>
                <AccountsContainer>
                  {formData.accounts && formData.accounts.map((acc: any, idx: number) => (
                    <PaymentAccountCard
                      key={idx}
                      account={acc}
                      index={idx}
                      disabled={!canEditAdvanced}
                      paymentPlatforms={paymentPlatforms}
                      onUpdate={handleUpdateAccount}
                      onRemove={handleRemoveAccount}
                      onSetPrincipal={handleSetPrincipalAccount}
                    />
                  ))}
                  {canEditAdvanced && (
                    <ActionButton
                      $variant="luminous"
                      type="button"
                      onClick={() => {
                        const newAccs = [...(formData.accounts || [])];
                        newAccs.push({ platform_id: '', numero_cuenta: '', titular_nombre: '', es_principal: newAccs.length === 0 });
                        setFormData({ ...formData, accounts: newAccs });
                      }}
                      style={{ width: '100%', marginTop: '15px' }}
                    >
                      + Añadir Cuenta Bancaria
                    </ActionButton>
                  )}
                </AccountsContainer>
              </InputGroup>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2rem', marginBottom: '1.5rem', color: '#fff' }}>
                Administrador de Sede
              </h3>

              <FormGrid>
                {!isEditMode && (
                  <>
                    <style>{`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                      .invalid-field {
                        border-color: #ef4444 !important;
                        background: rgba(239, 68, 68, 0.05) !important;
                        box-shadow: 0 0 10px rgba(239, 68, 68, 0.3) !important;
                      }
                    `}</style>
                    <InputGroup style={{ position: 'relative' }}>
                      <Label>Correo Electrónico (Único)</Label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Input
                          required
                          type="email"
                          value={formData.admin_email || ''}
                          onChange={e => setFormData({ ...formData, admin_email: e.target.value })}
                          placeholder="admin.sucursal@dominio.com"
                          className={emailStatus === 'exists' || emailStatus === 'invalid' ? 'invalid-field' : ''}
                          style={{ paddingRight: '40px' }}
                        />
                        <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
                          {emailStatus === 'checking' && (
                            <div style={{
                              width: '18px',
                              height: '18px',
                              border: '2px solid rgba(16, 185, 129, 0.1)',
                              borderTopColor: '#10b981',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite'
                            }} />
                          )}
                          {emailStatus === 'available' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          {(emailStatus === 'exists' || emailStatus === 'invalid') && formData.admin_email && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                        </div>
                      </div>
                      {emailStatus === 'exists' && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>El correo ya está registrado en el sistema.</span>
                      )}
                      {emailStatus === 'invalid' && formData.admin_email && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Formato de correo no válido.</span>
                      )}
                    </InputGroup>

                    <InputGroup style={{ position: 'relative' }}>
                      <Label>Confirmación del Correo</Label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Input
                          required
                          type="email"
                          value={formData.admin_email_confirm || ''}
                          onChange={e => setFormData({ ...formData, admin_email_confirm: e.target.value })}
                          placeholder="admin.sucursal@dominio.com"
                          className={emailConfirmStatus === 'mismatched' ? 'invalid-field' : ''}
                          style={{ paddingRight: '40px' }}
                        />
                        <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
                          {emailConfirmStatus === 'matched' && formData.admin_email_confirm && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          {emailConfirmStatus === 'mismatched' && formData.admin_email_confirm && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                        </div>
                      </div>
                      {emailConfirmStatus === 'mismatched' && formData.admin_email_confirm && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Los correos no coinciden.</span>
                      )}
                    </InputGroup>

                    <InputGroup>
                      <Label>Contraseña Provisoria</Label>
                      <Input
                        required
                        type="password"
                        value={formData.admin_password || ''}
                        onChange={e => setFormData({ ...formData, admin_password: e.target.value })}
                        placeholder="••••••••"
                        onPaste={e => e.preventDefault()}
                        onCopy={e => e.preventDefault()}
                        onCut={e => e.preventDefault()}
                        onDrop={e => e.preventDefault()}
                        title="Para mayor seguridad, no se permite copiar ni pegar en este campo."
                      />
                    </InputGroup>
                  </>
                )}

                <InputGroup>
                  <Label>Nombres del Administrador</Label>
                  <Input
                    required
                    type="text"
                    disabled={!canEditAdvanced}
                    value={formData.admin_nombres || ''}
                    onChange={e => setFormData({ ...formData, admin_nombres: e.target.value })}
                    placeholder="Ej: Juan"
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Apellidos del Administrador</Label>
                  <Input
                    required
                    type="text"
                    disabled={!canEditAdvanced}
                    value={formData.admin_apellidos || ''}
                    onChange={e => setFormData({ ...formData, admin_apellidos: e.target.value })}
                    placeholder="Ej: Pérez"
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Teléfono del Administrador</Label>
                  <Input
                    required
                    type="text"
                    disabled={!canEditBasic}
                    value={formData.telefono || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9+ ]/g, '');
                      setFormData({ ...formData, telefono: val });
                    }}
                    placeholder="+57 300..."
                  />
                </InputGroup>
              </FormGrid>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '30px' }}>
            {step > 1 && !isEditMode && (
              <ActionButton 
                $variant="outline" 
                type="button" 
                onClick={() => setStep(step - 1)}
                style={{ padding: '0.8rem 2rem' }}
              >
                Volver
              </ActionButton>
            )}
            
            <SubmitButton type="submit" disabled={loading || (isEditMode && !canEditBasic && !canEditAdvanced)} style={{ margin: 0, padding: '0.8rem 2rem' }}>
              {loading 
                ? 'Guardando...' 
                : isEditMode 
                  ? 'Guardar Cambios' 
                  : step < totalSteps 
                    ? `Siguiente: ${stepsList[step]?.label || ''}`
                    : 'Crear Sede'
              }
            </SubmitButton>
          </div>
        </Form>



        {showShield && modalTarget && createPortal(
          <TransitionShield message={shieldMessage} />,
          modalTarget
        )}
      </ModalContent>
    </ModalOverlay>,
    modalTarget
  );
};
