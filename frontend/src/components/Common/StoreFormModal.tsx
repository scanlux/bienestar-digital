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
import { ActionButton } from '@/components/Common/UIElements';
import { PaymentAccountCard } from '@/components/Common/PaymentAccountCard';
import { AlertModal } from '@/components/Common/AlertModal';
import { FloatingErrorToast } from '@/components/Common/Toasts';
import { useToast } from '@/context/ToastContext';
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
  // Estos campos vienen del parent para mantener sincronía si ya están abiertos otros modales (como el mapa)
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
}> = ({ day, idx, onUpdate, onAlert, formatTime }) => {
  const is24h = day.is_24h === 1 || day.is_24h === true;
  const isInvalid = day.status === 'abierto' && 
    day.open_time && 
    day.close_time && 
    (is24h 
      ? (day.open_time !== day.close_time && day.open_time >= day.close_time && day.close_time !== '00:00')
      : (day.open_time >= day.close_time && day.close_time !== '00:00') || (day.open_time === day.close_time)
    );

  // Lógica: Si es 24h y las horas son iguales (ej. 00:00), se considera "Sin Mantenimiento"
  const hasMaintenance = is24h && day.open_time !== day.close_time;

  return (
    <div className="grid-row" style={{ opacity: day.status !== 'abierto' ? 0.4 : 1, transition: 'opacity 0.3s ease' }}>
      <span className="day-name">{DAYS[day.day_index]}</span>
      
      <select
        value={day.status}
        onChange={(e) => onUpdate(idx, { status: e.target.value })}
        className={`status-select ${day.status}`}
      >
        <option value="abierto">Abierto</option>
        <option value="cerrado">Cerrado</option>
      </select>

      <div className="time-inputs">
        {!is24h ? (
          // Vista Normal: Apertura y Cierre
          <>
            <div /> {/* Spacer izquierdo para centrado perfecto */}
            <Input
              type="time"
              disabled={day.status !== 'abierto'}
              className={isInvalid ? 'invalid-time' : ''}
              value={day.open_time || '08:00'}
              onChange={(e) => onUpdate(idx, { open_time: e.target.value })}
              onBlur={() => isInvalid && onAlert('Horario inválido. La hora inicial debe ser menor a la hora final.')}
            />
            <span className="sep">-</span>
            <Input
              type="time"
              disabled={day.status !== 'abierto'}
              className={isInvalid ? 'invalid-time' : ''}
              value={day.close_time || '20:00'}
              onChange={(e) => onUpdate(idx, { close_time: e.target.value })}
              onBlur={() => isInvalid && onAlert('Horario inválido. La hora inicial debe ser menor a la hora final.')}
            />
            <div /> {/* Spacer derecho (donde iría la X) */}
          </>
        ) : (
          // Vista 24h: Mantenimiento opcional
          <>
            {hasMaintenance ? (
              <>
                <div /> {/* Spacer izquierdo para centrado perfecto */}
                <Input
                  type="time"
                  className={`maintenance-mode ${isInvalid ? 'invalid-time' : ''}`}
                  value={day.open_time || '00:00'}
                  onChange={(e) => onUpdate(idx, { open_time: e.target.value })}
                  onBlur={() => isInvalid && onAlert('Horario de mantenimiento inválido. El inicio debe ser menor al fin.')}
                  title="Inicio de mantenimiento"
                />
                <span className="sep" style={{ color: '#f97316' }}>M</span>
                <Input
                  type="time"
                  className={`maintenance-mode ${isInvalid ? 'invalid-time' : ''}`}
                  value={day.close_time || '00:00'}
                  onChange={(e) => onUpdate(idx, { close_time: e.target.value })}
                  onBlur={() => isInvalid && onAlert('Horario de mantenimiento inválido. El inicio debe ser menor al fin.')}
                  title="Fin de mantenimiento"
                />
                <RemoveMaintenanceBtn 
                  type="button" 
                  onClick={() => onUpdate(idx, { open_time: '00:00', close_time: '00:00' })}
                  title="Quitar horario de mantenimiento"
                >
                  ✕
                </RemoveMaintenanceBtn>
              </>
            ) : (
              <>
                <div /> {/* Spacer izquierdo para centrado perfecto del botón */}
                <MaintenanceBtn 
                  type="button" 
                  onClick={() => onUpdate(idx, { open_time: '02:00', close_time: '04:00' })}
                >
                  + Agregar Mantenimiento
                </MaintenanceBtn>
                <div /> {/* Spacer derecho invisible */}
              </>
            )}
          </>
        )}
      </div>

      <CheckboxGroup style={{ padding: 0, justifyContent: 'center' }}>
        <input
          type="checkbox"
          disabled={day.status !== 'abierto'}
          checked={is24h}
          onChange={(e) => {
            const checked = e.target.checked;
            // Al activar 24h, por defecto no hay mantenimiento (00:00 - 00:00)
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
    telefono_domicilio: ''
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, message: '' });
  const toast = useToast();
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');


  useEffect(() => {
    if (isOpen && initialData) {
      const schedule = (initialData.schedule && initialData.schedule.length > 0)
        ? initialData.schedule
        : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));

      // Ordenar cuentas para que la principal aparezca primero
      let accounts = initialData.accounts ? [...initialData.accounts] : [];
      accounts.sort((a: any, b: any) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0));

      setFormData({
        ...initialData,
        schedule,
        accounts
      });
    } else if (isOpen) {
      // Reset for new store
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
        telefono_domicilio: ''
      });
    }
  }, [isOpen, initialData, commerceId]);

  // Sincronizar coordenadas si cambian desde afuera (ej. MapPicker)
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setFormData((prev: any) => ({ ...prev, latitud: lat, longitud: lng }));
    }
  }, [lat, lng]);

  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsSubmitted(false);
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

    if (!formData.image_url) {
      toast.error('Debe subir una fotografía de la sede (Estrategia Visual obligatoria).');
      return;
    }

    // VALIDACION DE HORARIOS
    const invalidDays = formData.schedule.filter((day: any) => {
      if (day.status !== 'abierto' || !day.open_time || !day.close_time) return false;
      const is24h = day.is_24h === 1 || day.is_24h === true;
      
      if (is24h) {
        // En 24h, permitimos 00:00-00:00 (sin mantenimiento). 
        // Si hay mantenimiento, validamos que no cruce medianoche.
        return day.open_time !== day.close_time && day.open_time >= day.close_time && day.close_time !== '00:00';
      } else {
        // En horario normal, no permitimos que sean iguales ni que cruce medianoche (salvo cierre 00:00)
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

    setLoading(true);


    const headers = getAuthHeaders();

    try {
      const payload = { ...formData, commerce_id: commerceId };
      const res = await axios.post(`${API_URL}/api/manage/stores`, payload, { headers });
      toast.success(formData.id ? 'Sede actualizada exitosamente' : 'Sede creada exitosamente');
      onSuccess(res.data.id);
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error('Error guardando sede: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
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
            {formData.id ? 'Editar Sede' : 'Añadir Nueva Sede'}
          </ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <Form 
          onSubmit={handleSubmit} 
          noValidate 
          className={isSubmitted ? 'was-validated' : ''}
        >
          <FormGrid>
            <InputGroup>
              <Label>Nombre de la Sede</Label>
              <Input
                required
                type="text"
                value={formData.nombre_sucursal || ''}
                onChange={e => setFormData({ ...formData, nombre_sucursal: e.target.value })}
                placeholder="Ej: Sede Centro, Sucursal Norte..."
              />
            </InputGroup>
            <InputGroup>
              <Label>Nombre del Administrador</Label>
              <Input
                required
                type="text"
                value={formData.contacto_directo || ''}
                onChange={e => setFormData({ ...formData, contacto_directo: e.target.value })}
                placeholder="Ej: Juan Pérez..."
              />
            </InputGroup>
            <InputGroup>
              <Label>Estado</Label>
              <Select
                value={formData.estado || 'no_disponible'}
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
          </FormGrid>

          {formData.estado && formData.estado !== 'operativo' && (
            <>
              <FormGrid style={{ marginBottom: '16px' }}>
                <InputGroup>
                  <Label>Fecha estimada de regreso (Opcional)</Label>
                  <Input
                    type="date"
                    value={formData.fecha_regreso ? formData.fecha_regreso.split('T')[0] : ''}
                    onChange={e => setFormData({ ...formData, fecha_regreso: e.target.value })}
                  />
                </InputGroup>
                <div />
              </FormGrid>
            </>
          )}

          <FormGrid>
            <InputGroup>
              <Label>Teléfono Domicilio</Label>
              <Input
                required
                type="text"
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
                value={formData.direccion || ''}
                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Calle 10 # 5-20"
              />
            </InputGroup>
          </FormGrid>

          <InputGroup>
            <Label>Geolocalización</Label>
            <GeoButton type="button" onClick={onOpenMapPicker}>
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
            initialImage={formData.image_url}
            endpoint="/api/upload/store"
            placeholderText="Subir Foto Horizontal"
            helperText="Mínimo 1080px de ancho, vista landscape."
            onUploadSuccess={(url) => setFormData({ ...formData, image_url: url })}
          />

          <InputGroup>
            <Label>Horarios Semanales</Label>
            <ScheduleGrid>
              {formData.schedule.map((day: any, idx: number) => (
                <ScheduleRow
                  key={day.day_index}
                  day={day}
                  idx={idx}
                  onUpdate={handleUpdateSchedule}
                  onAlert={(msg) => setAlert({ isOpen: true, message: msg })}
                  formatTime={formatTime}
                />
              ))}
            </ScheduleGrid>
          </InputGroup>

          <InputGroup>
            <Label>Billeteras y Cuentas</Label>
            <AccountsContainer>
              {formData.accounts && formData.accounts.map((acc: any, idx: number) => (
                <PaymentAccountCard
                  key={idx}
                  account={acc}
                  index={idx}
                  paymentPlatforms={paymentPlatforms}
                  onUpdate={handleUpdateAccount}
                  onRemove={handleRemoveAccount}
                  onSetPrincipal={handleSetPrincipalAccount}
                />
              ))}
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
                + Añadir Cuenta
              </ActionButton>
            </AccountsContainer>
          </InputGroup>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? 'Guardando...' : (formData.id ? 'Guardar Cambios' : 'Crear Sede')}
          </SubmitButton>
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
      </ModalContent>
    </ModalOverlay>,
    modalTarget
  );
};
