'use client';

import React, { useState, useEffect } from 'react';
import {
  Container, HeaderSection, Panel, PanelTabs, Tab,
  PanelContent, RequestList, RequestItem, TypeBadge, ActionBtn,
  LoadingState, Spinner, RequestAccordionDetails, DocumentGrid, DocumentCard, DocTitle, DocViewerBtn,
  CheckList, CheckItem, CheckInput, SystemNotesWrapper, SystemNotesTextarea,
  ModalBackdrop, ModalCard, ModalHeader, ModalBody, ModalFooter,
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
import styled from 'styled-components';

interface RegistrationRequest {
  id: number;
  tipo_solicitud: 'commerce' | 'delivery_company';
  nit: string;
  nit_dv?: string;
  razon_social: string;
  email_contacto: string;
  nombres_contacto: string;
  apellidos_contacto: string;
  celular_contacto: string;
  telefono?: string;
  ciudad?: string;
  direccion?: string;
  descripcion?: string;
  logo_url?: string;
  documento_camara_comercio?: string;
  documento_rut?: string;
  documento_cedula?: string;
  documento_cedula_frente?: string;
  documento_cedula_dorso?: string;
  created_at?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'espera_informacion';
  notas_system?: string;
  updated_at?: string;
}

const CompactDocumentCard = styled(DocumentCard)`
  padding: 16px;
  gap: 12px;
  min-height: unset;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const eventLabels: Record<string, string> = {
  SUBMIT_REGISTRATION_REQUEST: 'Solicitud Creada',
  REQUEST_MORE_INFORMATION: 'Corrección Solicitada',
  SUBMIT_CORRECTIONS: 'Corrección Recibida',
  APPROVE_REGISTRATION_REQUEST: 'Solicitud Aprobada',
  REJECT_REGISTRATION_REQUEST: 'Solicitud Rechazada',
  EMAIL_DELIVERY_FAILURE: 'Fallo Envío Correo'
};

const getEventBadgeStyle = (eventType: string) => {
  switch (eventType) {
    case 'SUBMIT_REGISTRATION_REQUEST':
      return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
    case 'REQUEST_MORE_INFORMATION':
      return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' };
    case 'SUBMIT_CORRECTIONS':
      return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
    case 'APPROVE_REGISTRATION_REQUEST':
      return { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    case 'REJECT_REGISTRATION_REQUEST':
      return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
    case 'EMAIL_DELIVERY_FAILURE':
      return { background: 'rgba(239, 68, 68, 0.1)', color: '#f59e0b', border: '1px solid rgba(239, 68, 68, 0.2)' };
    default:
      return { background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)' };
  }
};

const AuditTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;

  th, td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  th {
    background: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

interface Invitation {
  id: number;
  email: string;
  razon_social: string;
  created_at: string;
}

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
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: ${props => props.$interactive ? 'pointer' : 'default'};

  &:hover {
    ${props => props.$interactive && `
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(72, 214, 76, 0.25);
      transform: translateY(-2px);
      box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.5);
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
    
    .tool-label {
      font-size: 9px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    
    .tool-value {
      font-size: 1.05rem;
      font-weight: 800;
      color: #fff;
    }
  }

  .dot-pulse {
    width: 8px;
    height: 8px;
    background: var(--emerald);
    border-radius: 50%;
    box-shadow: 0 0 10px var(--emerald);
    position: absolute;
    top: 20px;
    right: 20px;
  }
`;

const StatusBadge = styled.span`
  font-size: 9px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  &.aprobado {
    background: rgba(72, 214, 76, 0.1);
    color: var(--emerald);
    border: 1px solid rgba(72, 214, 76, 0.2);
  }
  
  &.rechazado {
    background: rgba(255, 95, 95, 0.1);
    color: #ff5f5f;
    border: 1px solid rgba(255, 95, 95, 0.2);
  }
