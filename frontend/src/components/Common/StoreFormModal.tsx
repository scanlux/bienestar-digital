'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { AlertModal } from '@/components/Common/AlertModal';
import { FloatingErrorToast } from '@/components/Common/Toasts';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { DAYS, DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { formatTime } from '@/utils';

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
    admin_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, message: '' });
  const toast = useToast();
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showShield, setShowShield] = useState(false);
  const [shieldMessage, setShieldMessage] = useState('Optimizando imagen...');

  useEffect(() => {
    if (isOpen) {
      setSelectedImageFile(null);
      setShowShield(false);
    }
    if (isOpen && initialData) {
      const schedule = (initialData.schedule && initialData.schedule.length > 0)
        ? initialData.schedule
        : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));

      let accounts = initialData.accounts ? [...initialData.accounts] : [];
      accounts.sort((a: any, b: any) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0));

      setFormData({
        ...initialData,
        schedule,
        accounts,
        admin_email: '',
        admin_password: ''
      });
      setStep(1);
    } else if (isOpen) {
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
        admin_password: ''
      });
      setStep(1);
    }
  }, [isOpen, initialData, commerceId]);

  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setFormData((prev: any) => ({ ...prev, latitud: lat, longitud: lng }));
    }
  }, [lat, lng]);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitted(false);
      setStep(1);
      setSelectedImageFile(null);
      setShowShield(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (!e.currentTarget.checkValidity()) {
      setErrorMessage('Faltan campos obligatorios. Revisa los recuadros en rojo.');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 4000);
      return;
    }

    if (!formData.image_url && !selectedImageFile) {
      toast.error('Debe subir una fotografía de la sede (Estrategia Visual obligatoria).');
      return;
    }

    // VALIDACION DE HORARIOS
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
      setAlert({ 
        isOpen: true, 
        message: 'Horario no permitido. Ningún rango puede cruzar la medianoche en una sola fila. Para horarios nocturnos, termina el día a las 00:00 e inicia el siguiente a las 00:00.' 
      });
      return;
    }

    // Si es creación y estamos en Paso 1, avanzamos a Paso 2
    if (!formData.id && step === 1) {
      setStep(2);
      setIsSubmitted(false);
      return;
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
      toast.error('Error guardando sede: ' + (e.response?.data?.error || e.message));
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

  const isEditMode = !!formData.id;
  const canEditBasic = !isEditMode || permissions.includes('edit_store_basic');
  const canEditAdvanced = !isEditMode || permissions.includes('edit_store_advanced');

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="800px">
        <ModalHeader>
          <ModalTitle>
            {isEditMode 
              ? 'Editar Sede' 
              : `Añadir Nueva Sede - Paso ${step} de 2 (${step === 1 ? 'Detalles de Sede' : 'Administrador de Sede'})`
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
          {(step === 1 || isEditMode) && (
            <>
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

                {isEditMode && (
                  <>
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
                  </>
                )}

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

                {isEditMode && (
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
                )}
              </FormGrid>

              {formData.estado && formData.estado !== 'operativo' && (
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

              <InputGroup style={{ marginTop: '10px' }}>
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

              <ImageUploadZone
                label="Fotografía de la Sede"
                disabled={!canEditBasic}
                initialImage={formData.image_url}
                endpoint="/api/upload/store"
                placeholderText="Subir Foto Horizontal"
                helperText="Mínimo 1080px de ancho, vista landscape."
                onFileSelected={(file) => setSelectedImageFile(file)}
              />

              <InputGroup style={{ marginTop: '15px' }}>
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
                      onAlert={(msg) => setAlert({ isOpen: true, message: msg })}
                      formatTime={formatTime}
                    />
                  ))}
                </ScheduleGrid>
              </InputGroup>

              <InputGroup style={{ marginTop: '15px' }}>
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
            </>
          )}

          {/* STEP 2 (Only Creation Mode) */}
          {(step === 2 && !isEditMode) && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>
                Credenciales de Acceso e Información de Contacto
              </h3>

              <FormGrid>
                <InputGroup>
                  <Label>Nombres del Administrador</Label>
                  <Input
                    required
                    type="text"
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
                    value={formData.telefono || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9+ ]/g, '');
                      setFormData({ ...formData, telefono: val });
                    }}
                    placeholder="+57 300..."
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Correo Electrónico (Único)</Label>
                  <Input
                    required
                    type="email"
                    value={formData.admin_email || ''}
                    onChange={e => setFormData({ ...formData, admin_email: e.target.value })}
                    placeholder="admin.sucursal@dominio.com"
                  />
                </InputGroup>
                <InputGroup>
                  <Label>Contraseña Provisoria</Label>
                  <Input
                    required
                    type="password"
                    value={formData.admin_password || ''}
                    onChange={e => setFormData({ ...formData, admin_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </InputGroup>
              </FormGrid>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '30px' }}>
            {step === 2 && !isEditMode && (
              <ActionButton 
                $variant="outline" 
                type="button" 
                onClick={() => setStep(1)}
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
                  : step === 1 
                    ? 'Siguiente: Crear Administrador' 
                    : 'Crear Sede'
              }
            </SubmitButton>
          </div>
        </Form>

        <AlertModal
          isOpen={alert.isOpen}
          onClose={() => setAlert({ ...alert, isOpen: false })}
          message={alert.message}
        />

        {showErrorToast && modalTarget && createPortal(
          <FloatingErrorToast 
            message={errorMessage} 
            onClose={() => setShowErrorToast(false)} 
          />,
          modalTarget
        )}

        {showShield && modalTarget && createPortal(
          <TransitionShield message={shieldMessage} />,
          modalTarget
        )}
      </ModalContent>
    </ModalOverlay>,
    modalTarget
  );
};
