'use client';

import React, { useState } from 'react';
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
  FormGroup,
  Input,
  Select,
  Button
} from './UserManagementStyles';
import styled from 'styled-components';

interface SystemUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: any[];
}

export default function SystemUserModal({ isOpen, onClose, onSuccess, roles }: SystemUserModalProps) {
  const toast = useToast();
  const { token, user: currentUser } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [nivel, setNivel] = useState('system');
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  // Filtrar solo roles del sistema
  const systemRoles = roles.filter(r => r.is_system === 1);

  const toggleRole = (roleId: number) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    if (!email || !password || !nombres || !apellidos) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    setIsSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/manage/system-users`,
        {
          email,
          password,
          nombres,
          apellidos,
          nivel,
          roleIds: selectedRoles
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Usuario del sistema creado correctamente.');
      onSuccess();
      onClose();
      // Limpiar campos
      setEmail('');
      setPassword('');
      setNombres('');
      setApellidos('');
      setNivel('system');
      setSelectedRoles([]);
      setIsSubmitted(false);
    } catch (error: any) {
      console.error('Error creating system user:', error);
      toast.error(error.response?.data?.error || 'Error al crear el usuario de sistema');
    } finally {
      setIsSaving(false);
    }
  };

  const isCurrentUserRoot = currentUser?.roles?.includes('root');

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="520px">
        <ModalHeader>
          <div>
            <ModalTitle>Crear Usuario de Sistema</ModalTitle>
            <ModalSubtitle>Registra personal operativo para el soporte o administración central.</ModalSubtitle>
          </div>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <form onSubmit={handleSave} noValidate className={isSubmitted ? 'was-validated' : ''}>
          <FormGroup>
            <label>Nombres *</label>
            <Input 
              type="text" 
              value={nombres} 
              onChange={e => setNombres(e.target.value)} 
              required 
            />
          </FormGroup>

          <FormGroup>
            <label>Apellidos *</label>
            <Input 
              type="text" 
              value={apellidos} 
              onChange={e => setApellidos(e.target.value)} 
              required 
            />
          </FormGroup>

          <FormGroup>
            <label>Correo Electrónico *</label>
            <Input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </FormGroup>

          <FormGroup>
            <label>Contraseña *</label>
            <Input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </FormGroup>

          <FormGroup>
            <label>Nivel de Acceso *</label>
            <Select value={nivel} onChange={e => setNivel(e.target.value)}>
              <option value="system">System (Staff / Operador)</option>
              {isCurrentUserRoot && <option value="root">Root (Super Administrador)</option>}
            </Select>
          </FormGroup>

          <SectionTitle>Roles de Sistema Asociados</SectionTitle>
          {systemRoles.length > 0 ? (
            <CheckboxListContainer>
              {systemRoles.map(role => (
                <CheckboxLabel key={role.id}>
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <div>
                    <strong>{role.name}</strong>
                    <RoleDesc>{role.description}</RoleDesc>
                  </div>
                </CheckboxLabel>
              ))}
            </CheckboxListContainer>
          ) : (
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>No hay roles de sistema disponibles.</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <Button type="button" $secondary onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </ModalContent>
    </ModalOverlay>,
    document.getElementById('modal-portal-root')!
  );
}

const SectionTitle = styled.h4`
  color: #fff;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 1.5rem 0 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 0.25rem;
`;

const CheckboxListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 160px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.75rem;
  border-radius: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: background 0.15s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  
  input {
    margin-top: 0.25rem;
    transform: scale(1.1);
    cursor: pointer;
  }
`;

const RoleDesc = styled.span`
  display: block;
  font-size: 0.8rem;
  color: #737373;
  font-weight: 400;
  margin-top: 0.15rem;
`;
