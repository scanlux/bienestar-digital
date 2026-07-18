'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalSubtitle,
  CloseButton
} from '@/components/Common/ModalStyles';
import {
  BadgeStatus,
  Button,
  TextArea,
  FormGroup,
  Table
} from './UserManagementStyles';
import styled from 'styled-components';

interface UserModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  onSuccess: () => void;
}

export default function UserModerationModal({ isOpen, onClose, user, onSuccess }: UserModerationModalProps) {
  const toast = useToast();
  const { token, user: currentUser } = useAuth();
  
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeAction, setActiveAction] = useState<'ban' | 'unban' | 'lock_password' | 'unlock_password' | null>(null);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isSystemUser = user ? (user.nivel !== undefined || user.rol === 'root' || user.rol === 'system') : false;
  const userType = isSystemUser ? 'system_user' : 'user';

  useEffect(() => {
    if (isOpen && user && token) {
      fetchHistory();
    }
  }, [isOpen, user, token]);

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/manage/users/${user.id}/moderation-history`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { userType }
        }
      );
      setHistory(res.data);
    } catch (error) {
      console.error('Error fetching moderation history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen || !user) return null;

  const handleAction = (action: 'ban' | 'unban' | 'lock_password' | 'unlock_password') => {
    setActiveAction(action);
    setReason('');
    setIsSubmitted(false);
  };

  const handleCancelAction = () => {
    setActiveAction(null);
    setReason('');
    setIsSubmitted(false);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (!reason || reason.trim().length < 5) {
      toast.error('Por favor escribe un motivo válido (mínimo 5 caracteres).');
      return;
    }

    setIsSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/manage/users/${user.id}/moderate`,
        {
          userType,
          action: activeAction,
          reason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Estado actualizado y registrado con éxito.');
      
      // Actualizar localmente el estado del usuario para visualización inmediata en el modal
      if (activeAction === 'ban') {
        user.estado = isSystemUser ? 'inactivo' : 'baneado';
      } else if (activeAction === 'unban') {
        user.estado = 'activo';
      } else if (activeAction === 'lock_password') {
        user.password_locked = 1;
      } else if (activeAction === 'unlock_password') {
        user.password_locked = 0;
      }

      setActiveAction(null);
      setReason('');
      setIsSubmitted(false);
      onSuccess(); // Notificar al orquestador para refrescar listas
      fetchHistory(); // Recargar historial de moderación
    } catch (error: any) {
      console.error('Error in user moderation:', error);
      toast.error(error.response?.data?.error || 'Error al ejecutar acción de moderación');
    } finally {
      setIsSaving(false);
    }
  };

  const isBanned = user.estado === 'baneado' || user.estado === 'inactivo';
  const isLocked = user.password_locked === 1;

  // Evitar moderarse a sí mismo
  const isSelf = currentUser?.id === user.id && currentUser?.actorType === userType;

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="650px">
        <ModalHeader>
          <div>
            <ModalTitle>Seguridad y Moderación</ModalTitle>
            <ModalSubtitle>Gestiona el estado de acceso de {user.nombre || user.email}.</ModalSubtitle>
          </div>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        {isSelf ? (
          <SelfAlert>
            <strong>Nota de Seguridad:</strong> No puedes realizar acciones de moderación sobre tu propia cuenta en sesión.
          </SelfAlert>
        ) : null}

        <StatusSummaryGrid>
          <StatusBlock>
            <StatusLabel>Estado de Cuenta</StatusLabel>
            <BadgeStatus $type={isBanned ? 'banned' : 'active'}>
              {user.estado?.toUpperCase() || 'ACTIVO'}
            </BadgeStatus>
            {!isSelf && (
              <ButtonContainer>
                {isBanned ? (
                  <Button onClick={() => handleAction('unban')}>Activar Cuenta</Button>
                ) : (
                  <Button $secondary onClick={() => handleAction('ban')}>Suspender / Banear</Button>
                )}
              </ButtonContainer>
            )}
          </StatusBlock>

          <StatusBlock>
            <StatusLabel>Acceso por Contraseña</StatusLabel>
            <BadgeStatus $type={isLocked ? 'locked' : 'active'}>
              {isLocked ? 'BLOQUEADO' : 'NORMAL'}
            </BadgeStatus>
            {!isSelf && (
              <ButtonContainer>
                {isLocked ? (
                  <Button onClick={() => handleAction('unlock_password')}>Desbloquear Contraseña</Button>
                ) : (
                  <Button $secondary onClick={() => handleAction('lock_password')}>Bloquear Contraseña</Button>
                )}
              </ButtonContainer>
            )}
          </StatusBlock>
        </StatusSummaryGrid>

        {/* Justificación obligatoria */}
        {activeAction && (
          <FormCard onSubmit={handleConfirmAction} noValidate className={isSubmitted ? 'was-validated' : ''}>
            <FormTitle>
              Confirmar Acción: {
                activeAction === 'ban' ? 'Suspender/Banear' :
                activeAction === 'unban' ? 'Activar Cuenta' :
                activeAction === 'lock_password' ? 'Bloquear Contraseña' : 'Desbloquear Contraseña'
              }
            </FormTitle>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Para aplicar este cambio de seguridad, debes ingresar una justificación detallada del caso. Quedará registrada inmutablemente asociada a tu firma.
            </p>
            <FormGroup>
              <label>Justificación / Motivo del Caso *</label>
              <TextArea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Escribe aquí los detalles del bloqueo, sospechas, incidentes de seguridad, etc. Mínimo 5 caracteres."
                required
              />
            </FormGroup>
            <FormActions>
              <Button type="button" $secondary onClick={handleCancelAction}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Aplicando...' : 'Aplicar Sanción'}
              </Button>
            </FormActions>
          </FormCard>
        )}

        <SectionTitle>Historial de Moderación e Incidentes</SectionTitle>
        {loadingHistory ? (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Cargando bitácora...</p>
        ) : history.length > 0 ? (
          <HistoryTableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Justificación</th>
                  <th>Fecha</th>
                  <th>Moderado Por</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id}>
                    <td>
                      <BadgeStatus 
                        $type={
                          item.action === 'ban' || item.action === 'lock_password' ? 'banned' : 'active'
                        }
                      >
                        {item.action?.toUpperCase()}
                      </BadgeStatus>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#ccc', maxWidth: '200px', wordBreak: 'break-word' }}>
                      {item.reason}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#888' }}>
                      {new Date(item.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#aaa' }}>
                      <strong>{item.moderator_name}</strong>
                      <span style={{ display: 'block', color: '#666', fontSize: '0.75rem' }}>{item.moderator_email}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </HistoryTableContainer>
        ) : (
          <p style={{ color: '#666', fontSize: '0.9rem', fontStyle: 'italic' }}>Este usuario no registra incidentes de moderación previos.</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <Button onClick={onClose}>Cerrar Moderación</Button>
        </div>
      </ModalContent>
    </ModalOverlay>,
    document.getElementById('modal-portal-root')!
  );
}

const SelfAlert = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
`;

const StatusSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.5rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatusBlock = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`;

const StatusLabel = styled.span`
  font-size: 0.85rem;
  color: #737373;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ButtonContainer = styled.div`
  width: 100%;
  margin-top: 0.5rem;
  button {
    width: 100%;
    justify-content: center;
  }
`;

const FormCard = styled.form`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  animation: fadeIn 0.2s ease-out;
`;

const FormTitle = styled.h4`
  color: #f5f5f5;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const SectionTitle = styled.h4`
  color: #fff;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 1.5rem 0 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 0.25rem;
`;

const HistoryTableContainer = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
`;
