'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://trendy.sytes.net';

const AVAILABLE_PERMISSIONS = [
  { id: 'menu_commerce', label: 'Catálogo de Comercios' },
  { id: 'menu_stores', label: 'Gestión de Sedes' },
  { id: 'menu_intelligence', label: 'Panel de Inteligencia' },
  { id: 'manage_users', label: 'Gestión de Usuarios (Super Admin)' },
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/manage/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: any) => {
    setSelectedUser(user);
    setUserPermissions(user.permissions || []);
  };

  const closeModal = () => {
    setSelectedUser(null);
  };

  const togglePermission = (permId: string) => {
    setUserPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/api/manage/users/${selectedUser.id}/permissions`, 
        { permissions: userPermissions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Actualizar localmente
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, permissions: userPermissions } : u));
      closeModal();
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Error al guardar permisos');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Container><p>Cargando usuarios...</p></Container>;

  return (
    <Container>
      <Header>
        <Title>Gestión de Administradores y Staff</Title>
        <Subtitle>Asigna permisos granulares a los usuarios del dashboard.</Subtitle>
      </Header>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol Base</th>
              <th>Permisos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td><Badge>{u.rol}</Badge></td>
                <td>{u.permissions?.length || 0} asignados</td>
                <td>
                  <Button onClick={() => openModal(u)}>Editar Permisos</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>

      {/* Modal vía Portal */}
      {selectedUser && typeof window !== 'undefined' && document.getElementById('modal-portal-root') && 
        createPortal(
          <ModalOverlay onClick={closeModal}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <h3>Permisos de {selectedUser.nombre}</h3>
                <CloseButton onClick={closeModal}>&times;</CloseButton>
              </ModalHeader>
              <ModalBody>
                <p>Selecciona a qué secciones del dashboard tendrá acceso este usuario.</p>
                <CheckboxList>
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <CheckboxLabel key={perm.id}>
                      <input 
                        type="checkbox" 
                        checked={userPermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                      />
                      <span>{perm.label}</span>
                    </CheckboxLabel>
                  ))}
                </CheckboxList>
              </ModalBody>
              <ModalFooter>
                <Button secondary onClick={closeModal}>Cancelar</Button>
                <Button onClick={savePermissions} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>,
          document.getElementById('modal-portal-root')!
        )
      }
    </Container>
  );
}

// Styled Components básicos
const Container = styled.div`
  color: white;
`;
const Header = styled.div`
  margin-bottom: 2rem;
`;
const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;
const Subtitle = styled.p`
  color: #aaa;
`;
const TableContainer = styled.div`
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 1rem;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
`;
const Badge = styled.span`
  background: rgba(72, 214, 76, 0.2);
  color: var(--emerald);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
`;
const Button = styled.button<{secondary?: boolean}>`
  background: ${p => p.secondary ? 'rgba(255,255,255,0.1)' : 'var(--emerald)'};
  color: ${p => p.secondary ? 'white' : 'black'};
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  &:disabled { opacity: 0.5; }
`;
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;
const ModalContent = styled.div`
  background: #1e1e1e;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  color: white;
  border: 1px solid rgba(255,255,255,0.1);
`;
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  h3 { margin: 0; }
`;
const CloseButton = styled.button`
  background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;
`;
const ModalBody = styled.div`
  padding: 1.5rem;
  p { color: #aaa; margin-bottom: 1rem; }
`;
const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;
const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  input { transform: scale(1.2); }
`;
const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;
