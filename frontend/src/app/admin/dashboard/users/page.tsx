'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/manage/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: any) => {
    setSelectedUser(user);
    setUserRoleIds(user.roleIds || []);
  };

  const closeModal = () => {
    setSelectedUser(null);
  };

  const toggleRole = (roleId: number) => {
    setUserRoleIds(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const saveRoles = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      // Deducir userType de la fila (system_user o user)
      const userType = (selectedUser.rol === 'root' || selectedUser.rol === 'system') ? 'system_user' : 'user';

      await axios.put(`${API_URL}/api/manage/users/${selectedUser.id}/roles`, 
        { roleIds: userRoleIds, userType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Actualizar localmente la fila del usuario
      const updatedRoles = roles.filter(r => userRoleIds.includes(r.id));
      const updatedRoleNames = updatedRoles.map(r => r.name);
      
      // Combinar todos los permisos de los roles seleccionados para mostrarlos
      const allPermissions = Array.from(new Set(
        updatedRoles.flatMap(r => r.permissions.map((p: any) => p.name))
      ));

      setUsers(users.map(u => u.id === selectedUser.id ? { 
        ...u, 
        roleIds: userRoleIds, 
        roles: updatedRoleNames,
        permissions: allPermissions
      } : u));

      closeModal();
    } catch (error: any) {
      console.error('Error saving user roles:', error);
      alert(error.response?.data?.error || 'Error al guardar los roles del usuario');
    } finally {
      setIsSaving(false);
    }
  };

  // Obtener permisos heredados en tiempo real según los roles marcados en el modal
  const getInheritedPermissions = () => {
    const activeRoles = roles.filter(r => userRoleIds.includes(r.id));
    const perms = activeRoles.flatMap(r => r.permissions || []);
    // Remover duplicados por nombre
    const unique = [];
    const seen = new Set();
    for (const p of perms) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        unique.push(p);
      }
    }
    return unique;
  };

  if (loading) return <Container><p>Cargando información de seguridad...</p></Container>;

  return (
    <Container>
      <Header>
        <Title>Gestión de Administradores y Staff</Title>
        <Subtitle>Asigna roles del sistema y del comercio a los usuarios del dashboard.</Subtitle>
      </Header>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol Base (Auth)</th>
              <th>Roles RBAC Asignados</th>
              <th>Permisos Heredados</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td><BadgeBase>{u.rol}</BadgeBase></td>
                <td>
                  {u.roles && u.roles.length > 0 ? (
                    u.roles.map((rName: string) => <BadgeRole key={rName}>{rName}</BadgeRole>)
                  ) : (
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>Ninguno</span>
                  )}
                </td>
                <td>
                  <span style={{ color: '#aaa', fontSize: '0.9rem' }}>{u.permissions?.length || 0} permisos</span>
                </td>
                <td>
                  <Button onClick={() => openModal(u)}>Asignar Roles</Button>
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
                <h3>Roles de {selectedUser.nombre}</h3>
                <CloseButton onClick={closeModal}>&times;</CloseButton>
              </ModalHeader>
              <ModalBody>
                <p>Selecciona los roles asignados a este usuario. Se acumularán los permisos correspondientes.</p>
                
                <SectionTitle>Roles Disponibles</SectionTitle>
                <CheckboxList>
                  {roles.map(role => (
                    <CheckboxLabel key={role.id}>
                      <input 
                        type="checkbox" 
                        checked={userRoleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                      />
                      <div>
                        <strong>{role.name}</strong>
                        <RoleDesc>{role.description}</RoleDesc>
                      </div>
                    </CheckboxLabel>
                  ))}
                </CheckboxList>

                <SectionTitle style={{ marginTop: '1.5rem' }}>Permisos Heredados en Tiempo Real</SectionTitle>
                <InheritedPermsContainer>
                  {getInheritedPermissions().length > 0 ? (
                    getInheritedPermissions().map(p => (
                      <PermChip key={p.id} title={p.description}>
                        {p.name}
                      </PermChip>
                    ))
                  ) : (
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>Ninguno (sin permisos)</span>
                  )}
                </InheritedPermsContainer>
              </ModalBody>
              <ModalFooter>
                <Button secondary onClick={closeModal}>Cancelar</Button>
                <Button onClick={saveRoles} disabled={isSaving}>
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

// Styled Components premium
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
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1rem;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  th {
    color: #888;
    font-weight: 500;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;
const BadgeBase = styled.span`
  background: rgba(255, 255, 255, 0.1);
  color: #ccc;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
`;
const BadgeRole = styled.span`
  background: rgba(72, 214, 76, 0.15);
  color: #48d64c;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  margin-right: 0.5rem;
  display: inline-block;
  border: 1px solid rgba(72, 214, 76, 0.3);
`;
const Button = styled.button<{secondary?: boolean}>`
  background: ${p => p.secondary ? 'rgba(255,255,255,0.08)' : 'var(--emerald, #48d64c)'};
  color: ${p => p.secondary ? 'white' : 'black'};
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  &:disabled { opacity: 0.5; }
`;
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;
const ModalContent = styled.div`
  background: #121212;
  border-radius: 12px;
  width: 500px;
  max-width: 95%;
  color: white;
  border: 1px solid rgba(255,255,255,0.1);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
`;
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  h3 { margin: 0; font-size: 1.25rem; }
`;
const CloseButton = styled.button`
  background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;
`;
const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  p { color: #888; margin-bottom: 1.5rem; font-size: 0.95rem; }
`;
const SectionTitle = styled.h4`
  color: #fff;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 0.25rem;
`;
const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;
const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.15s ease;
  &:hover {
    background: rgba(255,255,255,0.03);
  }
  input { 
    transform: scale(1.2); 
    margin-top: 0.25rem;
  }
`;
const RoleDesc = styled.span`
  display: block;
  font-size: 0.8rem;
  color: #666;
  font-weight: 400;
  margin-top: 0.15rem;
`;
const InheritedPermsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  padding: 0.75rem;
  border-radius: 8px;
`;
const PermChip = styled.span`
  background: rgba(255,255,255,0.05);
  color: #aaa;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
`;
const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;
