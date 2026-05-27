'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingState, Spinner, HeaderBackButton } from '@/components/Common/UIElements';
import { FloatingSuccessToast, FloatingErrorToast } from '@/components/Common/Toasts';
import { useToast } from '@/context/ToastContext';
import { getAuthHeaders } from '@/utils/auth';
import { formatTime } from '@/utils';
import { API_URL } from '@/constants';
import {
  PageWrapper, HeaderSection, BackButton, TitleSection, SubtitleText,
  CreateButton, StoresGrid, StoreCard, CardContent, CardHeader, Badge,
  CardFooter, FooterButton, EmptyMessage, ModalOverlay, ModalContent,
  CloseModal, InputGroup, Input, Select, CheckboxGroup, SubmitButton
} from './StoresManagementStyles';
export default function StoresManagementPage({ params }: { params: { commerceId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    commerce_id: params.commerceId, 
    nombre_sucursal: '', 
    direccion: '', 
    open_time: '', 
    close_time: '', 
    is_24h: 0, 
    estado: 'abierto' 
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const toast = useToast();
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  useEffect(() => {
    if (!isModalOpen) setIsSubmitted(false);
  }, [isModalOpen]);


  useEffect(() => {
    fetchStores();
  }, [params.commerceId]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/manage/stores/${params.commerceId}`, {
        headers: getAuthHeaders()
      });
      setStores(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (!e.currentTarget.checkValidity()) {
      toast.error('Por favor completa todos los campos obligatorios.');
      return;
    }

    const is24h = formData.is_24h === 1;
    // Si no es 24h, validamos que el horario sea coherente (no cruce medianoche en una fila)
    if (!is24h && formData.open_time && formData.close_time) {
      const isTimeInvalid = (formData.open_time >= formData.close_time && formData.close_time !== '00:00') || (formData.open_time === formData.close_time);
      if (isTimeInvalid) {
        toast.error('Horario inválido. La hora inicial debe ser menor a la final.');
        return;
      }
    }

    try {
      await axios.post(`${API_URL}/api/manage/stores`, { ...formData, latitud: 0, longitud: 0 }, {
        headers: getAuthHeaders()
      });
      setIsModalOpen(false);
      setFormData({ 
        commerce_id: params.commerceId, 
        nombre_sucursal: '', 
        direccion: '', 
        open_time: '', 
        close_time: '', 
        is_24h: 0, 
        estado: 'abierto' 
      });
      toast.success('Sede creada exitosamente');
      fetchStores();
    } catch (e) {
      console.error(e);
      toast.error('Error al crear la sede');
    }
  };

  return (
    <PageWrapper>
      <HeaderBackButton onClick={() => router.push('/admin/dashboard/commerce')}>
        ← Volver
      </HeaderBackButton>
      <HeaderSection>
        <div>
          <TitleSection>
            Sedes Físicas <span>Activas</span>
          </TitleSection>
          <SubtitleText>Gestiona los locales comerciales para el comercio seleccionado.</SubtitleText>
        </div>
        
        <CreateButton onClick={() => setIsModalOpen(true)}>
          + Nueva Sede
        </CreateButton>
      </HeaderSection>

      {loading ? (
        <LoadingState>
          <Spinner />
          <p>Cargando sedes...</p>
        </LoadingState>
      ) : (
        <StoresGrid>
          {stores.map((store) => (
            <StoreCard key={store.id}>
              <div className="card-overlay" />
              <CardContent>
                <CardHeader>
                  <h3>{store.nombre_sucursal}</h3>
                  <div className="badges">
                    {typeof store.is_currently_open === 'boolean' && (
                      <Badge className={store.is_currently_open ? 'open-now' : 'closed'}>
                        {store.is_currently_open ? 'Abierto Ahora' : 'Cerrado'}
                      </Badge>
                    )}
                    <Badge className={store.estado === 'abierto' ? 'open' : 'inactive'}>
                      {store.estado}
                    </Badge>
                  </div>
                </CardHeader>
                <div className="info-group">
                  <p><span className="icon">📍</span> {store.direccion}</p>
                  <p className="schedule">
                    <span className="icon">🕒</span> 
                    {(() => {
                         const currentDay = new Date().getDay();
                         const todaySchedule = store.schedule?.find((s: any) => s.day_index === currentDay);
                         
                         if (!todaySchedule) return 'Sin horario asignado';
                         if (todaySchedule.status !== 'abierto') return 'Cerrado hoy';
                         if (todaySchedule.is_24h) {
                           const hasMaintenance = todaySchedule.open_time && todaySchedule.close_time && todaySchedule.open_time !== todaySchedule.close_time;
                           return hasMaintenance 
                             ? `24 Horas (Mant: ${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)})`
                             : '24 Horas';
                         }
                         if (todaySchedule.open_time && todaySchedule.close_time) {
                           return `${formatTime(todaySchedule.open_time)} - ${formatTime(todaySchedule.close_time)}`;
                         }
                         return 'Sin horario definido';
                    })()}
                  </p>
                </div>
                
                <div className="card-footer">
                  <FooterButton onClick={() => router.push(`/admin/dashboard/stores/${store.id}`)}>
                    Menús y Productos →
                  </FooterButton>
                </div>
              </CardContent>
            </StoreCard>
          ))}
          
          {stores.length === 0 && (
             <EmptyMessage>
                 No hay sedes registradas para este comercio. <br/>
                 <span>Usa el botón superior para crear una sucursal.</span>
             </EmptyMessage>
          )}
        </StoresGrid>
      )}

      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <CloseModal onClick={() => setIsModalOpen(false)}>✕</CloseModal>
            <h2 className="text-xl font-bold mb-6">Añadir Sucursal</h2>
            
            <form 
              onSubmit={handleCreateStore} 
              noValidate 
              className={`space-y-4 ${isSubmitted ? 'was-validated' : ''}`}
            >
              <InputGroup>
                <label>Nombre (Ej: Sede Centro)</label>
                <Input required type="text" value={formData.nombre_sucursal} onChange={e => setFormData({...formData, nombre_sucursal: e.target.value})} />
              </InputGroup>
              <InputGroup>
                <label>Dirección Exacta</label>
                <Input required type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
              </InputGroup>
              <CheckboxGroup>
                <input 
                  type="checkbox" 
                  id="is_24h_sub" 
                  checked={formData.is_24h === 1} 
                  onChange={e => setFormData({...formData, is_24h: e.target.checked ? 1 : 0})} 
                />
                <label htmlFor="is_24h_sub">Abierto 24 Horas</label>
              </CheckboxGroup>

              {formData.is_24h === 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup>
                    <label>Apertura</label>
                    <Input type="time" value={formData.open_time} onChange={e => setFormData({...formData, open_time: e.target.value})} />
                  </InputGroup>
                  <InputGroup>
                    <label>Cierre</label>
                    <Input type="time" value={formData.close_time} onChange={e => setFormData({...formData, close_time: e.target.value})} />
                  </InputGroup>
                </div>
              )}
              <InputGroup>
                <label>Estado</label>
                <Select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})}>
                  <option value="abierto">Operando (Abierto)</option>
                  <option value="cerrado">Pausado (Cerrado temporalmente)</option>
                </Select>
              </InputGroup>
              <SubmitButton type="submit">
                Guardar Sucursal
              </SubmitButton>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}

    </PageWrapper>
  );
}


