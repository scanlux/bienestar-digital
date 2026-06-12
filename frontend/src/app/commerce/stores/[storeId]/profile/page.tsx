'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useModalScroll } from '@/hooks/useModalScroll';
import { getAuthHeaders } from '@/utils/auth';
import { DAYS, DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { formatTime } from '@/utils';

// Componentes Comunes
import { ImageUploadZone } from '@/components/Common/ImageUploadZone';
import { PaymentAccountCard } from '@/components/Common/PaymentAccountCard';
import MapPickerModal from '@/components/MapPickerModal';
import GeoPermissionModal from '@/components/Common/GeoPermissionModal';
import { ActionButton, TransitionShield, LoadingState, Spinner } from '@/components/Common/UIElements';

// Estilos Compartidos de Modal
import {
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

// --- ESTILOS DE LA PÁGINA (COMPACTOS Y ADAPTADOS AL MENÚ LATERAL) ---
const ProfileContainer = styled.div`
  max-width: 960px; /* Reducido de 1200px para encajar perfectamente con el menú lateral */
  margin: 0 auto;
  padding: 1.5rem;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const ProfileHeader = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  margin: 0.25rem 0 0 0;
`;

// --- COMPONENTES DE PESTAÑAS (TABS) ---
const TabContainer = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 2px;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  padding: 0.75rem 1.25rem;
  color: ${props => props.$active ? '#fff' : 'rgba(255, 255, 255, 0.4)'};
  font-weight: ${props => props.$active ? '600' : '400'};
  font-size: 0.9rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: #fff;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--emerald);
    transform: scaleX(${props => props.$active ? 1 : 0});
    transition: transform 0.2s ease;
  }
`;

const TabContent = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
`;

// --- DISPOSICIONES COMPACTAS PARA CADA PESTAÑA ---
const TopRowGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const InfoText = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 0.7rem 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 42px;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);

  h2 {
    color: #ef4444;
    margin-bottom: 1rem;
  }
