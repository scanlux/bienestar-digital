'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalSubtitle,
  CloseButton
} from '@/components/Common/ModalStyles';
import {
  BadgeBase,
  BadgeRole,
  BadgeStatus,
  Button
} from './UserManagementStyles';
import styled from 'styled-components';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
}

export default function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
  if (!isOpen || !user) return null;

  const isSystemUser = user.nivel !== undefined || user.rol === 'root' || user.rol === 'system';

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="580px">
        <ModalHeader>
          <div>
            <ModalTitle>Detalles de Usuario</ModalTitle>
            <ModalSubtitle>Consulta perfil, permisos asignados y configuración del sistema.</ModalSubtitle>
          </div>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <DetailsGrid>
          <DetailRow>
            <Label>ID de Registro:</Label>
            <Value>{user.id}</Value>
          </DetailRow>

          <DetailRow>
            <Label>Nombre Completo:</Label>
            <Value>{user.nombre || `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'No asignado'}</Value>
          </DetailRow>

          <DetailRow>
            <Label>Correo Electrónico:</Label>
            <Value>{user.email}</Value>
          </DetailRow>

          <DetailRow>
            <Label>Rol Principal (Auth):</Label>
            <Value><BadgeBase>{user.rol || user.nivel}</BadgeBase></Value>
          </DetailRow>

          <DetailRow>
            <Label>Tipo de Usuario:</Label>
            <Value>
              {isSystemUser ? (
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>Usuario del Sistema (Sin Wallet)</span>
              ) : (
                <span style={{ color: '#10b981', fontWeight: 600 }}>Usuario de Portal / Comercio (Con Wallet)</span>
              )}
            </Value>
          </DetailRow>

          <DetailRow>
            <Label>Estado de Cuenta:</Label>
            <Value>
              <BadgeStatus $type={user.estado === 'activo' ? 'active' : 'inactive'}>
                {user.estado?.toUpperCase() || 'ACTIVO'}
              </BadgeStatus>
            </Value>
          </DetailRow>

          <DetailRow>
            <Label>Seguridad de Acceso:</Label>
            <Value>
              {user.password_locked === 1 ? (
                <BadgeStatus $type="locked">CONTRASEÑA BLOQUEADA</BadgeStatus>
              ) : (
                <BadgeStatus $type="active">ACCESO NORMAL</BadgeStatus>
              )}
            </Value>
          </DetailRow>
        </DetailsGrid>

        <SectionTitle>Roles RBAC Asignados</SectionTitle>
        <RolesContainer>
          {user.roles && user.roles.length > 0 ? (
            user.roles.map((r: string) => <BadgeRole key={r}>{r}</BadgeRole>)
          ) : (
            <span style={{ color: '#666', fontSize: '0.9rem' }}>Ningún rol asignado</span>
          )}
        </RolesContainer>

        <SectionTitle>Permisos Heredados en Tiempo Real</SectionTitle>
        <PermissionsContainer>
          {user.permissions && user.permissions.length > 0 ? (
            user.permissions.map((p: string) => (
              <PermChip key={p}>{p}</PermChip>
            ))
          ) : (
            <span style={{ color: '#666', fontSize: '0.9rem' }}>Sin permisos de sistema heredados</span>
          )}
        </PermissionsContainer>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
          <Button onClick={onClose}>Cerrar Ventana</Button>
        </div>
      </ModalContent>
    </ModalOverlay>,
    document.getElementById('modal-portal-root')!
  );
}

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  padding-bottom: 0.5rem;
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const Label = styled.span`
  color: #737373;
  font-size: 0.9rem;
  font-weight: 500;
`;

const Value = styled.span`
  color: #f5f5f5;
  font-size: 0.9rem;
  font-weight: 600;
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

const RolesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const PermissionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.04);
  padding: 0.75rem;
  border-radius: 8px;
`;

const PermChip = styled.span`
  background: rgba(255, 255, 255, 0.04);
  color: #a3a3a3;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
`;
