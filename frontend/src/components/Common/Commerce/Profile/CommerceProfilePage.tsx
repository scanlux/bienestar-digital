'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { getAuthHeaders } from '@/utils/auth';
import { API_URL } from '@/constants';

// Estilos Compartidos de Perfil
import {
  ProfileContainer,
  ProfileHeader,
  Title,
  Subtitle,
  TabContainer,
  TabButton,
  TabContent,
  SectionTitle,
  TopRowGrid,
  InfoText
} from '@/app/commerce/stores/[storeId]/profile/StoreProfileStyles';

// Estilos de Formularios
import {
  Form,
  InputGroup,
  Label,
  Input,
  Select,
  SubmitButton
} from '@/components/Common/ModalStyles';

import { ImageUploadZone } from '@/components/Common/ImageUploadZone';
import { ActionButton, LoadingState, Spinner } from '@/components/Common/UIElements';
import { SystemRestrictionWrapper } from '@/components/Common/SystemRestrictionWrapper';

// Estilos Locales de Cuentas y Admins
import {
  AccountsGrid,
  AccountCard,
  TableContainer,
  Table,
  Th,
  Td,
  Tr,
  ActionButtonSmall,
  SedesSelectionBox,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton
} from './CommerceProfileStyles';

export default function CommerceProfilePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { showConfirm } = useAlert();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'basic' | 'accounts' | 'admins'>('basic');
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);

  // Estados para formularios de edición/creación
  const [isEditingCommerce, setIsEditingCommerce] = useState(false);
  const [commerceForm, setCommerceForm] = useState<any>({
    nombre: '',
    nit: '',
    nit_dv: '',
    telefono: '',
    ciudad: '',
    direccion: '',
    descripcion: '',
    logo_url: ''
  });

  // Estado para modal de cuentas de retiro
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    metodo: 'bancolombia',
    tipo_cuenta: 'ahorros',
    numero_cuenta: '',
    titular: '',
    documento_cc: '',
    codigo_banco: '',
    is_default: false
  });

  // Estado para modal de administradores de sede
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [adminForm, setAdminForm] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    celular: '',
    password: '',
    storeIds: [] as number[]
  });

  const [sendingRecoveryId, setSendingRecoveryId] = useState<number | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user]);

  // --- CONSULTAS REACT QUERY ---
  
  // 1. Datos del Comercio
  const { data: commerceDetails, isLoading: commerceLoading } = useQuery({
    queryKey: ['commerceDetails', user?.commerceId],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/commerces/${user?.commerceId}`, { headers, signal });
      return res.data;
    },
    enabled: !!token && !!user?.commerceId
  });

  // Sincronizar estado local del formulario de comercio
  useEffect(() => {
    if (commerceDetails) {
      setCommerceForm({
        nombre: commerceDetails.nombre || '',
        nit: commerceDetails.nit || '',
        nit_dv: commerceDetails.nit_dv || '',
        telefono: commerceDetails.telefono || '',
        ciudad: commerceDetails.ciudad || '',
        direccion: commerceDetails.direccion || '',
        descripcion: commerceDetails.descripcion || '',
        logo_url: commerceDetails.logo_url || ''
      });
    }
  }, [commerceDetails]);

  // 2. Cuentas de Retiro
  const { data: withdrawalAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['withdrawalAccounts'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/domi/withdrawal-accounts`, { headers, signal });
      return res.data;
    },
    enabled: !!token
  });

  // 3. Administradores de Sede
  const { data: storeAdmins, isLoading: adminsLoading } = useQuery({
    queryKey: ['storeAdmins'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/store-admins`, { headers, signal });
      return res.data;
    },
    enabled: !!token
  });

  // 4. Sedes del Comercio (para vincular admins)
  const { data: myStores } = useQuery({
    queryKey: ['myStores'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/my-stores`, { headers, signal });
      return res.data;
    },
    enabled: !!token
  });

  // --- MUTACIONES REACT QUERY ---

  // Mutación para editar comercio
  const updateCommerceMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const headers = getAuthHeaders();
      await axios.put(`${API_URL}/api/manage/commerces/${user?.commerceId}`, updatedData, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commerceDetails', user?.commerceId] });
      toast.success('Información comercial actualizada.');
      setIsEditingCommerce(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Error al actualizar el comercio.');
    }
  });

  // Mutación para crear cuenta de retiro
  const createAccountMutation = useMutation({
    mutationFn: async (newAccount: any) => {
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/api/domi/withdrawal-accounts`, newAccount, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawalAccounts'] });
      toast.success('Cuenta de retiro registrada.');
      setIsAccountModalOpen(false);
      // Reset
      setAccountForm({
        metodo: 'bancolombia',
        tipo_cuenta: 'ahorros',
        numero_cuenta: '',
        titular: '',
        documento_cc: '',
        codigo_banco: '',
        is_default: false
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Error al registrar cuenta.');
    }
  });

  // Mutación para eliminar cuenta de retiro
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const headers = getAuthHeaders();
      await axios.delete(`${API_URL}/api/domi/withdrawal-accounts/${id}`, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawalAccounts'] });
      toast.success('Cuenta de retiro eliminada.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Error al eliminar cuenta.');
    }
  });

  // Mutación para definir cuenta principal
  const setDefaultAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const headers = getAuthHeaders();
      await axios.patch(`${API_URL}/api/domi/withdrawal-accounts/${id}/default`, {}, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawalAccounts'] });
      toast.success('Cuenta principal configurada.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Error al configurar cuenta principal.');
    }
  });

  // Mutación para crear/actualizar administrador de sede
  const saveAdminMutation = useMutation({
    mutationFn: async (payload: any) => {
      const headers = getAuthHeaders();
      if (selectedAdmin) {
        await axios.put(`${API_URL}/api/manage/store-admins/${selectedAdmin.id}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/api/manage/store-admins`, payload, { headers });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeAdmins'] });
      toast.success(selectedAdmin ? 'Administrador actualizado.' : 'Administrador creado.');
      setIsAdminModalOpen(false);
      setSelectedAdmin(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Error al guardar administrador.');
    }
  });

  // --- MANEJADORES ---

  const handleCommerceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let logo_url = commerceForm.logo_url;

    if (selectedLogoFile) {
      try {
        const formDataPayload = new FormData();
        formDataPayload.append('image', selectedLogoFile);
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        };
        const uploadRes = await axios.post(`${API_URL}/api/manage/upload-image`, formDataPayload, { headers });
        logo_url = uploadRes.data.imageUrl;
      } catch (err) {
        toast.error('Fallo al subir el logo del comercio.');
        return;
      }
    }

    updateCommerceMutation.mutate({
      ...commerceForm,
      logo_url
    });
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.numero_cuenta || !accountForm.titular || !accountForm.documento_cc) {
      toast.error('Complete los datos obligatorios de la cuenta.');
      return;
    }
    createAccountMutation.mutate(accountForm);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.nombres || !adminForm.email || (!selectedAdmin && !adminForm.password)) {
      toast.error('Complete los campos obligatorios del administrador.');
      return;
    }
    saveAdminMutation.mutate(adminForm);
  };

  const handleSendRecoveryEmail = (adminId: number, adminEmail: string) => {
    showConfirm({
      title: 'Enviar Recuperación de Contraseña',
      message: `¿Estás seguro de que deseas enviar un enlace de restablecimiento de contraseña a ${adminEmail}? El enlace expirará en 10 minutos.`,
      confirmText: 'Enviar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setSendingRecoveryId(adminId);
        try {
          const headers = getAuthHeaders();
          await axios.post(`${API_URL}/api/manage/store-admins/${adminId}/recovery-email`, {}, { headers });
          toast.success('Correo de recuperación enviado con éxito.');
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Error al enviar correo.');
        } finally {
          setSendingRecoveryId(null);
        }
      }
    });
  };

  const handleOpenEditAdmin = (admin: any) => {
    setSelectedAdmin(admin);
    setAdminForm({
      nombres: admin.nombres || '',
      apellidos: admin.apellidos || '',
      email: admin.email || '',
      celular: admin.telefono || '',
      password: '',
      storeIds: admin.storeIds || []
    });
    setIsAdminModalOpen(true);
  };

  const handleOpenCreateAdmin = () => {
    setSelectedAdmin(null);
    setAdminForm({
      nombres: '',
      apellidos: '',
      email: '',
      celular: '',
      password: '',
      storeIds: []
    });
    setIsAdminModalOpen(true);
  };

  const handleToggleStoreSelection = (storeId: number) => {
    setAdminForm(prev => {
      const isSelected = prev.storeIds.includes(storeId);
      const nextStoreIds = isSelected 
        ? prev.storeIds.filter(id => id !== storeId)
        : [...prev.storeIds, storeId];
      return { ...prev, storeIds: nextStoreIds };
    });
  };

  const getStoreNames = (storeIds: number[]) => {
    if (!storeIds || storeIds.length === 0 || !myStores) return 'Ninguna';
    return storeIds
      .map(sid => myStores.find((s: any) => s.id === sid)?.nombre_sucursal)
      .filter(Boolean)
      .join(', ') || 'Ninguna';
  };

  if (commerceLoading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando información del comercio...</p>
      </LoadingState>
    );
  }

  return (
    <SystemRestrictionWrapper permission="view_commerces">
      <ProfileContainer>
        <ProfileHeader>
          <div>
            <Title>{commerceDetails?.nombre || 'Mi Comercio'}</Title>
            <Subtitle>Administración y configuración general del comercio</Subtitle>
          </div>
        </ProfileHeader>

        <TabContainer>
          <TabButton $active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
            Datos Básicos
          </TabButton>
          <TabButton $active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')}>
            Cuentas de Retiro
          </TabButton>
          <TabButton $active={activeTab === 'admins'} onClick={() => setActiveTab('admins')}>
            Administradores de Sede
          </TabButton>
        </TabContainer>

        {/* --- PESTAÑA 1: DATOS BÁSICOS --- */}
        {activeTab === 'basic' && (
          <TabContent>
            <Form onSubmit={handleCommerceSubmit}>
              <TopRowGrid>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <SectionTitle>Identificación Comercial</SectionTitle>
                  <InputGroup>
                    <Label htmlFor="comm-name">Nombre Comercial</Label>
                    {isEditingCommerce ? (
                      <Input
                        id="comm-name"
                        value={commerceForm.nombre}
                        onChange={e => setCommerceForm({ ...commerceForm, nombre: e.target.value })}
                        required
                      />
                    ) : (
                      <InfoText>{commerceDetails?.nombre || 'N/A'}</InfoText>
                    )}
                  </InputGroup>

                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '15px' }}>
                    <InputGroup>
                      <Label htmlFor="comm-nit">NIT</Label>
                      {isEditingCommerce ? (
                        <Input
                          id="comm-nit"
                          value={commerceForm.nit}
                          onChange={e => setCommerceForm({ ...commerceForm, nit: e.target.value })}
                          required
                        />
                      ) : (
                        <InfoText>{commerceDetails?.nit || 'N/A'}</InfoText>
                      )}
                    </InputGroup>

                    <InputGroup>
                      <Label htmlFor="comm-nit-dv">DV</Label>
                      {isEditingCommerce ? (
                        <Input
                          id="comm-nit-dv"
                          value={commerceForm.nit_dv || ''}
                          onChange={e => setCommerceForm({ ...commerceForm, nit_dv: e.target.value })}
                          maxLength={1}
                        />
                      ) : (
                        <InfoText>{commerceDetails?.nit_dv ?? 'N/A'}</InfoText>
                      )}
                    </InputGroup>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <SectionTitle>Logo / Banner</SectionTitle>
                  <ImageUploadZone
                    label="Subir logo del comercio"
                    initialImage={commerceForm.logo_url}
                    disabled={!isEditingCommerce}
                    onFileSelected={(file) => setSelectedLogoFile(file)}
                  />
                </div>
              </TopRowGrid>

              <SectionTitle>Detalles de Contacto y Ubicación</SectionTitle>
              <TopRowGrid>
                <InputGroup>
                  <Label htmlFor="comm-phone">Teléfono de Contacto</Label>
                  {isEditingCommerce ? (
                    <Input
                      id="comm-phone"
                      value={commerceForm.telefono}
                      onChange={e => setCommerceForm({ ...commerceForm, telefono: e.target.value })}
                    />
                  ) : (
                    <InfoText>{commerceDetails?.telefono || 'N/A'}</InfoText>
                  )}
                </InputGroup>

                <InputGroup>
                  <Label htmlFor="comm-city">Ciudad de Operaciones</Label>
                  {isEditingCommerce ? (
                    <Input
                      id="comm-city"
                      value={commerceForm.ciudad}
                      onChange={e => setCommerceForm({ ...commerceForm, ciudad: e.target.value })}
                    />
                  ) : (
                    <InfoText>{commerceDetails?.ciudad || 'N/A'}</InfoText>
                  )}
                </InputGroup>
              </TopRowGrid>

              <InputGroup>
                <Label htmlFor="comm-address">Dirección Principal</Label>
                {isEditingCommerce ? (
                  <Input
                    id="comm-address"
                    value={commerceForm.direccion}
                    onChange={e => setCommerceForm({ ...commerceForm, direccion: e.target.value })}
                  />
                ) : (
                  <InfoText>{commerceDetails?.direccion || 'N/A'}</InfoText>
                )}
              </InputGroup>

              <InputGroup>
                <Label htmlFor="comm-desc">Descripción del Comercio</Label>
                {isEditingCommerce ? (
                  <Input
                    as="textarea"
                    id="comm-desc"
                    style={{ minHeight: '80px', fontFamily: 'inherit', padding: '10px' }}
                    value={commerceForm.descripcion}
                    onChange={e => setCommerceForm({ ...commerceForm, descripcion: e.target.value })}
                  />
                ) : (
                  <InfoText style={{ minHeight: '80px', alignItems: 'flex-start' }}>{commerceDetails?.descripcion || 'Sin descripción'}</InfoText>
                )}
              </InputGroup>

              <SystemRestrictionWrapper permission="edit_commerce">
                <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                  {isEditingCommerce ? (
                    <>
                      <SubmitButton type="submit" disabled={updateCommerceMutation.isPending}>
                        {updateCommerceMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                      </SubmitButton>
                      <ActionButton
                        type="button"
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                        onClick={() => {
                          setIsEditingCommerce(false);
                          setSelectedLogoFile(null);
                        }}
                      >
                        Cancelar
                      </ActionButton>
                    </>
                  ) : (
                    <ActionButton type="button" onClick={() => setIsEditingCommerce(true)}>
                      Editar Información
                    </ActionButton>
                  )}
                </div>
              </SystemRestrictionWrapper>
            </Form>
          </TabContent>
        )}

        {/* --- PESTAÑA 2: CUENTAS DE RETIRO --- */}
        {activeTab === 'accounts' && (
          <TabContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle style={{ marginBottom: 0 }}>Cuentas Bancarias Registradas</SectionTitle>
              <ActionButton onClick={() => setIsAccountModalOpen(true)}>
                + Registrar Cuenta
              </ActionButton>
            </div>

            {accountsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>
            ) : !withdrawalAccounts || withdrawalAccounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                No tienes cuentas bancarias registradas para retiros.
              </div>
            ) : (
              <AccountsGrid>
                {withdrawalAccounts.map((acc: any) => (
                  <AccountCard key={acc.id} className={acc.is_default ? 'default' : ''}>
                    <div className="card-top">
                      <span className="acc-method">{acc.metodo?.toUpperCase()}</span>
                      {acc.is_default && <span className="default-badge">Principal</span>}
                    </div>
                    
                    <div className="card-body">
                      <p><strong>Nº Cuenta:</strong> {acc.numero_cuenta} ({acc.tipo_cuenta})</p>
                      <p><strong>Titular:</strong> {acc.titular}</p>
                      <p><strong>C.C./NIT:</strong> {acc.documento_cc}</p>
                      <p>
                        <strong>Estado:</strong>{' '}
                        {acc.is_verified ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Verificada</span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Pte. Verificación</span>
                        )}
                      </p>
                    </div>

                    <div className="card-actions">
                      {!acc.is_default && (
                        <ActionButtonSmall
                          $variant="recovery"
                          onClick={() => setDefaultAccountMutation.mutate(acc.id)}
                          disabled={setDefaultAccountMutation.isPending}
                        >
                          Hacer Principal
                        </ActionButtonSmall>
                      )}
                      <ActionButtonSmall
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderColor: 'rgba(239, 68, 68, 0.25)',
                          color: '#f87171'
                        }}
                        onClick={() => {
                          showConfirm({
                            title: 'Eliminar Cuenta de Retiro',
                            message: '¿Estás seguro de que deseas eliminar esta cuenta bancaria? Esta acción no se puede deshacer.',
                            confirmText: 'Eliminar',
                            cancelText: 'Cancelar',
                            onConfirm: () => deleteAccountMutation.mutate(acc.id)
                          });
                        }}
                        disabled={deleteAccountMutation.isPending}
                      >
                        Eliminar
                      </ActionButtonSmall>
                    </div>
                  </AccountCard>
                ))}
              </AccountsGrid>
            )}
          </TabContent>
        )}

        {/* --- PESTAÑA 3: ADMINISTRADORES DE SEDE --- */}
        {activeTab === 'admins' && (
          <TabContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionTitle style={{ marginBottom: 0 }}>Administradores de Sede</SectionTitle>
              <SystemRestrictionWrapper permission="manage_store_admins">
                <ActionButton onClick={handleOpenCreateAdmin}>
                  + Añadir Administrador
                </ActionButton>
              </SystemRestrictionWrapper>
            </div>

            {adminsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>
            ) : !storeAdmins || storeAdmins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                No hay administradores registrados para tus sedes.
              </div>
            ) : (
              <TableContainer>
                <Table>
                  <thead>
                    <tr>
                      <Th>Nombre</Th>
                      <Th>Email</Th>
                      <Th>Celular</Th>
                      <Th>Sedes Asignadas</Th>
                      <Th>Estado</Th>
                      <Th>Acciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeAdmins.map((adm: any) => (
                      <Tr key={adm.id}>
                        <Td style={{ fontWeight: 600 }}>{adm.nombre}</Td>
                        <Td>{adm.email}</Td>
                        <Td>{adm.telefono || 'N/A'}</Td>
                        <Td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                          {getStoreNames(adm.storeIds)}
                        </Td>
                        <Td>
                          <span style={{
                            color: adm.estado === 'activo' ? '#10b981' : '#f87171',
                            fontWeight: 700,
                            textTransform: 'capitalize'
                          }}>
                            {adm.estado}
                          </span>
                        </Td>
                        <Td>
                          <SystemRestrictionWrapper permission="manage_store_admins">
                            <ActionButtonSmall onClick={() => handleOpenEditAdmin(adm)}>
                              Editar
                            </ActionButtonSmall>
                            <ActionButtonSmall
                              $variant="recovery"
                              onClick={() => handleSendRecoveryEmail(adm.id, adm.email)}
                              disabled={sendingRecoveryId === adm.id}
                            >
                              {sendingRecoveryId === adm.id ? 'Enviando...' : 'Recuperar Clave'}
                            </ActionButtonSmall>
                          </SystemRestrictionWrapper>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableContainer>
            )}
          </TabContent>
        )}

        {/* --- MODAL REGISTRAR CUENTA DE RETIRO --- */}
        {isAccountModalOpen && modalTarget && createPortal(
          <ModalOverlay onClick={() => setIsAccountModalOpen(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Registrar Cuenta de Retiro</ModalTitle>
                <CloseButton onClick={() => setIsAccountModalOpen(false)}>&times;</CloseButton>
              </ModalHeader>
              <Form onSubmit={handleAccountSubmit}>
                <InputGroup>
                  <Label htmlFor="acc-metodo">Método/Banco</Label>
                  <Select
                    id="acc-metodo"
                    value={accountForm.metodo}
                    onChange={e => setAccountForm({ ...accountForm, metodo: e.target.value })}
                  >
                    <option value="bancolombia">Bancolombia</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="pse_otro">Otro (PSE / ACH)</option>
                  </Select>
                </InputGroup>

                <InputGroup>
                  <Label htmlFor="acc-tipo">Tipo de Cuenta</Label>
                  <Select
                    id="acc-tipo"
                    value={accountForm.tipo_cuenta}
                    onChange={e => setAccountForm({ ...accountForm, tipo_cuenta: e.target.value as any })}
                  >
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                  </Select>
                </InputGroup>

                <InputGroup>
                  <Label htmlFor="acc-num">Número de Cuenta</Label>
                  <Input
                    id="acc-num"
                    value={accountForm.numero_cuenta}
                    onChange={e => setAccountForm({ ...accountForm, numero_cuenta: e.target.value })}
                    required
                  />
                </InputGroup>

                <InputGroup>
                  <Label htmlFor="acc-titular">Titular de la Cuenta</Label>
                  <Input
                    id="acc-titular"
                    value={accountForm.titular}
                    onChange={e => setAccountForm({ ...accountForm, titular: e.target.value })}
                    required
                  />
                </InputGroup>

                <InputGroup>
                  <Label htmlFor="acc-doc">Cédula o NIT del Titular</Label>
                  <Input
                    id="acc-doc"
                    value={accountForm.documento_cc}
                    onChange={e => setAccountForm({ ...accountForm, documento_cc: e.target.value })}
                    required
                  />
                </InputGroup>

                {accountForm.metodo === 'pse_otro' && (
                  <InputGroup>
                    <Label htmlFor="acc-code">Código ACH del Banco</Label>
                    <Input
                      id="acc-code"
                      placeholder="Ej: 1007"
                      value={accountForm.codigo_banco}
                      onChange={e => setAccountForm({ ...accountForm, codigo_banco: e.target.value })}
                    />
                  </InputGroup>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '15px 0' }}>
                  <input
                    type="checkbox"
                    id="acc-default"
                    checked={accountForm.is_default}
                    onChange={e => setAccountForm({ ...accountForm, is_default: e.target.checked })}
                  />
                  <Label htmlFor="acc-default" style={{ margin: 0, cursor: 'pointer' }}>Marcar como Principal</Label>
                </div>

                <SubmitButton type="submit" disabled={createAccountMutation.isPending}>
                  {createAccountMutation.isPending ? 'Guardando...' : 'Registrar Cuenta'}
                </SubmitButton>
              </Form>
            </ModalContent>
          </ModalOverlay>,
          modalTarget
        )}

        {/* --- MODAL EDITAR/CREAR ADMINISTRADOR DE SEDE --- */}
        {isAdminModalOpen && modalTarget && createPortal(
          <ModalOverlay onClick={() => setIsAdminModalOpen(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>{selectedAdmin ? 'Editar Administrador' : 'Añadir Administrador'}</ModalTitle>
                <CloseButton onClick={() => setIsAdminModalOpen(false)}>&times;</CloseButton>
              </ModalHeader>
              <Form onSubmit={handleAdminSubmit}>
                <InputGroup>
                  <Label htmlFor="adm-nombres">Nombres</Label>
                  <Input
                    id="adm-nombres"
                    value={adminForm.nombres}
                    onChange={e => setAdminForm({ ...adminForm, nombres: e.target.value })}
                    required
                  />
                </InputGroup>

                <InputGroup>
                  <Label htmlFor="adm-apellidos">Apellidos</Label>
                  <Input
                    id="adm-apellidos"
                    value={adminForm.apellidos}
                    onChange={e => setAdminForm({ ...adminForm, apellidos: e.target.value })}
                  />
                </InputGroup>

                <InputGroup>
                  <Label htmlFor="adm-email">Correo Electrónico</Label>
                  <Input
                    type="email"
                    id="adm-email"
                    value={adminForm.email}
                    onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                    disabled={!!selectedAdmin}
                    required
                  />
                </InputGroup>

                <InputGroup>
                  <Label htmlFor="adm-celular">Celular</Label>
                  <Input
                    id="adm-celular"
                    value={adminForm.celular}
                    onChange={e => setAdminForm({ ...adminForm, celular: e.target.value })}
                  />
                </InputGroup>

                {!selectedAdmin && (
                  <InputGroup>
                    <Label htmlFor="adm-pass">Contraseña Temporal</Label>
                    <Input
                      type="password"
                      id="adm-pass"
                      value={adminForm.password}
                      onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                      required
                    />
                  </InputGroup>
                )}

                <InputGroup>
                  <Label>Vincular a Sedes</Label>
                  {myStores && myStores.length > 0 ? (
                    <SedesSelectionBox>
                      {myStores.map((s: any) => (
                        <div key={s.id} className="store-checkbox" onClick={() => handleToggleStoreSelection(s.id)}>
                          <input
                            type="checkbox"
                            checked={adminForm.storeIds.includes(s.id)}
                            onChange={() => {}} // Manejado por el click en el div
                          />
                          <span>{s.nombre_sucursal}</span>
                        </div>
                      ))}
                    </SedesSelectionBox>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No hay sedes registradas para vincular.</p>
                  )}
                </InputGroup>

                <SubmitButton type="submit" disabled={saveAdminMutation.isPending}>
                  {saveAdminMutation.isPending ? 'Guardando...' : selectedAdmin ? 'Actualizar Datos' : 'Crear Administrador'}
                </SubmitButton>
              </Form>
            </ModalContent>
          </ModalOverlay>,
          modalTarget
        )}
      </ProfileContainer>
    </SystemRestrictionWrapper>
  );
}
