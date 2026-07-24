'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Container, Panel, PanelContent, ActionBtn,
  LoadingState, Spinner, ModalBackdrop, ModalCard, ModalHeader, ModalBody, ModalFooter,
  FormGroup, FormLabel, FormInput, SubmitBtn, CancelBtn
} from '../AdminDashboardStyles';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/constants';
import { useAlert } from '@/context/AlertContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { EmptyState } from '@/components/Common/EmptyState';
import { RegistrationRequest, Invitation } from './types';
import RequestFilters from './components/RequestFilters';
import RequestsTable from './components/RequestsTable';
import RequestDetailModal from './components/RequestDetailModal';

const TopToolsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 8px;
`;

const QuickToolCard = styled.div<{ $interactive?: boolean }>`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: ${props => props.$interactive ? 'pointer' : 'default'};

  &:hover {
    ${props => props.$interactive && `
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(72, 214, 76, 0.25);
      transform: translateY(-2px);
    `}
  }

  .tool-icon {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.35rem;
  }
  .tool-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    .tool-label { font-size: 9px; font-weight: 800; color: rgba(255, 255, 255, 0.3); text-transform: uppercase; }
    .tool-value { font-size: 1.05rem; font-weight: 800; color: #fff; }
  }
`;

const InviteGroupCard = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  overflow: hidden;

  .igc-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; cursor: pointer; gap: 12px; }
  .igc-left { display: flex; align-items: center; gap: 14px; flex: 1; }
  .igc-icon { width: 40px; height: 40px; background: rgba(99, 102, 241, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
  .igc-text { display: flex; flex-direction: column; gap: 3px; }
  .igc-name-row { display: flex; align-items: center; gap: 8px; }
  .igc-name { font-size: 0.95rem; font-weight: 700; color: #fff; }
  .igc-badge { font-size: 9px; padding: 3px 8px; border-radius: 6px; background: rgba(99, 102, 241, 0.1); color: #6366f1; }
  .igc-email { font-size: 0.8rem; color: rgba(255, 255, 255, 0.45); }
  .igc-right { display: flex; align-items: center; gap: 14px; }
  .igc-last-sent { font-size: 0.78rem; color: rgba(255, 255, 255, 0.3); font-weight: 600; }
  .igc-body { border-top: 1px solid rgba(255, 255, 255, 0.05); padding: 8px 20px 12px 20px; display: flex; flexDirection: column; gap: 4px; }
  .igc-attempt { display: flex; align-items: center; gap: 12px; padding: 6px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.02); }
  .igc-attempt-num { font-size: 0.72rem; font-weight: 800; color: rgba(99, 102, 241, 0.7); }
  .igc-attempt-date { font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); }
`;