`;

const InviteGroupCard = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  overflow: hidden;
  transition: border-color 0.25s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.2);
  }

  .igc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    cursor: pointer;
    gap: 12px;
    user-select: none;
  }

  .igc-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
  }

  .igc-icon {
    width: 40px;
    height: 40px;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .igc-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .igc-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .igc-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .igc-badge {
    font-size: 9px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    border: 1px solid rgba(99, 102, 241, 0.2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .igc-email {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.45);
  }

  .igc-right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }

  .igc-last-sent {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.3);
    font-weight: 600;
    white-space: nowrap;
  }

  .igc-chevron {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.3);
    transition: transform 0.3s ease;
    display: inline-block;
  }

  .igc-body {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding: 8px 20px 12px 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .igc-attempt {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
  }

  .igc-attempt.latest {
    background: rgba(99, 102, 241, 0.07);
  }

  .igc-attempt-num {
    font-size: 0.72rem;
    font-weight: 800;
    color: rgba(99, 102, 241, 0.7);
    min-width: 24px;
  }

  .igc-attempt-date {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const fieldLabels: Record<string, string> = {
  razon_social: 'Razón Social',
  nit: 'NIT',
  nit_dv: 'Dígito de Verificación (DV)',
  email_contacto: 'Correo Electrónico Corporativo',
  nombres_contacto: 'Nombres del Representante',
  apellidos_contacto: 'Apellidos del Representante',
  celular_contacto: 'Celular del Representante',
  telefono: 'Teléfono del Comercio',
  ciudad: 'Ciudad',
  direccion: 'Dirección Principal',
  descripcion: 'Descripción del Negocio'
};

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

  // Expanded request, verification checks and notes
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const [checks, setChecks] = useState<Record<number, { logo: boolean; camara: boolean; rut: boolean; cedula: boolean }>>({});
  const [fieldChecks, setFieldChecks] = useState<Record<number, Record<string, boolean>>>({});
  const [systemNotes, setSystemNotes] = useState<Record<number, string>>({});

  // Invitation Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRazonSocial, setInviteRazonSocial] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [expandedInviteEmail, setExpandedInviteEmail] = useState<string | null>(null);

  const hasAccess = user?.permissions && user.permissions.includes('manage_registration_requests');

  // Register window callback to allow send-info-request from preview popup
  useEffect(() => {
    (window as any).sendInfoRequestCallback = async (id: number, missingFields: string[]) => {
      try {
        const headers = getAuthHeaders();
        const notas_system = systemNotes[id] || '';
        await axios.post(
          `${API_URL}/api/manage/requests/${id}/send-info-request`,
          { missingFields, notas_system },
          { headers }
        );
        toast.success('Solicitud de información adicional enviada con éxito.');
        queryClient.invalidateQueries({ queryKey: ['allRequests'] });
        setSystemNotes(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        return true;
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al enviar la solicitud de información.');
        return false;
      }
    };
    return () => {
      delete (window as any).sendInfoRequestCallback;
    };
  }, [queryClient, toast, systemNotes]);

  // TanStack Query: Lectura de Todas las Solicitudes
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/requests`, { headers, signal });
      return res.data;
    },
    enabled: !authLoading && !!user && hasAccess
  });

  // TanStack Query: Lectura de Invitaciones Enviadas
  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: ['sentInvitations'],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/requests/invitations`, { headers, signal });
      return res.data;
    },
    enabled: !authLoading && !!user && hasAccess
  });

  // TanStack Query: Historial de Auditoría de la Solicitud Expandida
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['requestHistory', expandedRequestId],
    queryFn: async ({ signal }) => {
      if (!expandedRequestId) return [];
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/requests/${expandedRequestId}/history`, { headers, signal });
      return res.data;
    },
    enabled: expandedRequestId !== null
  });

  const verifyProgressMutation = useMutation({
    mutationFn: async ({ id, fields, documents }: { id: number; fields: any; documents: any }) => {
      const headers = getAuthHeaders();
      return axios.patch(`${API_URL}/api/manage/requests/${id}/verify-progress`, { fields, documents }, { headers });
    },
    onError: (error: any) => {
      toast.error('Error al guardar el progreso de verificación.');
    }
  });

  const saveVerificationProgress = (reqId: number, updatedChecks: any, updatedFieldChecks: any) => {
    verifyProgressMutation.mutate({
      id: reqId,
      fields: updatedFieldChecks,
      documents: updatedChecks
    });
  };

  useEffect(() => {
    if (requestsData) {
      setRequests(requestsData);

      const newChecks: Record<number, { logo: boolean; camara: boolean; rut: boolean; cedula: boolean }> = {};
      const newFieldChecks: Record<number, Record<string, boolean>> = {};

      requestsData.forEach((req: any) => {
        let verified: any = null;
        if (req.verified_fields) {
          try {
            verified = typeof req.verified_fields === 'string' ? JSON.parse(req.verified_fields) : req.verified_fields;
          } catch (e) {
            console.error('Error parsing verified_fields JSON:', e);
          }
        }

        newChecks[req.id] = {
          logo: !!verified?.documents?.logo,
          camara: !!verified?.documents?.camara,
          rut: !!verified?.documents?.rut,
          cedula: !!verified?.documents?.cedula
        };

        const fChecks: Record<string, boolean> = {};
        Object.keys(fieldLabels).forEach((key) => {
          fChecks[key] = !!verified?.fields?.[key];
        });
        newFieldChecks[req.id] = fChecks;
      });

      setChecks(prev => ({ ...newChecks, ...prev }));
      setFieldChecks(prev => ({ ...newFieldChecks, ...prev }));
    }
  }, [requestsData]);

  useEffect(() => {
    if (invitationsData) {
      setInvitations(invitationsData);
    }
  }, [invitationsData]);

  useEffect(() => {
    setLoading(requestsLoading || invitationsLoading);
  }, [requestsLoading, invitationsLoading]);

  const toggleCheck = (requestId: number, checkType: 'logo' | 'camara' | 'rut' | 'cedula') => {
    setChecks(prev => {
      const reqChecks = prev[requestId] || { logo: false, camara: false, rut: false, cedula: false };
      const updated = {
        ...reqChecks,
        [checkType]: !reqChecks[checkType]
      };
      
      const fCh = fieldChecks[requestId] || {
        razon_social: false, nit: false, nit_dv: false, email_contacto: false,
        nombres_contacto: false, apellidos_contacto: false, celular_contacto: false,
        telefono: false, ciudad: false, direccion: false, descripcion: false
      };
      saveVerificationProgress(requestId, updated, fCh);

      return {
        ...prev,
        [requestId]: updated
      };
    });
  };

  const getMissingFields = (reqId: number) => {
    const missing: string[] = [];

    const fCh = fieldChecks[reqId] || {
      razon_social: false, nit: false, nit_dv: false, email_contacto: false,
      nombres_contacto: false, apellidos_contacto: false, celular_contacto: false,
      telefono: false, ciudad: false, direccion: false, descripcion: false
    };
    Object.keys(fieldLabels).forEach((key) => {
      if (!fCh[key]) {
        missing.push(key);
      }
    });

    const docCh = checks[reqId] || { logo: false, camara: false, rut: false, cedula: false };
    if (!docCh.logo) missing.push('logo');
    if (!docCh.camara) missing.push('camara');
    if (!docCh.rut) missing.push('rut');
    if (!docCh.cedula) missing.push('cedula');

    return missing;
  };

  const isFullyChecked = (reqId: number) => {
    const docCh = checks[reqId] || { logo: false, camara: false, rut: false, cedula: false };
    const docsOk = !!(docCh.logo && docCh.camara && docCh.rut && docCh.cedula);

    const fCh = fieldChecks[reqId] || {
      razon_social: false, nit: false, nit_dv: false, email_contacto: false,
      nombres_contacto: false, apellidos_contacto: false, celular_contacto: false,
      telefono: false, ciudad: false, direccion: false, descripcion: false
    };
    const fieldsOk = !!(
      fCh.razon_social && fCh.nit && fCh.nit_dv && fCh.email_contacto &&
      fCh.nombres_contacto && fCh.apellidos_contacto && fCh.celular_contacto &&
      fCh.telefono && fCh.ciudad && fCh.direccion && fCh.descripcion
    );

    return docsOk && fieldsOk;
  };

  // TanStack Query: Mutación para Aprobar/Rechazar Solicitud
  const requestMutation = useMutation({
    mutationFn: async ({ id, action, notas }: { id: number; action: 'approve' | 'reject'; notas: string }) => {
      const headers = getAuthHeaders();
      if (action === 'approve') {
        return axios.post(`${API_URL}/api/manage/requests/${id}/approve`, { notas_system: notas }, { headers });
      } else {
        return axios.post(`${API_URL}/api/manage/requests/${id}/reject`, { notas_system: notas || 'Rechazado por administración matriz.' }, { headers });
      }
    },
    onSuccess: (data, variables) => {
      toast.success(variables.action === 'approve' ? 'Solicitud aprobada con éxito.' : 'Solicitud rechazada con éxito.');
      queryClient.invalidateQueries({ queryKey: ['allRequests'] });
      setSystemNotes(prev => {
        const copy = { ...prev };
        delete copy[variables.id];
        return copy;
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al procesar la solicitud');
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    const confirmMsg = action === 'approve' 
      ? '¿Estás seguro de que deseas aprobar esta solicitud? Se creará la cuenta y entidad correspondientes.' 
      : '¿Estás seguro de que deseas rechazar esta solicitud?';

    showConfirm({
      title: 'Confirmar Acción',
      message: confirmMsg,
      confirmText: action === 'approve' ? 'Aprobar' : 'Rechazar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setProcessingId(id);
        const notas = systemNotes[id] || '';
        requestMutation.mutate({ id, action, notas });
      }
    });
  };

  const openDocumentPopup = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'toolbar=no,location=yes,status=no,menubar=no,scrollbars=yes,resizable=yes,width=800,height=900');
  };

  const openPreviewPopup = async (reqId: number) => {
    const missingFields = getMissingFields(reqId);
    if (missingFields.length === 0) {
      toast.error('Todos los campos y documentos están aprobados. No es posible solicitar información adicional.');
      return;
    }

    try {
      const headers = getAuthHeaders();
      const res = await axios.post(
        `${API_URL}/api/manage/requests/${reqId}/info-token-preview`,
        { missingFields },
        { headers }
      );

      const { subject, html_body } = res.data;

      const popup = window.open('', '_blank', 'toolbar=no,location=yes,status=no,menubar=no,scrollbars=yes,resizable=yes,width=800,height=900');
      if (!popup) {
        toast.error('El navegador bloqueó la ventana emergente de previsualización. Habilita las ventanas emergentes.');
        return;
      }

      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Previsualizar Correo - Bienestar Digital</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #0b0f19;
              color: #f1f5f9;
            }
            .header-bar {
              position: sticky;
              top: 0;
              background: #111827;
              border-bottom: 1px solid #1f2937;
              padding: 16px 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              z-index: 1000;
            }
            .title {
              font-size: 1.1rem;
              font-weight: 700;
              color: #ffffff;
            }
            .subtitle {
              font-size: 0.85rem;
              color: #9ca3af;
              margin-top: 4px;
            }
            .btn-send {
              background-color: #10b981;
              color: #000000;
              border: none;
              padding: 10px 20px;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
              font-size: 0.9rem;
              transition: background-color 0.2s;
            }
            .btn-send:hover {
              background-color: #059669;
            }
            .btn-send:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            .email-meta {
              background: #1e293b;
              padding: 16px 24px;
              border-bottom: 1px solid #334155;
              font-size: 0.9rem;
            }
            .meta-row {
              margin-bottom: 8px;
            }
            .meta-label {
              font-weight: bold;
              color: #94a3b8;
              display: inline-block;
              width: 80px;
            }
            .preview-container {
              padding: 30px;
              display: flex;
              justify-content: center;
            }
            .preview-frame {
              width: 100%;
              max-width: 600px;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              color: #1e293b;
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div class="title">Previsualizar Correo de Solicitud de Información</div>
              <div class="subtitle">Verifica el contenido antes de enviar al cliente</div>
            </div>
            <button id="sendBtn" class="btn-send">Enviar Correo</button>
          </div>
          <div class="email-meta">
            <div class="meta-row">
              <span class="meta-label">Asunto:</span>
              <span style="font-weight: 600;">${subject}</span>
            </div>
          </div>
          <div class="preview-container">
            <div class="preview-frame">
              ${html_body}
            </div>
          </div>
          <script>
            document.getElementById('sendBtn').addEventListener('click', async () => {
              const btn = document.getElementById('sendBtn');
              btn.disabled = true;
              btn.innerText = 'Enviando...';
              
              try {
                const success = await window.opener.sendInfoRequestCallback(${reqId}, ${JSON.stringify(missingFields)});
                if (success) {
                  window.close();
                } else {
                  btn.disabled = false;
                  btn.innerText = 'Enviar Correo';
                }
              } catch (err) {
                console.error(err);
                alert('Error al enviar la solicitud: ' + err.message);
                btn.disabled = false;
                btn.innerText = 'Enviar Correo';
              }
            });
          </script>
        </body>
        </html>
      `);
      popup.document.close();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al obtener la previsualización del correo.');
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRazonSocial) {
      toast.error('El correo y la razón social son obligatorios.');
      return;
    }

    setSendingInvite(true);
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/api/manage/requests/invite`, {
        email: inviteEmail,
        razon_social: inviteRazonSocial
      }, { headers });
      
      toast.success(`Invitación enviada con éxito a: ${inviteEmail}`);
      queryClient.invalidateQueries({ queryKey: ['sentInvitations'] });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRazonSocial('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al enviar invitación por correo');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendInvitation = async (id: number, email: string, razonSocial: string) => {
    setResendingId(id);
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/api/manage/requests/invite`, {
        email,
        razon_social: razonSocial
      }, { headers });
      
      toast.success(`Invitación reenviada con éxito a: ${email}`);
      queryClient.invalidateQueries({ queryKey: ['sentInvitations'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al reenviar invitación por correo');
    } finally {
      setResendingId(null);
    }
  };

  if (authLoading || loading) {
    return <LoadingState><Spinner /> Cargando Solicitudes...</LoadingState>;
  }

  if (!hasAccess) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,0,0,0.03)', border: '1px solid rgba(255,0,0,0.1)', borderRadius: '12px' }}>
          <h2 style={{ color: '#ef4444' }}>Acceso Denegado</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>No posees el permiso `manage_registration_requests` requerido para gestionar solicitudes de afiliación.</p>
        </div>
      </Container>
    );
  }

  // Filtrar según estado (incluyendo espera_informacion en pending)
  const pendingRequests = requests.filter(req => req.estado === 'pendiente' || req.estado === 'espera_informacion' || !req.estado);
  const processedRequests = requests.filter(req => req.estado === 'aprobado' || req.estado === 'rechazado');
  const activeRequestsList = activeTab === 'pending' ? pendingRequests : processedRequests;

  // Agrupar invitaciones por email, ordenadas por último envío (más reciente primero)
  const invitationGroups = (() => {
    const map = new Map<string, { email: string; razon_social: string; lastSentAt: string; attempts: Invitation[] }>();
    for (const inv of invitations) {
      if (!map.has(inv.email)) {
        map.set(inv.email, { email: inv.email, razon_social: inv.razon_social, lastSentAt: inv.created_at, attempts: [] });
      }
      const group = map.get(inv.email)!;
      group.attempts.push(inv);
      if (new Date(inv.created_at) > new Date(group.lastSentAt)) {
        group.lastSentAt = inv.created_at;
      }
    }
    return Array.from(map.values())
      .map(g => ({ ...g, attempts: [...g.attempts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) }))
      .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime());
  })();

  const getCardBorderStyle = (estado?: string) => {
    if (activeTab !== 'pending') return undefined;
    if (estado === 'espera_informacion') {
      return {
        border: '1px solid #3b82f6',
        boxShadow: '0 0 10px rgba(59, 130, 246, 0.15)',
        background: 'rgba(59, 130, 246, 0.01)'
      };
    }
    return {
      border: '1px solid #ef4444',
      boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)',
      background: 'rgba(239, 68, 68, 0.01)'
    };
  };

  return (
    <Container>
      {/* Herramientas Rapidas en la parte superior como tarjetas pequeñas */}
      <TopToolsGrid>
        <QuickToolCard $interactive={true} onClick={() => setShowInviteModal(true)}>
          <div className="tool-icon">📨</div>
          <div className="tool-info">
            <span className="tool-label">Herramienta Rapida</span>
            <span className="tool-value">+ Enviar Invitacion</span>
          </div>
        </QuickToolCard>

        <QuickToolCard $interactive={true} onClick={() => {
          const url = `${window.location.origin}/registro-solicitud`;
          navigator.clipboard.writeText(url).then(() => toast.success('Enlace copiado al portapapeles.'));
        }}>
          <div className="tool-icon">🔗</div>
          <div className="tool-info">
            <span className="tool-label">Herramienta Rapida</span>
            <span className="tool-value">Copiar Enlace</span>
          </div>
        </QuickToolCard>

        <QuickToolCard>
          <div className="tool-icon">📡</div>
          <div className="tool-info">
            <span className="tool-label">Estado de Nodo</span>
            <span className="tool-value">Soporte Bogota</span>
          </div>
          <div className="dot-pulse" />
        </QuickToolCard>

        <QuickToolCard $interactive={true} onClick={() => { setActiveTab('pending'); setExpandedRequestId(null); }}>
          <div className="tool-icon">⏳</div>
          <div className="tool-info">
            <span className="tool-label">Por Auditar</span>
            <span className="tool-value">{pendingRequests.length} Pendientes</span>
          </div>
        </QuickToolCard>

        <QuickToolCard $interactive={true} onClick={() => { setActiveTab('processed'); setExpandedRequestId(null); }}>
          <div className="tool-icon">✅</div>
          <div className="tool-info">
            <span className="tool-label">Historial Total</span>
            <span className="tool-value">{processedRequests.length} Procesadas</span>
          </div>
        </QuickToolCard>
      </TopToolsGrid>

      {/* Panel de Solicitudes */}
      <Panel>
        <PanelTabs>
          <Tab $active={activeTab === 'pending'} onClick={() => { setActiveTab('pending'); setExpandedRequestId(null); }}>
            Solicitudes Pendientes ({pendingRequests.length})
          </Tab>
          <Tab $active={activeTab === 'processed'} onClick={() => { setActiveTab('processed'); setExpandedRequestId(null); }}>
            Solicitudes Procesadas ({processedRequests.length})
          </Tab>
          <Tab $active={activeTab === 'invitations'} onClick={() => { setActiveTab('invitations'); setExpandedRequestId(null); }}>
            Invitaciones Enviadas ({invitations.length})
          </Tab>
        </PanelTabs>

        <PanelContent>
          <RequestList>
            {activeTab === 'invitations' ? (
              invitationGroups.length === 0 ? (
                <EmptyState
                  icon="✉"
                  message="No se han enviado invitaciones de registro."
                />
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
                            <div className="igc-name-row">
                              <span className="igc-name">{group.razon_social}</span>
                              <span className="igc-badge">{group.attempts.length} {group.attempts.length === 1 ? 'envío' : 'envíos'}</span>
                            </div>
                            <span className="igc-email">{group.email}</span>
                          </div>
                        </div>
                        <div className="igc-right">
                          <span className="igc-last-sent">{'Último: '}{new Date(group.lastSentAt).toLocaleString('es-CO')}</span>
                          <ActionBtn
                            $variant="approve"
                            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)', padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                            disabled={resendingId === latestAttempt.id}
                            onClick={(e) => { e.stopPropagation(); handleResendInvitation(latestAttempt.id, group.email, group.razon_social); }}
                          >
                            {resendingId === latestAttempt.id ? 'Reenviando...' : 'Reenviar'}
                          </ActionBtn>
                          <span className="igc-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>&#9660;</span>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="igc-body">
                          {group.attempts.map((att, idx) => (
                            <div key={att.id} className={`igc-attempt${idx === 0 ? ' latest' : ''}`}>
                              <span className="igc-attempt-num">#{idx + 1}</span>
                              <span className="igc-attempt-date">{new Date(att.created_at).toLocaleString('es-CO')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </InviteGroupCard>
                  );
                })
              )
            ) : activeRequestsList.length === 0 ? (
              <EmptyState
                icon="✔"
                message={activeTab === 'pending' ? "Todo al día. No hay solicitudes de registro pendientes." : "No hay registro de solicitudes procesadas en el historial."}
              />
            ) : (
              activeRequestsList.map((req) => {
                const isExpanded = expandedRequestId === req.id;
                return (
                  <RequestItem 
                    key={req.id} 
                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px', ...getCardBorderStyle(req.estado) }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div 
                        className="b-info"
                        style={{ cursor: 'pointer', flex: 1 }}
                        onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                      >
                        <div className="b-logo">
                          {req.tipo_solicitud === 'commerce' ? '🏪' : '🛵'}
                        </div>
                        <div className="b-text">
                          <div className="b-name-row">
                            <p className="b-name">{req.razon_social}</p>
                            <TypeBadge className={req.tipo_solicitud}>
                              {req.tipo_solicitud === 'commerce' ? 'Comercio' : 'Mensajería'}
                            </TypeBadge>
                            {req.estado && req.estado !== 'pendiente' && (
                              <StatusBadge 
                                className={req.estado}
                                style={{
                                  background: req.estado === 'espera_informacion' ? 'rgba(59, 130, 246, 0.1)' : undefined,
                                  color: req.estado === 'espera_informacion' ? '#3b82f6' : undefined,
                                  borderColor: req.estado === 'espera_informacion' ? 'rgba(59, 130, 246, 0.2)' : undefined,
                                }}
                              >
                                {req.estado === 'aprobado' ? 'Aprobado' : req.estado === 'rechazado' ? 'Rechazado' : 'Espera Info'}
                              </StatusBadge>
                            )}
                          </div>
                          <p className="b-desc">
                            NIT: {req.nit} {req.nit_dv ? ` - ${req.nit_dv}` : ''} | Contacto: {req.nombres_contacto} {req.apellidos_contacto}
                          </p>
                          <p className="b-contact-info">
                            Correo: {req.email_contacto} | Celular: {req.celular_contacto}
                          </p>
                        </div>
                      </div>
                      <div className="b-actions" style={{ marginLeft: '16px' }}>
                         <ActionBtn
                           $variant="approve"
                           style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                           onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                         >
                           {isExpanded ? 'Cerrar' : activeTab === 'pending' ? 'Auditar' : 'Detalles'}
                         </ActionBtn>
                      </div>
                    </div>

                    {isExpanded && (
                      <RequestAccordionDetails>
                        <DocumentGrid style={{ marginBottom: '24px' }}>
                          <CompactDocumentCard>
                            <DocTitle>Logo del Comercio</DocTitle>
                            {req.logo_url ? (
                              <>
                                <DocViewerBtn 
                                  href="#" 
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    openDocumentPopup(req.logo_url || ''); 
                                  }}
                                >
                                  Ver Logo
                                </DocViewerBtn>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                                  <input
                                    type="checkbox"
                                    id={`check-logo-${req.id}`}
                                    style={{ width: '16px', height: '16px', cursor: activeTab === 'pending' ? 'pointer' : 'default' }}
                                    checked={activeTab === 'pending' ? !!checks[req.id]?.logo : req.estado === 'aprobado'}
                                    onChange={() => {
                                      if (activeTab === 'pending') {
                                        toggleCheck(req.id, 'logo');
                                      }
                                    }}
                                    disabled={activeTab !== 'pending'}
                                  />
                                  <label 
                                    htmlFor={`check-logo-${req.id}`} 
                                    style={{ 
                                      fontSize: '0.8rem', 
                                      color: (activeTab === 'pending' ? !!checks[req.id]?.logo : req.estado === 'aprobado') ? '#10b981' : 'rgba(255, 255, 255, 0.6)', 
                                      cursor: activeTab === 'pending' ? 'pointer' : 'default',
                                      fontWeight: (activeTab === 'pending' ? !!checks[req.id]?.logo : req.estado === 'aprobado') ? 'bold' : 'normal',
                                      userSelect: 'none' 
                                    }}
                                  >
                                    Verificado
                                  </label>
                                </div>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>No cargado</span>
                            )}
                          </CompactDocumentCard>

                          <CompactDocumentCard>
                            <DocTitle>Cámara de Comercio</DocTitle>
                            {req.documento_camara_comercio ? (
                              <>
                                <DocViewerBtn 
                                  href="#" 
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    openDocumentPopup(req.documento_camara_comercio || ''); 
                                  }}
                                >
                                  Ver CC
                                </DocViewerBtn>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                                  <input
                                    type="checkbox"
                                    id={`check-camara-${req.id}`}
                                    style={{ width: '16px', height: '16px', cursor: activeTab === 'pending' ? 'pointer' : 'default' }}
                                    checked={activeTab === 'pending' ? !!checks[req.id]?.camara : req.estado === 'aprobado'}
                                    onChange={() => {
                                      if (activeTab === 'pending') {
                                        toggleCheck(req.id, 'camara');
                                      }
                                    }}
                                    disabled={activeTab !== 'pending'}
                                  />
                                  <label 
                                    htmlFor={`check-camara-${req.id}`} 
                                    style={{ 
                                      fontSize: '0.8rem', 
                                      color: (activeTab === 'pending' ? !!checks[req.id]?.camara : req.estado === 'aprobado') ? '#10b981' : 'rgba(255, 255, 255, 0.6)', 
                                      cursor: activeTab === 'pending' ? 'pointer' : 'default',
                                      fontWeight: (activeTab === 'pending' ? !!checks[req.id]?.camara : req.estado === 'aprobado') ? 'bold' : 'normal',
                                      userSelect: 'none' 
                                    }}
                                  >
                                    Verificado
                                  </label>
                                </div>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>No cargado</span>
                            )}
                          </CompactDocumentCard>

                          <CompactDocumentCard>
                            <DocTitle>RUT</DocTitle>
                            {req.documento_rut ? (
                              <>
                                <DocViewerBtn 
                                  href="#" 
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    openDocumentPopup(req.documento_rut || ''); 
                                  }}
                                >
                                  Ver RUT
                                </DocViewerBtn>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                                  <input
                                    type="checkbox"
                                    id={`check-rut-${req.id}`}
                                    style={{ width: '16px', height: '16px', cursor: activeTab === 'pending' ? 'pointer' : 'default' }}
                                    checked={activeTab === 'pending' ? !!checks[req.id]?.rut : req.estado === 'aprobado'}
                                    onChange={() => {
                                      if (activeTab === 'pending') {
                                        toggleCheck(req.id, 'rut');
                                      }
                                    }}
                                    disabled={activeTab !== 'pending'}
                                  />
                                  <label 
                                    htmlFor={`check-rut-${req.id}`} 
                                    style={{ 
                                      fontSize: '0.8rem', 
                                      color: (activeTab === 'pending' ? !!checks[req.id]?.rut : req.estado === 'aprobado') ? '#10b981' : 'rgba(255, 255, 255, 0.6)', 
                                      cursor: activeTab === 'pending' ? 'pointer' : 'default',
                                      fontWeight: (activeTab === 'pending' ? !!checks[req.id]?.rut : req.estado === 'aprobado') ? 'bold' : 'normal',
                                      userSelect: 'none' 
                                    }}
                                  >
                                    Verificado
                                  </label>
                                </div>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>No cargado</span>
                            )}
                          </CompactDocumentCard>

                          <CompactDocumentCard>
                            <DocTitle>Cédula Rep. Legal</DocTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', alignItems: 'center' }}>
                              {req.documento_cedula_frente ? (
                                <DocViewerBtn 
                                  href="#" 
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    openDocumentPopup(req.documento_cedula_frente || ''); 
                                  }}
                                  style={{ width: '100%' }}
                                >
                                  Ver Frente
                                </DocViewerBtn>
                              ) : req.documento_cedula ? (
                                <DocViewerBtn 
                                  href="#" 
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    openDocumentPopup(req.documento_cedula || ''); 
                                  }}
                                  style={{ width: '100%' }}
                                >
                                  Ver Frente (Legacy)
                                </DocViewerBtn>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Frente no cargado</span>
                              )}
                              
                              {req.documento_cedula_dorso ? (
                                <DocViewerBtn 
                                  href="#" 
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    openDocumentPopup(req.documento_cedula_dorso || ''); 
                                  }}
                                  style={{ width: '100%' }}
                                >
                                  Ver Reverso
                                </DocViewerBtn>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Reverso no cargado</span>
                              )}

                              {(req.documento_cedula_frente || req.documento_cedula) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                                  <input
                                    type="checkbox"
                                    id={`check-cedula-${req.id}`}
                                    style={{ width: '16px', height: '16px', cursor: activeTab === 'pending' ? 'pointer' : 'default' }}
                                    checked={activeTab === 'pending' ? !!checks[req.id]?.cedula : req.estado === 'aprobado'}
                                    onChange={() => {
                                      if (activeTab === 'pending') {
                                        toggleCheck(req.id, 'cedula');
                                      }
                                    }}
                                    disabled={activeTab !== 'pending'}
                                  />
                                  <label 
                                    htmlFor={`check-cedula-${req.id}`} 
                                    style={{ 
                                      fontSize: '0.8rem', 
                                      color: (activeTab === 'pending' ? !!checks[req.id]?.cedula : req.estado === 'aprobado') ? '#10b981' : 'rgba(255, 255, 255, 0.6)', 
                                      cursor: activeTab === 'pending' ? 'pointer' : 'default',
                                      fontWeight: (activeTab === 'pending' ? !!checks[req.id]?.cedula : req.estado === 'aprobado') ? 'bold' : 'normal',
                                      userSelect: 'none' 
                                    }}
                                  >
                                    Verificado
                                  </label>
                                </div>
                              )}
                            </div>
                          </CompactDocumentCard>
                        </DocumentGrid>

                        {activeTab === 'pending' ? (
                          <>
                            <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px', fontWeight: 600 }}>Tabla de Cotejo de Datos del Solicitante:</h4>
                            <AuditTable>
                              <thead>
                                <tr>
                                  <th>Campo</th>
                                  <th>Valor en Solicitud</th>
                                  <th style={{ textAlign: 'center', width: '100px' }}>Verificado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.keys(fieldLabels).map((fieldKey) => (
                                  <tr key={fieldKey}>
                                    <td><strong>{fieldLabels[fieldKey]}</strong></td>
                                    <td>{(req as any)[fieldKey] || <em style={{ color: 'rgba(255,255,255,0.2)' }}>No provisto</em>}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <input
                                        type="checkbox"
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        checked={!!fieldChecks[req.id]?.[fieldKey]}
                                        onChange={() => {
                                          setFieldChecks(prev => {
                                            const reqFieldChecks = prev[req.id] || {
                                              razon_social: false, nit: false, nit_dv: false, email_contacto: false,
                                              nombres_contacto: false, apellidos_contacto: false, celular_contacto: false,
                                              telefono: false, ciudad: false, direccion: false, descripcion: false
                                            };
                                            const updated = {
                                              ...reqFieldChecks,
                                              [fieldKey]: !reqFieldChecks[fieldKey]
                                            };
                                            
                                            const docCh = checks[req.id] || { logo: false, camara: false, rut: false, cedula: false };
                                            saveVerificationProgress(req.id, docCh, updated);

                                            return {
                                              ...prev,
                                              [req.id]: updated
                                            };
                                          });
                                        }}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </AuditTable>



                            <SystemNotesWrapper>
                              <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Detalle / Observaciones:</label>
                              <SystemNotesTextarea 
                                placeholder="Escribe los detalles u observaciones aquí. Quedarán grabados en el historial en caso de aprobar, rechazar o solicitar correcciones..."
                                value={systemNotes[req.id] || ''}
                                onChange={(e) => setSystemNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                              />
                            </SystemNotesWrapper>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                              <ActionBtn 
                                $variant="reject" 
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                onClick={() => handleAction(req.id, 'reject')}
                                disabled={processingId === req.id}
                              >
                                Rechazar Solicitud
                              </ActionBtn>
                              <ActionBtn 
                                $variant="approve" 
                                style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                                onClick={() => openPreviewPopup(req.id)}
                                disabled={processingId === req.id}
                              >
                                Solicitar Información
                              </ActionBtn>
                              <ActionBtn 
                                $variant="approve" 
                                onClick={() => handleAction(req.id, 'approve')}
                                disabled={processingId === req.id || !isFullyChecked(req.id)}
                              >
                                Aprobar y Crear Cuenta
                              </ActionBtn>
                            </div>
                          </>
                        ) : (
                          <div style={{ 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid rgba(255,255,255,0.03)', 
                            borderRadius: '16px', 
                            padding: '20px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px',
                            width: '100%'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>AUDITORÍA DE RESOLUCIÓN</span>
                              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                {req.updated_at ? new Date(req.updated_at).toLocaleString('es-CO') : 'N/A'}
                              </span>
                            </div>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                            <div>
                              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: '6px' }}>Notas de Sistema / Auditor:</p>
                              <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0, whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                                {req.notas_system || 'Sin notas del auditor.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Historial de Procesos de la Solicitud */}
                        {historyLoading && expandedRequestId === req.id ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                            <Spinner /> Cargando historial de procesos...
                          </div>
                        ) : (
                          historyData && expandedRequestId === req.id && historyData.length > 0 && (
                            <div style={{ marginTop: '24px', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '1.1rem' }}>📜</span>
                                <h4 style={{ fontSize: '0.9rem', color: '#fff', margin: 0, fontWeight: 600 }}>
                                  Historial de Procesos de la Solicitud:
                                </h4>
                              </div>
                              <AuditTable>
                                <thead>
                                  <tr>
                                    <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                                    <th style={{ width: '180px' }}>Evento</th>
                                    <th style={{ width: '180px' }}>Fecha y Hora</th>
                                    <th style={{ width: '220px' }}>Operador / Autor</th>
                                    <th>Detalle / Observaciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {historyData.map((log: any, idx: number) => {
                                    let detailText = '';
                                    let details: any = null;
                                    if (log.details) {
                                      try {
                                        details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                                      } catch (e) {
                                        // Ignore
                                      }
                                    }

                                    if (log.event_type === 'REQUEST_MORE_INFORMATION' && details?.missingFields) {
                                      const translated = details.missingFields.map((f: string) => fieldLabels[f] || f).join(', ');
                                      const customNotes = details.notas_system ? ` - Observaciones: ${details.notas_system}` : '';
                                      detailText = `Correcciones solicitadas para: ${translated}${customNotes}`;
                                    } else if (log.event_type === 'REJECT_REGISTRATION_REQUEST') {
                                      const customNotes = details?.notas_system ? ` - Observaciones: ${details.notas_system}` : '';
                                      detailText = `Rechazado${customNotes}`;
                                    } else if (log.event_type === 'APPROVE_REGISTRATION_REQUEST') {
                                      const customNotes = details?.notas_system ? ` - Observaciones: ${details.notas_system}` : '';
                                      detailText = `Aprobado y Cuenta Creada${customNotes}`;
                                    } else if (log.event_type === 'EMAIL_DELIVERY_FAILURE') {
                                      const emailTypeDisplay = details?.emailType === 'approval' 
                                        ? 'Bienvenida/Aprobación' 
                                        : details?.emailType === 'rejection' 
                                          ? 'Rechazo' 
                                          : 'Solicitud de Información';
                                      detailText = `Error de envío: ${details?.error || 'Error desconocido'} (Correo: ${emailTypeDisplay} a ${details?.recipient || 'destinatario'})`;
                                    } else if (details?.reason) {
                                      detailText = details.reason;
                                    } else if (log.notas_system) {
                                      detailText = log.notas_system;
                                    } else {
                                      detailText = 'Acción registrada en el sistema.';
                                    }

                                    const actorDisplay = log.actor_nombre 
                                      ? `${log.actor_nombre} (${log.actor_email})` 
                                      : log.actor_email 
                                        ? log.actor_email 
                                        : 'Cliente (Externo)';

                                    const eventLabel = eventLabels[log.event_type] || log.event_type;

                                    return (
                                      <tr key={log.id}>
                                        <td style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                                          #{historyData.length - idx}
                                        </td>
                                        <td>
                                          <span style={{ 
                                            padding: '4px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 600,
                                            display: 'inline-block',
                                            ...getEventBadgeStyle(log.event_type)
                                          }}>
                                            {eventLabel}
                                          </span>
                                        </td>
                                        <td style={{ color: 'rgba(255,255,255,0.6)' }}>
                                          {new Date(log.created_at).toLocaleString('es-CO')}
                                        </td>
                                        <td style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                                          {actorDisplay}
                                        </td>
                                        <td style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                          {detailText}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </AuditTable>
                            </div>
                          )
                        )}
                      </RequestAccordionDetails>
                    )}
                  </RequestItem>
                );
              })
            )}
          </RequestList>
        </PanelContent>
      </Panel>

      {/* Invitación Modal */}
      {showInviteModal && (
        <ModalBackdrop onClick={() => setShowInviteModal(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Enviar Invitación de Registro</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </ModalHeader>
            <form onSubmit={handleSendInvitation}>
              <ModalBody>
                <FormGroup>
                  <FormLabel>Razón Social del Comercio</FormLabel>
                  <FormInput
                    type="text"
                    required
                    placeholder="Ej. Hamburguesas El Corral S.A.S."
                    value={inviteRazonSocial}
                    onChange={(e) => setInviteRazonSocial(e.target.value)}
                  />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Correo Electrónico de Contacto</FormLabel>
                  <FormInput
                    type="email"
                    required
                    placeholder="Ej. contacto@elcorral.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <CancelBtn type="button" onClick={() => setShowInviteModal(false)}>
                  Cancelar
                </CancelBtn>
                <SubmitBtn type="submit" disabled={sendingInvite}>
                  {sendingInvite ? <Spinner /> : 'Enviar Invitación'}
                </SubmitBtn>
              </ModalFooter>
            </form>
          </ModalCard>
        </ModalBackdrop>
      )}
    </Container>
  );
}
