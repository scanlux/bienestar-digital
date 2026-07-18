'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useModalScroll } from '@/hooks/useModalScroll';
import { getAuthHeaders } from '@/utils/auth';
import { DEFAULT_SCHEDULE, API_URL } from '@/constants';
import { formatTime } from '@/utils';
import { getStatusBorderColor, getStatusBoxShadow } from '@/components/Common/StoreHeroStyles';

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
  GeoButton,
  GeoInfo,
  AccountsContainer
} from '@/components/Common/ModalStyles';

const StoreStatusSelect = styled(Select)<{ $estado?: string }>`
  border: 1px solid ${p => {
    if (p.$estado === 'operativo') return '#10b981';
    return getStatusBorderColor(p.$estado, 'rgba(255, 255, 255, 0.1)');
  }};
  box-shadow: ${p => {
    if (p.$estado === 'operativo') return '0 0 15px rgba(16, 185, 129, 0.25)';
    return getStatusBoxShadow(p.$estado, 'none');
  }};
  transition: all 0.3s ease;
  &:focus {
    border-color: ${p => {
      if (p.$estado === 'operativo') return '#10b981';
      return getStatusBorderColor(p.$estado, 'var(--emerald)');
    }};
  }
`;

import { StoreScheduleForm } from '@/components/Common/StoreScheduleForm';
import {
  ProfileContainer,
  ProfileHeader,
  Title,
  Subtitle,
  TabContainer,
  TabButton,
  TabContent,
  SectionTitle,
  Card,
  TopRowGrid,
  InfoText,
  ErrorContainer
} from '@/app/commerce/stores/[storeId]/profile/StoreProfileStyles';

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(16, 185, 129, 0);
    transform: scale(1.03);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    transform: scale(1);
  }
`;

const pulseRedGlow = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    border-color: rgba(239, 68, 68, 0.8);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
    border-color: rgba(239, 68, 68, 1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    border-color: rgba(239, 68, 68, 0.8);
  }
`;

const DateInput = styled(Input)<{ $isHighlighted?: boolean; $estado?: string }>`
  transition: all 0.3s ease;
  border: 1px solid ${p => getStatusBorderColor(p.$estado, 'rgba(255, 255, 255, 0.1)')};
  box-shadow: ${p => getStatusBoxShadow(p.$estado, 'none')};
  
  &:focus {
    border-color: ${p => getStatusBorderColor(p.$estado, 'var(--emerald)')};
  }

  ${props => props.$isHighlighted && css`
    border-color: #EF4444 !important;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2) !important;
    animation: ${pulseRedGlow} 1.5s infinite ease-in-out;
  `}
`;

const FloatingActionsContainer = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  gap: 15px;
  z-index: 999;
  align-items: center;
  transition: all 0.3s ease;
`;

const PulsingSubmitButton = styled(SubmitButton)<{ $pulse?: boolean }>`
  animation: ${props => props.$pulse ? `${pulseGlow} 0.8s ease-in-out infinite` : 'none'};
  transition: all 0.2s ease;
