import React from 'react';
import styled from 'styled-components';
import {
  ModalBackdrop, ModalCard, ModalHeader, ModalBody, ModalFooter,
  ActionBtn, DocumentGrid, DocumentCard, DocTitle, DocViewerBtn,
  SystemNotesWrapper, SystemNotesTextarea, Spinner
} from '../../AdminDashboardStyles';
import { RegistrationRequest } from '../types';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
import { API_URL } from '@/constants';
import { useQuery } from '@tanstack/react-query';

const CompactDocumentCard = styled(DocumentCard)`
  padding: 16px;
  gap: 12px;
  min-height: unset;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

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
`;

const fieldLabels: Record<string, string> = {
  razon_social: 'Razón Social', nit: 'NIT', nit_dv: 'Dígito de Verificación (DV)',
  email_contacto: 'Correo Electrónico Corporativo', nombres_contacto: 'Nombres del Representante',
  apellidos_contacto: 'Apellidos del Representante', celular_contacto: 'Celular del Representante',
  telefono: 'Teléfono del Comercio', ciudad: 'Ciudad', direccion: 'Dirección Principal',
  descripcion: 'Descripción del Negocio'
};

const eventLabels: Record<string, string> = {
  SUBMIT_REGISTRATION_REQUEST: 'Solicitud Creada', REQUEST_MORE_INFORMATION: 'Corrección Solicitada',
  SUBMIT_CORRECTIONS: 'Corrección Recibida', APPROVE_REGISTRATION_REQUEST: 'Solicitud Aprobada',
  REJECT_REGISTRATION_REQUEST: 'Solicitud Rechazada', EMAIL_DELIVERY_FAILURE: 'Fallo Envío Correo'
};