`;

// --- SUB-COMPONENTE PARA HORARIOS (ADAPTADO) ---
const ScheduleRow: React.FC<{
  day: any;
  idx: number;
  onUpdate: (idx: number, updates: any) => void;
  onAlert: (message: string) => void;
  disabled?: boolean;
}> = ({ day, idx, onUpdate, onAlert, disabled = false }) => {
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

// --- COMPONENTE PRINCIPAL ---
export default function StoreProfilePage({ params }: { params: { storeId: string } }) {
  const { user, token } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [paymentPlatforms, setPaymentPlatforms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'hours' | 'accounts'>('basic');

  // Form states
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
    admin_email: ''
  });

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const [showShield, setShowShield] = useState(false);
  const [shieldMessage, setShieldMessage] = useState('Optimizando imagen...');

  // Permisos RBAC
  const permissions = user?.permissions || [];
  const isSystem = user?.actorType === 'system_user';
  const canEditBasic = isSystem || permissions.includes('edit_store_basic');
  const canEditAdvanced = isSystem || permissions.includes('edit_store_advanced');

  // Hook de Geolocalización
  const geo = useGeolocation({
    onCoordsConfirmed: (lat, lng) => {
      setFormData((prev: any) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString()
      }));
      toast.success('Coordenadas de mapa configuradas');
    },
    onCoordsFromPermission: (lat, lng) => {
      setFormData((prev: any) => ({
        ...prev,
        latitud: lat.toString(),
        longitud: lng.toString()
      }));
    }
  });

  useModalScroll(geo.showMapPicker);
  useModalScroll(geo.showGeoWarning);

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.adminType !== 'commerce' && !isSystem) {
      router.push('/commerce/dashboard');
      return;
    }
    fetchData();
  }, [user, token, params.storeId]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorState(null);

    try {
      const headers = getAuthHeaders();
      const [storeRes, platformsRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/store/${params.storeId}`, { headers }),
        axios.get(`${API_URL}/api/manage/payment-platforms`, { headers }).catch(() => ({ data: [] }))
      ]);

      const storeData = storeRes.data;

      // Dividir contacto_directo en nombres y apellidos
      let names = storeData.contacto_directo || '';
      let admin_nombres = '';
      let admin_apellidos = '';
      if (names) {
        const parts = names.split(' ');
        admin_nombres = parts[0] || '';
        admin_apellidos = parts.slice(1).join(' ') || '';
      }

      let accounts = storeData.accounts ? [...storeData.accounts] : [];
      if (accounts.length === 0) {
        accounts.push({
          platform_id: '',
          numero_cuenta: '',
          titular_nombre: '',
          es_principal: true
        });
      }

      setFormData({
        ...storeData,
        admin_nombres,
        admin_apellidos,
        schedule: (storeData.schedule && storeData.schedule.length > 0)
          ? storeData.schedule
          : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)),
        accounts
      });

      setPaymentPlatforms(platformsRes.data);
    } catch (err: any) {
      console.error('Error fetching store details for profile:', err);
      if (err.response?.status === 403) {
        setErrorState('Acceso Prohibido: No tienes permisos o la sede pertenece a otro comercio (BOLA).');
      } else if (err.response?.status === 404) {
        setErrorState('Sede no encontrada.');
      } else {
        setErrorState('Error al cargar la información de la sede.');
      }
      toast.error('Error al cargar datos del perfil');
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
    newAccs[idx] = { ...newAccs[idx], [field]: value };
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

  // Validación personalizada al enviar (por el bug de los inputs ocultos en pestañas inactivas)
  const validateForm = () => {
    // 1. Validar Datos Básicos
    if (!formData.nombre_sucursal || !formData.matricula || !formData.direccion || !formData.telefono_domicilio || !formData.admin_nombres || !formData.admin_apellidos || !formData.telefono) {
      setActiveTab('basic');
      toast.error('Faltan campos obligatorios en Información Sede.');
      return false;
    }

    // 2. Validar Fotografía Sede
    if (!formData.image_url && !selectedImageFile) {
      setActiveTab('basic');
      toast.error('Debe subir una fotografía de la sede (Estrategia Visual obligatoria).');
      return false;
    }

    // 3. Validar Ubicación y Estado
    if (canEditAdvanced && (!formData.latitud || !formData.longitud)) {
      setActiveTab('location');
      toast.error('Debe registrar la ubicación geográfica en el mapa.');
      return false;
    }

    // 4. Validar Horarios Operativos
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
      setActiveTab('hours');
      showAlert({ 
        title: 'Horario no permitido',
        message: 'Ningún rango puede cruzar la medianoche en una sola fila. Para horarios nocturnos, termina el día a las 00:00 e inicia el siguiente a las 00:00.' 
      });
      return false;
    }

    // 5. Validar Cuentas Bancarias
    if (formData.accounts && formData.accounts.length > 0) {
      // Filtrar cuentas completamente vacías primero (las consideramos borradores no llenos)
      const activeAccounts = formData.accounts.filter((acc: any) => acc.platform_id || acc.numero_cuenta || acc.titular_nombre);
      const invalidAcc = activeAccounts.some((acc: any) => !acc.platform_id || !acc.numero_cuenta);
      if (invalidAcc) {
        setActiveTab('accounts');
        toast.error('Completa la información de todas las cuentas bancarias registradas.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (!validateForm()) {
      return;
    }

    setSaveLoading(true);
    const headers = getAuthHeaders();
    let finalImageUrl = formData.image_url;

    try {
      // 1. Subir imagen si se seleccionó una nueva
      if (selectedImageFile) {
        setShowShield(true);
        setShieldMessage('Optimizando imagen...');

        const uploadData = new FormData();
        uploadData.append('image', selectedImageFile);

        const tokenString = token || '';
        const uploadRes = await axios.post(`${API_URL}/api/upload/store`, uploadData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${tokenString}`
          }
        });

        if (uploadRes.data && uploadRes.data.success) {
          finalImageUrl = uploadRes.data.url;
        } else {
          throw new Error('No se pudo subir la imagen.');
        }
      }

      setShieldMessage('Guardando cambios...');

      // 2. Enviar actualización
      // Filtrar cuentas completamente vacías (que el usuario dejó en blanco por defecto)
      const cleanAccounts = (formData.accounts || []).filter((acc: any) => acc.platform_id && acc.numero_cuenta);

      const payload = { 
        ...formData, 
        accounts: cleanAccounts,
        image_url: finalImageUrl,
        contacto_directo: `${formData.admin_nombres || ''} ${formData.admin_apellidos || ''}`.trim()
      };

      await axios.post(`${API_URL}/api/manage/stores`, payload, { headers });
      toast.success('Perfil de sede actualizado exitosamente');
      router.push(`/commerce/stores/${params.storeId}`);
    } catch (err: any) {
      console.error('Error saving store profile:', err);
      showAlert({
        title: 'Error al guardar',
        message: 'Error al guardar los cambios: ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setSaveLoading(false);
      setShowShield(false);
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando información del perfil...</p>
      </LoadingState>
    );
  }

  if (errorState) {
    return (
      <ProfileContainer>
        <Card>
          <ErrorContainer>
            <h2>Error de Acceso</h2>
            <p>{errorState}</p>
            <ActionButton 
              $variant="outline" 
              onClick={() => router.push('/commerce/store-admins')}
              style={{ marginTop: '20px' }}
            >
              Volver a las Sedes
            </ActionButton>
          </ErrorContainer>
        </Card>
      </ProfileContainer>
    );
  }

  return (
    <ProfileContainer>
      <ProfileHeader>
        <div>
          <Title>Perfil de la Sede</Title>
          <Subtitle>Gestión de datos operativos, horarios y finanzas para: <strong>{formData.nombre_sucursal}</strong></Subtitle>
        </div>
      </ProfileHeader>

      {/* TABS NAVIGATION */}
      <TabContainer>
        <TabButton 
          type="button" 
          $active={activeTab === 'basic'} 
          onClick={() => setActiveTab('basic')}
        >
          Información Sede
        </TabButton>
        <TabButton 
          type="button" 
          $active={activeTab === 'location'} 
          onClick={() => setActiveTab('location')}
        >
          Geolocalización
        </TabButton>
        <TabButton 
          type="button" 
          $active={activeTab === 'hours'} 
          onClick={() => setActiveTab('hours')}
        >
          Horarios Semanales
        </TabButton>
        <TabButton 
          type="button" 
          $active={activeTab === 'accounts'} 
          onClick={() => setActiveTab('accounts')}
        >
          Cuentas de Recaudo
        </TabButton>
        <TabButton 
          type="button" 
          $active={false} 
          onClick={() => router.push(`/commerce/stores/${params.storeId}`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg 
            viewBox="0 0 24 24" 
            width="16" 
            height="16" 
            fill="currentColor"
            style={{ display: 'inline-block', verticalAlign: 'middle' }}
          >
            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
          </svg>
          Configuración
        </TabButton>
      </TabContainer>

      <Form onSubmit={handleSubmit} noValidate className={isSubmitted ? 'was-validated' : ''}>
        {/* TABS CONTENT */}
        <TabContent>
          
          {/* TAB 1: INFORMACIÓN BÁSICA Y FOTO */}
          {activeTab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.25s ease' }}>
              <TopRowGrid>
                <Card style={{ display: 'flex', flexDirection: 'column' }}>
                  <SectionTitle>Fotografía Sede</SectionTitle>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <ImageUploadZone
                      label=""
                      disabled={!canEditBasic}
                      initialImage={formData.image_url}
                      endpoint="/api/upload/store"
                      placeholderText="Subir Foto Horizontal"
                      helperText="Mínimo 1080px de ancho, vista landscape."
                      onFileSelected={(file) => setSelectedImageFile(file)}
                    />
                  </div>
                </Card>

                <Card>
                  <SectionTitle>Estado y Disponibilidad</SectionTitle>
                  <InputGroup style={{ marginBottom: '15px' }}>
                    <Label>Estado de la Sede</Label>
                    <Select
                      value={formData.estado || 'no_disponible'}
                      disabled={!canEditBasic}
                      onChange={e => setFormData({ ...formData, estado: e.target.value })}
                    >
                      <option value="operativo">Operativo (Abierto)</option>
                      <option value="mantenimiento">En Mantenimiento / Pausa</option>
                      <option value="vacaciones">Cerrado por Vacaciones</option>
                      <option value="no_disponible">No Disponible / Cerrado</option>
                    </Select>
                  </InputGroup>

                  {formData.estado && formData.estado !== 'operativo' && (
                    <InputGroup>
                      <Label>Fecha de regreso (Estimada)</Label>
                      <Input
                        type="date"
                        disabled={!canEditBasic}
                        value={formData.fecha_regreso ? formData.fecha_regreso.split('T')[0] : ''}
                        onChange={e => setFormData({ ...formData, fecha_regreso: e.target.value })}
                      />
                    </InputGroup>
                  )}
                </Card>
              </TopRowGrid>

              <Card>
                <SectionTitle>Datos Generales de la Sede</SectionTitle>
                <FormGrid style={{ marginBottom: 0 }}>
                  <InputGroup>
                    <Label>Nombre de la Sede</Label>
                    <Input
                      required
                      type="text"
                      disabled={!canEditAdvanced}
                      value={formData.nombre_sucursal || ''}
                      onChange={e => setFormData({ ...formData, nombre_sucursal: e.target.value })}
                      placeholder="Sede..."
                    />
                  </InputGroup>

                  <InputGroup>
                    <Label>Matrícula Mercantil (No modificable)</Label>
                    <InfoText>{formData.matricula || 'No registrada'}</InfoText>
                  </InputGroup>

                  <InputGroup>
                    <Label>Dirección Física</Label>
                    <Input
                      required
                      type="text"
                      disabled={!canEditAdvanced}
                      value={formData.direccion || ''}
                      onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                      placeholder="Calle..."
                    />
                  </InputGroup>

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
                </FormGrid>
              </Card>

              <Card>
                <SectionTitle>Administrador de Sede</SectionTitle>
                <FormGrid style={{ marginBottom: 0 }}>
                  <InputGroup>
                    <Label>Nombres del Administrador</Label>
                    <Input
                      required
                      type="text"
                      disabled={!canEditAdvanced}
                      value={formData.admin_nombres || ''}
                      onChange={e => setFormData({ ...formData, admin_nombres: e.target.value })}
                      placeholder="Nombres..."
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
                      placeholder="Apellidos..."
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

                  <InputGroup>
                    <Label>Correo Electrónico (No modificable)</Label>
                    <InfoText>{formData.admin_email || 'No asignado'}</InfoText>
                  </InputGroup>
                </FormGrid>
              </Card>
            </div>
          )}

          {/* TAB 2: GEOLOCALIZACIÓN */}
          {activeTab === 'location' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <Card>
                <SectionTitle>Ubicación Geográfica (Mapa)</SectionTitle>
                <InputGroup style={{ gap: '0.8rem' }}>
                  <GeoButton 
                    type="button" 
                    disabled={!canEditAdvanced} 
                    onClick={canEditAdvanced ? geo.handleOpenMapPicker : undefined}
                  >
                    <svg viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
                    </svg>
                    Modificar Coordenadas en Mapa
                  </GeoButton>
                  
                  {formData.latitud && formData.longitud ? (
                    <GeoInfo style={{ margin: 0 }}>
                      <div className="geo-tag">Lat: <strong>{Number(formData.latitud).toFixed(6)}</strong></div>
                      <div className="geo-tag">Lng: <strong>{Number(formData.longitud).toFixed(6)}</strong></div>
                    </GeoInfo>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '10px 0' }}>
                      Coordenadas no registradas.
                    </div>
                  )}
                </InputGroup>
              </Card>
            </div>
          )}

          {/* TAB 3: HORARIOS OPERATIVOS */}
          {activeTab === 'hours' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <SectionTitle>Configuración de Horarios Semanales</SectionTitle>
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
                  />
                ))}
              </ScheduleGrid>
            </div>
          )}

          {/* TAB 4: CUENTAS BANCARIAS */}
          {activeTab === 'accounts' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <SectionTitle>Billeteras y Cuentas de Recaudo</SectionTitle>
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
                
                {formData.accounts?.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>
                    No hay cuentas de recaudo vinculadas a esta sede.
                  </div>
                )}

                {canEditAdvanced && (
                  <ActionButton
                    $variant="luminous"
                    type="button"
                    onClick={() => {
                      const newAccs = [...(formData.accounts || [])];
                      newAccs.push({ 
                        platform_id: '', 
                        numero_cuenta: '', 
                        titular_nombre: '', 
                        es_principal: newAccs.length === 0 
                      });
                      setFormData({ ...formData, accounts: newAccs });
                    }}
                    style={{ width: '100%', marginTop: '15px' }}
                  >
                    + Añadir Cuenta Bancaria
                  </ActionButton>
                )}
              </AccountsContainer>
            </div>
          )}

        </TabContent>

        {/* BOTTOM ACTION BUTTONS (ALWAYS VISIBLE OUTSIDE TABS) */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', padding: '0 0.5rem' }}>
          <ActionButton 
            $variant="outline" 
            type="button" 
            onClick={() => router.push(`/commerce/stores/${params.storeId}`)}
            style={{ padding: '0.8rem 2.5rem' }}
            disabled={saveLoading}
          >
            Cancelar
          </ActionButton>
          
          <SubmitButton 
            type="submit" 
            disabled={saveLoading || (!canEditBasic && !canEditAdvanced)} 
            style={{ margin: 0, padding: '0.8rem 2.5rem', width: 'auto' }}
          >
            {saveLoading ? 'Guardando Cambios...' : 'Guardar Cambios'}
          </SubmitButton>
        </div>
      </Form>

      {/* Portales de modales de mapa */}
      {geo.showMapPicker && modalTarget && createPortal(
        <MapPickerModal
          onClose={() => geo.setShowMapPicker(false)}
          onConfirm={geo.handleConfirmCoords}
          initialLat={parseFloat(formData.latitud) || undefined}
          initialLng={parseFloat(formData.longitud) || undefined}
        />,
        modalTarget
      )}

      {geo.showGeoWarning && modalTarget && createPortal(
        <GeoPermissionModal
          status={geo.geoStatus}
          onContinue={geo.handleContinueGeoFlow}
          onClose={() => geo.setShowGeoWarning(false)}
        />,
        modalTarget
      )}

      {showShield && modalTarget && createPortal(
        <TransitionShield message={shieldMessage} />,
        modalTarget
      )}
    </ProfileContainer>
  );
}