`;

interface StoreProfilePageProps {
  storeId: string;
}

export default function StoreProfilePage({ storeId }: StoreProfilePageProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { showAlert, showConfirm } = useAlert();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const highlight = searchParams.get('highlight');
  const [isDateHighlighted, setIsDateHighlighted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [paymentPlatforms, setPaymentPlatforms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'hours' | 'accounts'>('basic');

  const tabParam = searchParams.get('tab');
  useEffect(() => {
    if (tabParam === 'basic' || tabParam === 'location' || tabParam === 'hours' || tabParam === 'accounts') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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

  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [highlightSave, setHighlightSave] = useState(false);

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

  // TanStack Query: Lectura de Datos de Sede
  const { data: storeDetails, error: storeError, isLoading: storeLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/store/${storeId}`, { headers, signal });
      return res.data;
    },
    enabled: !!token && !!storeId
  });

  // TanStack Query: Lectura de Plataformas de Pago
  const { data: platformsData } = useQuery({
    queryKey: ['paymentPlatforms'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/payment-platforms`, { headers, signal });
      return res.data;
    },
    enabled: !!token,
    retry: false
  });

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.adminType !== 'commerce' && user.adminType !== 'store' && !isSystem) {
      router.push('/commerce/dashboard');
      return;
    }
  }, [user]);

  useEffect(() => {
    if (highlight === 'fecha_regreso' && formData.estado && formData.estado !== 'operativo') {
      setIsDateHighlighted(true);
      setTimeout(() => {
        const el = document.getElementById('fecha_regreso_input');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 500);

      const timer = setTimeout(() => {
        setIsDateHighlighted(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlight, formData.estado]);

  // Sincronizar datos cargados por React Query con el estado local del formulario
  useEffect(() => {
    if (storeDetails) {
      const storeData = storeDetails;

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

      const loadedData = {
        ...storeData,
        admin_nombres,
        admin_apellidos,
        schedule: (storeData.schedule && storeData.schedule.length > 0)
          ? storeData.schedule
          : JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)),
        accounts
      };

      setFormData(loadedData);
      setInitialFormData(JSON.parse(JSON.stringify(loadedData)));
    }
  }, [storeDetails]);

  useEffect(() => {
    if (platformsData) {
      setPaymentPlatforms(platformsData);
    }
  }, [platformsData]);

  // Manejar el estado de carga y los errores de React Query
  useEffect(() => {
    setLoading(storeLoading);
  }, [storeLoading]);

  useEffect(() => {
    if (storeError) {
      const err = storeError as any;
      console.error('Error fetching store details for profile:', err);
      if (err.response?.status === 403) {
        setErrorState('Acceso Prohibido: No tienes permisos o la sede pertenece a otro comercio.');
      } else if (err.response?.status === 404) {
        setErrorState('Sede no encontrada.');
      } else {
        setErrorState('Error al cargar la información de la sede.');
      }
      toast.error('Error al cargar datos del perfil');
    } else {
      setErrorState(null);
    }
  }, [storeError]);

  const isFormDirty = () => {
    if (!initialFormData) return false;
    
    // Comparar campos principales
    const fieldsToCompare = [
      'nombre_sucursal', 'telefono', 'direccion', 'latitud', 'longitud',
      'estado', 'contacto_directo', 'image_url', 'telefono_domicilio',
      'admin_nombres', 'admin_apellidos', 'fecha_regreso'
    ];
    
    const basicChanged = fieldsToCompare.some(field => formData[field] !== initialFormData[field]);
    
    // Comparar horarios (schedules)
    const scheduleChanged = JSON.stringify(formData.schedule) !== JSON.stringify(initialFormData.schedule);
    
    // Comparar cuentas bancarias
    const accountsChanged = JSON.stringify(formData.accounts) !== JSON.stringify(initialFormData.accounts);
    
    return basicChanged || scheduleChanged || accountsChanged;
  };

  const handleTabClick = (tab: 'basic' | 'location' | 'hours' | 'accounts') => {
    if (activeTab !== tab && isFormDirty()) {
      toast.error('Tienes datos no guardados en esta sede.');
      setHighlightSave(true);
      setTimeout(() => {
        setHighlightSave(false);
      }, 3000);
    }
    setActiveTab(tab);
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
    if (!formData.nombre_sucursal || !formData.matricula || !formData.admin_nombres || !formData.admin_apellidos || !formData.telefono) {
      setActiveTab('basic');
      toast.error('Faltan campos obligatorios en Información Sede (Datos Básicos y Administrador).');
      return false;
    }

    // 1b. Validar Contacto y Ubicación Física
    if (!formData.direccion || !formData.telefono_domicilio) {
      setActiveTab('location');
      toast.error('Faltan campos obligatorios en Contacto (Dirección Física y Teléfono de Domicilio).');
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

  const storeMutation = useMutation({
    mutationFn: async (payloadData: any) => {
      const headers = getAuthHeaders();
      let finalImageUrl = payloadData.image_url;

      // 1. Subir imagen si se seleccionó una nueva
      if (selectedImageFile) {
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
      const cleanAccounts = (payloadData.accounts || []).filter((acc: any) => acc.platform_id && acc.numero_cuenta);
      const payload = { 
        ...payloadData, 
        accounts: cleanAccounts,
        image_url: finalImageUrl,
        contacto_directo: `${payloadData.admin_nombres || ''} ${payloadData.admin_apellidos || ''}`.trim()
      };

      const res = await axios.post(`${API_URL}/api/manage/stores`, payload, { headers });
      return { payload, data: res.data };
    },
    onSuccess: (data) => {
      toast.success('Perfil de sede actualizado exitosamente');
      // Invalida la caché de la sede para que la vista del dashboard principal se actualice
      queryClient.invalidateQueries({ queryKey: ['store', storeId] });
      setInitialFormData(JSON.parse(JSON.stringify(data.payload)));
    },
    onError: (err: any) => {
      console.error('Error saving store profile:', err);
      const errMsg = err.response?.data?.error || err.message;
      if (errMsg.includes('Límite de sedes operativas alcanzado')) {
        showConfirm({
          title: 'Límite de Sedes Alcanzado',
          message: `${errMsg}\n\n¿Deseas ir al Mercado de Mejoras ahora mismo para adquirir un buff?`,
          confirmText: 'Ir al Mercado',
          cancelText: 'Cerrar',
          onConfirm: () => {
            router.push('/commerce/upgrades?highlight=adicionar_sede');
          }
        });
      } else {
        showAlert({
          title: 'Error al guardar',
          message: 'Error al guardar los cambios: ' + errMsg
        });
      }
    },
    onSettled: () => {
      setSaveLoading(false);
      setShowShield(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (!validateForm()) {
      return;
    }

    setSaveLoading(true);
    setShowShield(true);
    storeMutation.mutate(formData);
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

      {/* TABS NAVIGATION */}
      <TabContainer>
        <TabButton 
          type="button" 
          $active={activeTab === 'basic'} 
          onClick={() => handleTabClick('basic')}
        >
          Información Sede
        </TabButton>
        <TabButton 
          type="button" 
          $active={activeTab === 'location'} 
          onClick={() => handleTabClick('location')}
        >
          Contacto
        </TabButton>
        <TabButton 
          type="button" 
          $active={activeTab === 'hours'} 
          onClick={() => handleTabClick('hours')}
        >
          Horarios Semanales
        </TabButton>
        <TabButton 
          type="button" 
          $active={activeTab === 'accounts'} 
          onClick={() => handleTabClick('accounts')}
        >
          Cuentas de Recaudo
        </TabButton>
        <TabButton 
          type="button" 
          $active={false} 
          onClick={() => router.push(`/commerce/stores/${storeId}`)}
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
          Configuración Catalogo
        </TabButton>
      </TabContainer>

      <Form onSubmit={handleSubmit} noValidate className={isSubmitted ? 'was-validated' : ''}>
        {/* TABS CONTENT */}
        <TabContent>
          
          {/* TAB 1: INFORMACIÓN BÁSICA Y FOTO */}
          <div style={{ display: activeTab === 'basic' ? 'flex' : 'none', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.25s ease' }}>
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
                  <StoreStatusSelect
                    value={formData.estado || 'no_disponible'}
                    $estado={formData.estado}
                    disabled={!canEditBasic}
                    onChange={e => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="operativo">Operativo</option>
                    <option value="mantenimiento">En Mantenimiento</option>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="no_disponible">No disponible</option>
                  </StoreStatusSelect>
                </InputGroup>

                {formData.estado && formData.estado !== 'operativo' && (
                  <InputGroup>
                    <Label>Fecha de regreso (Estimada)</Label>
                    <DateInput
                      id="fecha_regreso_input"
                      $isHighlighted={isDateHighlighted}
                      $estado={formData.estado}
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

          {/* TAB 2: GEOLOCALIZACIÓN */}
          <div style={{ display: activeTab === 'location' ? 'block' : 'none', animation: 'fadeIn 0.25s ease' }}>
            <TopRowGrid>
              {/* Columna Izquierda: Dirección y Domicilio */}
              <Card>
                <SectionTitle>Dirección y Contacto Sede</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                </div>
              </Card>

              {/* Columna Derecha: Ubicación Geográfica */}
              <Card style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionTitle>Ubicación Geográfica (Mapa)</SectionTitle>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <InputGroup style={{ gap: '0.8rem' }}>
                    <GeoButton 
                      type="button" 
                      disabled={!canEditAdvanced} 
                      onClick={canEditAdvanced ? geo.handleOpenMapPicker : undefined}
                      style={{ width: '100%' }}
                    >
                      <svg viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', width: '16px', height: '16px' }}>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
                      </svg>
                      Modificar Coordenadas en Mapa
                    </GeoButton>
                    
                    {formData.latitud && formData.longitud ? (
                      <GeoInfo style={{ margin: 0, width: '100%' }}>
                        <div className="geo-tag" style={{ flex: 1, textAlign: 'center' }}>Lat: <strong>{Number(formData.latitud).toFixed(6)}</strong></div>
                        <div className="geo-tag" style={{ flex: 1, textAlign: 'center' }}>Lng: <strong>{Number(formData.longitud).toFixed(6)}</strong></div>
                      </GeoInfo>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '10px 0' }}>
                        Coordenadas no registradas.
                      </div>
                    )}
                  </InputGroup>
                </div>
              </Card>
            </TopRowGrid>
          </div>

          {/* TAB 3: HORARIOS OPERATIVOS */}
          <div style={{ display: activeTab === 'hours' ? 'block' : 'none', animation: 'fadeIn 0.25s ease' }}>
            <SectionTitle>Configuración de Horarios Semanales</SectionTitle>
            <StoreScheduleForm
              schedule={formData.schedule}
              disabled={!canEditBasic}
              onUpdateSchedule={handleUpdateSchedule}
              onAlert={(msg) => showAlert({ message: msg })}
              formatTime={formatTime}
            />
          </div>

          {/* TAB 4: CUENTAS BANCARIAS */}
          <div style={{ display: activeTab === 'accounts' ? 'block' : 'none', animation: 'fadeIn 0.25s ease' }}>
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

        </TabContent>

        {/* BOTTOM ACTION BUTTONS (FLOATING IN THE BOTTOM CORNER) */}
        <FloatingActionsContainer>

          <PulsingSubmitButton 
            type="submit" 
            $pulse={highlightSave}
            disabled={saveLoading || (!canEditBasic && !canEditAdvanced)} 
            style={{ margin: 0, padding: '0.8rem 2.5rem', width: 'auto' }}
          >
            {saveLoading ? 'Guardando Cambios...' : 'Guardar Cambios'}
          </PulsingSubmitButton>
        </FloatingActionsContainer>
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