const getEventBadgeStyle = (eventType: string) => {
  switch (eventType) {
    case 'SUBMIT_REGISTRATION_REQUEST': return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
    case 'REQUEST_MORE_INFORMATION': return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' };
    case 'SUBMIT_CORRECTIONS': return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
    case 'APPROVE_REGISTRATION_REQUEST': return { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    case 'REJECT_REGISTRATION_REQUEST': return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
    case 'EMAIL_DELIVERY_FAILURE': return { background: 'rgba(239, 68, 68, 0.1)', color: '#f59e0b', border: '1px solid rgba(239, 68, 68, 0.2)' };
    default: return { background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)' };
  }
};

interface RequestDetailModalProps {
  request: RegistrationRequest;
  onClose: () => void;
  activeTab: 'pending' | 'processed';
  checks: Record<string, boolean>;
  fieldChecks: Record<string, boolean>;
  systemNote: string;
  setSystemNote: (note: string) => void;
  onToggleCheck: (type: string) => void;
  onToggleFieldCheck: (field: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onInfoRequest: () => void;
  isFullyChecked: boolean;
  processingId: number | null;
}

export default function RequestDetailModal({
  request: req, onClose, activeTab, checks, fieldChecks, systemNote, setSystemNote,
  onToggleCheck, onToggleFieldCheck, onApprove, onReject, onInfoRequest, isFullyChecked, processingId
}: RequestDetailModalProps) {
  
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['requestHistory', req.id],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/requests/${req.id}/history`, { headers, signal });
      return res.data;
    }
  });

  const openDocumentPopup = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'toolbar=no,location=yes,status=no,menubar=no,scrollbars=yes,resizable=yes,width=800,height=900');
  };

  return (
    <ModalBackdrop onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ModalCard onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <ModalHeader>
          <h3>Detalle de Solicitud - {req.razon_social}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
        </ModalHeader>
        <ModalBody>
          <DocumentGrid style={{ marginBottom: '24px' }}>
            <CompactDocumentCard>
              <DocTitle>Logo del Comercio</DocTitle>
              {req.logo_url ? (
                <>
                  <DocViewerBtn href="#" onClick={(e) => { e.preventDefault(); openDocumentPopup(req.logo_url || ''); }}>Ver Logo</DocViewerBtn>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                    <input type="checkbox" checked={activeTab === 'pending' ? !!checks.logo : req.estado === 'aprobado'} onChange={() => { if(activeTab==='pending') onToggleCheck('logo'); }} disabled={activeTab !== 'pending'} />
                    <label style={{ fontSize: '0.8rem', color: (activeTab === 'pending' ? !!checks.logo : req.estado === 'aprobado') ? '#10b981' : 'rgba(255,255,255,0.6)' }}>Verificado</label>
                  </div>
                </>
              ) : <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>No cargado</span>}
            </CompactDocumentCard>
            <CompactDocumentCard>
              <DocTitle>Cámara de Comercio</DocTitle>
              {req.documento_camara_comercio ? (
                <>
                  <DocViewerBtn href="#" onClick={(e) => { e.preventDefault(); openDocumentPopup(req.documento_camara_comercio || ''); }}>Ver CC</DocViewerBtn>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                    <input type="checkbox" checked={activeTab === 'pending' ? !!checks.camara : req.estado === 'aprobado'} onChange={() => { if(activeTab==='pending') onToggleCheck('camara'); }} disabled={activeTab !== 'pending'} />
                    <label style={{ fontSize: '0.8rem', color: (activeTab === 'pending' ? !!checks.camara : req.estado === 'aprobado') ? '#10b981' : 'rgba(255,255,255,0.6)' }}>Verificado</label>
                  </div>
                </>
              ) : <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>No cargado</span>}
            </CompactDocumentCard>
            <CompactDocumentCard>
              <DocTitle>RUT</DocTitle>
              {req.documento_rut ? (
                <>
                  <DocViewerBtn href="#" onClick={(e) => { e.preventDefault(); openDocumentPopup(req.documento_rut || ''); }}>Ver RUT</DocViewerBtn>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                    <input type="checkbox" checked={activeTab === 'pending' ? !!checks.rut : req.estado === 'aprobado'} onChange={() => { if(activeTab==='pending') onToggleCheck('rut'); }} disabled={activeTab !== 'pending'} />
                    <label style={{ fontSize: '0.8rem', color: (activeTab === 'pending' ? !!checks.rut : req.estado === 'aprobado') ? '#10b981' : 'rgba(255,255,255,0.6)' }}>Verificado</label>
                  </div>
                </>
              ) : <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>No cargado</span>}
            </CompactDocumentCard>
            <CompactDocumentCard>
              <DocTitle>Cédula Rep. Legal</DocTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', alignItems: 'center' }}>
                {req.documento_cedula_frente ? (
                  <DocViewerBtn href="#" onClick={(e) => { e.preventDefault(); openDocumentPopup(req.documento_cedula_frente || ''); }} style={{ width: '100%' }}>Ver Frente</DocViewerBtn>
                ) : req.documento_cedula ? (
                  <DocViewerBtn href="#" onClick={(e) => { e.preventDefault(); openDocumentPopup(req.documento_cedula || ''); }} style={{ width: '100%' }}>Ver Frente (Legacy)</DocViewerBtn>
                ) : <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Frente no cargado</span>}
                {req.documento_cedula_dorso ? (
                  <DocViewerBtn href="#" onClick={(e) => { e.preventDefault(); openDocumentPopup(req.documento_cedula_dorso || ''); }} style={{ width: '100%' }}>Ver Reverso</DocViewerBtn>
                ) : <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Reverso no cargado</span>}
                {(req.documento_cedula_frente || req.documento_cedula) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                    <input type="checkbox" checked={activeTab === 'pending' ? !!checks.cedula : req.estado === 'aprobado'} onChange={() => { if(activeTab==='pending') onToggleCheck('cedula'); }} disabled={activeTab !== 'pending'} />
                    <label style={{ fontSize: '0.8rem', color: (activeTab === 'pending' ? !!checks.cedula : req.estado === 'aprobado') ? '#10b981' : 'rgba(255,255,255,0.6)' }}>Verificado</label>
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
                          checked={!!fieldChecks[fieldKey]}
                          onChange={() => onToggleFieldCheck(fieldKey)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AuditTable>
              <SystemNotesWrapper>
                <label style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Detalle / Observaciones:</label>
                <SystemNotesTextarea 
                  placeholder="Escribe los detalles u observaciones aquí..."
                  value={systemNote}
                  onChange={(e) => setSystemNote(e.target.value)}
                />
              </SystemNotesWrapper>
            </>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
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

          {historyLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              <Spinner /> Cargando historial de procesos...
            </div>
          ) : historyData && historyData.length > 0 ? (
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
                    let detailText = log.notas_system || 'Acción registrada.';
                    if (log.details) {
                      try {
                        const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                        if (log.event_type === 'REQUEST_MORE_INFORMATION' && details?.missingFields) {
                          const translated = details.missingFields.map((f: string) => fieldLabels[f] || f).join(', ');
                          detailText = `Correcciones solicitadas para: ${translated}${details.notas_system ? ` - ${details.notas_system}` : ''}`;
                        } else if (details.reason) {
                          detailText = details.reason;
                        }
                      } catch (e) {}
                    }
                    return (
                      <tr key={log.id}>
                        <td style={{ textAlign: 'center' }}>#{historyData.length - idx}</td>
                        <td><span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block', ...getEventBadgeStyle(log.event_type) }}>{eventLabels[log.event_type] || log.event_type}</span></td>
                        <td>{new Date(log.created_at).toLocaleString('es-CO')}</td>
                        <td>{log.actor_nombre ? `${log.actor_nombre} (${log.actor_email})` : log.actor_email || 'Cliente (Externo)'}</td>
                        <td>{detailText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </AuditTable>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          {activeTab === 'pending' ? (
            <>
              <ActionBtn $variant="reject" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={onReject} disabled={processingId === req.id}>
                Rechazar
              </ActionBtn>
              <ActionBtn $variant="approve" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }} onClick={onInfoRequest} disabled={processingId === req.id}>
                Solicitar Información
              </ActionBtn>
              <ActionBtn $variant="approve" onClick={onApprove} disabled={processingId === req.id || !isFullyChecked}>
                Aprobar y Crear Cuenta
              </ActionBtn>
            </>
          ) : (
            <ActionBtn $variant="approve" onClick={onClose}>Cerrar</ActionBtn>
          )}
        </ModalFooter>
      </ModalCard>
    </ModalBackdrop>
  );
}