export default function RegistrationRequestsPage() {
  const { showConfirm } = useAlert();
  const toast = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed' | 'invitations'>('pending');
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Filter states
  const [searchCommerce, setSearchCommerce] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modal and details state
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [checks, setChecks] = useState<Record<number, { logo: boolean; camara: boolean; rut: boolean; cedula: boolean }>>({});
  const [fieldChecks, setFieldChecks] = useState<Record<number, Record<string, boolean>>>({});
  const [systemNotes, setSystemNotes] = useState<Record<number, string>>({});

  // Invitation Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRazonSocial, setInviteRazonSocial] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [expandedInviteEmail, setExpandedInviteEmail] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const hasAccess = user?.permissions && user.permissions.includes('manage_registration_requests');

  useEffect(() => {
    (window as any).sendInfoRequestCallback = async (id: number, missingFields: string[]) => {
      try {
        const headers = getAuthHeaders();
        const notas_system = systemNotes[id] || '';
        await axios.post(`${API_URL}/api/manage/requests/${id}/send-info-request`, { missingFields, notas_system }, { headers });
        toast.success('Solicitud de información adicional enviada con éxito.');
        queryClient.invalidateQueries({ queryKey: ['allRequests'] });
        setSystemNotes(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
        setSelectedRequest(null);
        return true;
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al enviar la solicitud de información.');
        return false;
      }
    };
    return () => { delete (window as any).sendInfoRequestCallback; };
  }, [queryClient, toast, systemNotes]);

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/requests`, { headers, signal });
      return res.data;
    },
    enabled: !authLoading && !!user && hasAccess
  });

  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: ['sentInvitations'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/requests/invitations`, { headers, signal });
      return res.data;
    },
    enabled: !authLoading && !!user && hasAccess
  });

  const verifyProgressMutation = useMutation({
    mutationFn: async ({ id, fields, documents }: { id: number; fields: any; documents: any }) => {
      const headers = getAuthHeaders();
      return axios.patch(`${API_URL}/api/manage/requests/${id}/verify-progress`, { fields, documents }, { headers });
    },
    onError: () => toast.error('Error al guardar el progreso de verificación.')
  });

  const saveVerificationProgress = (reqId: number, updatedChecks: any, updatedFieldChecks: any) => {
    verifyProgressMutation.mutate({ id: reqId, fields: updatedFieldChecks, documents: updatedChecks });
  };

  useEffect(() => {
    if (requestsData) {
      setRequests(requestsData);
      const newChecks: any = {};
      const newFieldChecks: any = {};

      requestsData.forEach((req: any) => {
        let verified: any = null;
        if (req.verified_fields) {
          try { verified = typeof req.verified_fields === 'string' ? JSON.parse(req.verified_fields) : req.verified_fields; } catch (e) {}
        }
        newChecks[req.id] = { logo: !!verified?.documents?.logo, camara: !!verified?.documents?.camara, rut: !!verified?.documents?.rut, cedula: !!verified?.documents?.cedula };
        
        const fChecks: Record<string, boolean> = {};
        const fieldLabels = ['razon_social', 'nit', 'nit_dv', 'email_contacto', 'nombres_contacto', 'apellidos_contacto', 'celular_contacto', 'telefono', 'ciudad', 'direccion', 'descripcion'];
        fieldLabels.forEach(key => fChecks[key] = !!verified?.fields?.[key]);
        newFieldChecks[req.id] = fChecks;
      });

      setChecks(prev => ({ ...newChecks, ...prev }));
      setFieldChecks(prev => ({ ...newFieldChecks, ...prev }));
    }
  }, [requestsData]);

  useEffect(() => { if (invitationsData) setInvitations(invitationsData); }, [invitationsData]);
  useEffect(() => { setLoading(requestsLoading || invitationsLoading); }, [requestsLoading, invitationsLoading]);

  const toggleCheck = (requestId: number, checkType: 'logo' | 'camara' | 'rut' | 'cedula') => {
    setChecks(prev => {
      const reqChecks = prev[requestId] || { logo: false, camara: false, rut: false, cedula: false };
      const updated = { ...reqChecks, [checkType]: !reqChecks[checkType] };
      saveVerificationProgress(requestId, updated, fieldChecks[requestId] || {});
      return { ...prev, [requestId]: updated };
    });
  };

  const toggleFieldCheck = (requestId: number, fieldKey: string) => {
    setFieldChecks(prev => {
      const reqFieldChecks = prev[requestId] || {};
      const updated = { ...reqFieldChecks, [fieldKey]: !reqFieldChecks[fieldKey] };
      saveVerificationProgress(requestId, checks[requestId] || {}, updated);
      return { ...prev, [requestId]: updated };
    });
  };

  const isFullyChecked = (reqId: number) => {
    const docCh = checks[reqId] || { logo: false, camara: false, rut: false, cedula: false };
    const fCh = fieldChecks[reqId] || {};
    const fieldLabels = ['razon_social', 'nit', 'nit_dv', 'email_contacto', 'nombres_contacto', 'apellidos_contacto', 'celular_contacto', 'telefono', 'ciudad', 'direccion', 'descripcion'];
    
    return !!(docCh.logo && docCh.camara && docCh.rut && docCh.cedula) && fieldLabels.every(key => fCh[key]);
  };

  const requestMutation = useMutation({
    mutationFn: async ({ id, action, notas }: { id: number; action: 'approve' | 'reject'; notas: string }) => {
      const headers = getAuthHeaders();
      return action === 'approve' 
        ? axios.post(`${API_URL}/api/manage/requests/${id}/approve`, { notas_system: notas }, { headers })
        : axios.post(`${API_URL}/api/manage/requests/${id}/reject`, { notas_system: notas || 'Rechazado por administración matriz.' }, { headers });
    },
    onSuccess: (data, variables) => {
      toast.success(variables.action === 'approve' ? 'Solicitud aprobada con éxito.' : 'Solicitud rechazada con éxito.');
      queryClient.invalidateQueries({ queryKey: ['allRequests'] });
      setSystemNotes(prev => { const copy = { ...prev }; delete copy[variables.id]; return copy; });
      setSelectedRequest(null);
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Error al procesar la solicitud'),
    onSettled: () => setProcessingId(null)
  });

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    showConfirm({
      title: 'Confirmar Acción',
      message: action === 'approve' ? '¿Estás seguro de que deseas aprobar esta solicitud?' : '¿Estás seguro de que deseas rechazar esta solicitud?',
      confirmText: action === 'approve' ? 'Aprobar' : 'Rechazar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setProcessingId(id);
        requestMutation.mutate({ id, action, notas: systemNotes[id] || '' });
      }
    });
  };

  const openPreviewPopup = (requestId: number) => {
    const fCh = fieldChecks[requestId] || {};
    const docCh = checks[requestId] || { logo: false, camara: false, rut: false, cedula: false };
    
    const missingFields: string[] = [];
    const fieldLabels: Record<string, string> = {
      razon_social: 'Razón Social', nit: 'NIT', nit_dv: 'Dígito de Verificación (DV)',
      email_contacto: 'Correo Electrónico Corporativo', nombres_contacto: 'Nombres del Representante',
      apellidos_contacto: 'Apellidos del Representante', celular_contacto: 'Celular del Representante',
      telefono: 'Teléfono del Comercio', ciudad: 'Ciudad', direccion: 'Dirección Principal',
      descripcion: 'Descripción del Negocio'
    };

    Object.keys(fieldLabels).forEach(key => {
      if (!fCh[key]) missingFields.push(key);
    });

    if (!docCh.logo) missingFields.push('logo');
    if (!docCh.camara) missingFields.push('camara');
    if (!docCh.rut) missingFields.push('rut');
    if (!docCh.cedula) missingFields.push('cedula');

    if (missingFields.length === 0) {
      toast.error('No hay campos marcados como rechazados o pendientes para solicitar información.');
      return;
    }

    const previewUrl = `/admin/dashboard/requests/info-request-preview?id=${requestId}&fields=${encodeURIComponent(JSON.stringify(missingFields))}`;
    window.open(previewUrl, '_blank', 'toolbar=no,location=yes,status=no,menubar=no,scrollbars=yes,resizable=yes,width=800,height=900');
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRazonSocial) { toast.error('El correo y la razón social son obligatorios.'); return; }
    setSendingInvite(true);
    try {
      await axios.post(`${API_URL}/api/manage/requests/invite`, { email: inviteEmail, razon_social: inviteRazonSocial }, { headers: getAuthHeaders() });
      toast.success(`Invitación enviada con éxito a: ${inviteEmail}`);
      queryClient.invalidateQueries({ queryKey: ['sentInvitations'] });
      setShowInviteModal(false); setInviteEmail(''); setInviteRazonSocial('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al enviar invitación');
    } finally { setSendingInvite(false); }
  };

  const handleResendInvitation = async (id: number, email: string, razonSocial: string) => {
    setResendingId(id);
    try {
      await axios.post(`${API_URL}/api/manage/requests/invite`, { email, razon_social: razonSocial }, { headers: getAuthHeaders() });
      toast.success(`Invitación reenviada con éxito a: ${email}`);
      queryClient.invalidateQueries({ queryKey: ['sentInvitations'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al reenviar invitación');
    } finally {
      setResendingId(null);
    }
  };

  if (authLoading || loading) return <LoadingState><Spinner /> Cargando Solicitudes...</LoadingState>;
  if (!hasAccess) return <Container><div style={{ textAlign: 'center', padding: '4rem 2rem' }}><h2 style={{ color: '#ef4444' }}>Acceso Denegado</h2></div></Container>;

  let filteredRequests = requests.filter(req => {
    const isPending = req.estado === 'pendiente' || req.estado === 'espera_informacion' || !req.estado;
    if (activeTab === 'pending') return isPending;
    if (activeTab === 'processed') return req.estado === 'aprobado' || req.estado === 'rechazado';
    return false;
  });

  if (searchCommerce) {
    filteredRequests = filteredRequests.filter(req => req.razon_social.toLowerCase().includes(searchCommerce.toLowerCase()) || req.nit.includes(searchCommerce));
  }
  if (filterStatus) {
    filteredRequests = filteredRequests.filter(req => req.estado === filterStatus);
  }
  if (filterDate) {
    filteredRequests = filteredRequests.filter(req => req.created_at?.startsWith(filterDate));
  }

  const invitationGroups = (() => {
    const map = new Map<string, { email: string; razon_social: string; lastSentAt: string; attempts: Invitation[] }>();
    for (const inv of invitations) {
      if (!map.has(inv.email)) map.set(inv.email, { email: inv.email, razon_social: inv.razon_social, lastSentAt: inv.created_at, attempts: [] });
      const group = map.get(inv.email)!;
      group.attempts.push(inv);
      if (new Date(inv.created_at) > new Date(group.lastSentAt)) group.lastSentAt = inv.created_at;
    }
    return Array.from(map.values()).map(g => ({ ...g, attempts: [...g.attempts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) })).sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime());
  })();

  return (
    <Container>
      <TopToolsGrid>
        <QuickToolCard $interactive onClick={() => setShowInviteModal(true)}>
          <div className="tool-icon">📨</div>
          <div className="tool-info"><span className="tool-label">Herramienta Rapida</span><span className="tool-value">+ Enviar Invitacion</span></div>
        </QuickToolCard>
        <QuickToolCard $interactive onClick={() => { setActiveTab('pending'); }}>
          <div className="tool-icon">⏳</div>
          <div className="tool-info"><span className="tool-label">Por Auditar</span><span className="tool-value">{requests.filter(r => r.estado === 'pendiente' || r.estado === 'espera_informacion').length} Pendientes</span></div>
        </QuickToolCard>
        <QuickToolCard $interactive onClick={() => { setActiveTab('processed'); }}>
          <div className="tool-icon">✅</div>
          <div className="tool-info"><span className="tool-label">Historial Total</span><span className="tool-value">{requests.filter(r => r.estado === 'aprobado' || r.estado === 'rechazado').length} Procesadas</span></div>
        </QuickToolCard>
      </TopToolsGrid>

      <Panel>
        <RequestFilters 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          pendingCount={requests.filter(r => r.estado === 'pendiente' || r.estado === 'espera_informacion').length} 
          processedCount={requests.filter(r => r.estado === 'aprobado' || r.estado === 'rechazado').length} 
          invitationsCount={invitations.length} 
          searchCommerce={searchCommerce} setSearchCommerce={setSearchCommerce}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterDate={filterDate} setFilterDate={setFilterDate}
        />
        <PanelContent>
          {activeTab === 'invitations' ? (
            invitationGroups.length === 0 ? (
              <EmptyState icon="✉" message="No se han enviado invitaciones de registro." />
            ) : (
              invitationGroups.map((group) => {
                const isOpen = expandedInviteEmail === group.email;
                const latestAttempt = group.attempts[0];
                return (
                  <InviteGroupCard key={group.email}>
                    <div className="igc-header" onClick={() => setExpandedInviteEmail(isOpen ? null : group.email)}>
                      <div className="igc-left">
                        <div className="igc-icon">📨</div>
                        <div className="igc-text">
                          <div className="igc-name-row"><span className="igc-name">{group.razon_social}</span><span className="igc-badge">{group.attempts.length} {group.attempts.length === 1 ? 'envío' : 'envíos'}</span></div>
                          <span className="igc-email">{group.email}</span>
                        </div>
                      </div>
                      <div className="igc-right">
                        <span className="igc-last-sent">Último: {new Date(group.lastSentAt).toLocaleString('es-CO')}</span>
                        <ActionBtn
                          $variant="approve"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)', padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                          disabled={resendingId === latestAttempt.id}
                          onClick={(e) => { e.stopPropagation(); handleResendInvitation(latestAttempt.id, group.email, group.razon_social); }}
                        >
                          {resendingId === latestAttempt.id ? 'Reenviando...' : 'Reenviar'}
                        </ActionBtn>
                        <span className="igc-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>&#9660;</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="igc-body">
                        {group.attempts.map((att, idx) => (
                          <div key={att.id} className={`igc-attempt${idx === 0 ? ' latest' : ''}`}>
                            <span className="igc-attempt-num">#{group.attempts.length - idx}</span>
                            <span className="igc-attempt-date">{new Date(att.created_at).toLocaleString('es-CO')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </InviteGroupCard>
                );
              })
            )
          ) : (
            <RequestsTable 
              requests={filteredRequests} 
              activeTab={activeTab} 
              onViewDetails={setSelectedRequest} 
            />
          )}
        </PanelContent>
      </Panel>

      {selectedRequest && (
        <RequestDetailModal 
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          activeTab={activeTab === 'pending' ? 'pending' : 'processed'}
          checks={checks[selectedRequest.id] || { logo: false, camara: false, rut: false, cedula: false }}
          fieldChecks={fieldChecks[selectedRequest.id] || {}}
          systemNote={systemNotes[selectedRequest.id] || ''}
          setSystemNote={(note) => setSystemNotes(prev => ({ ...prev, [selectedRequest.id]: note }))}
          onToggleCheck={(type) => toggleCheck(selectedRequest.id, type as any)}
          onToggleFieldCheck={(field) => toggleFieldCheck(selectedRequest.id, field)}
          onApprove={() => handleAction(selectedRequest.id, 'approve')}
          onReject={() => handleAction(selectedRequest.id, 'reject')}
          onInfoRequest={() => openPreviewPopup(selectedRequest.id)}
          isFullyChecked={isFullyChecked(selectedRequest.id)}
          processingId={processingId}
        />
      )}

      {showInviteModal && (
        <ModalBackdrop onClick={() => setShowInviteModal(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Enviar Invitación de Registro</h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </ModalHeader>
            <form onSubmit={handleSendInvitation}>
              <ModalBody>
                <FormGroup>
                  <FormLabel>Razón Social del Comercio</FormLabel>
                  <FormInput type="text" required placeholder="Ej. Hamburguesas El Corral S.A.S." value={inviteRazonSocial} onChange={(e) => setInviteRazonSocial(e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Correo Electrónico de Contacto</FormLabel>
                  <FormInput type="email" required placeholder="Ej. contacto@elcorral.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <CancelBtn type="button" onClick={() => setShowInviteModal(false)}>Cancelar</CancelBtn>
                <SubmitBtn type="submit" disabled={sendingInvite}>{sendingInvite ? <Spinner /> : 'Enviar Invitación'}</SubmitBtn>
              </ModalFooter>
            </form>
          </ModalCard>
        </ModalBackdrop>
      )}
    </Container>
  );
}
