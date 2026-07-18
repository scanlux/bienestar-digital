'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';
import {
  Container,
  Header,
  TitleContainer,
  Title,
  Subtitle,
  TabContainer,
  TabButton,
  ActionHeader,
  TableContainer,
  Table,
  BadgeBase,
  BadgeRole,
  BadgeStatus,
  ActionButtonContainer,
  IconButton,
  Button,
  ModalBody,
  SectionTitle,
  CheckboxList,
  CheckboxLabel,
  RoleDesc,
  InheritedPermsContainer,
  PermChip,
  ModalFooter
} from './UserManagementStyles';

import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalSubtitle,
  CloseButton
} from '@/components/Common/ModalStyles';

import SystemUserModal from './SystemUserModal';
import UserDetailModal from './UserDetailModal';
import UserModerationModal from './UserModerationModal';

export default function UsersManagementPage() {
  const toast = useToast();
  const { token, user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'portal' | 'system' | 'customer'>('portal');
  const [users, setUsers] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<any | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<number[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  const [selectedUserForDetail, setSelectedUserForDetail] = useState<any | null>(null);
  const [selectedUserForModeration, setSelectedUserForModeration] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, systemUsersRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/manage/system-users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/manage/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setUsers(usersRes.data);
      setSystemUsers(systemUsersRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar la información de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const handleRolesOpen = (user: any) => {
    setSelectedUserForRoles(user);
    setUserRoleIds(user.roleIds || []);
  };

  const handleRolesClose = () => {
    setSelectedUserForRoles(null);
  };

  const toggleRole = (roleId: number) => {
    setUserRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const saveRoles = async () => {
    if (!selectedUserForRoles) return;
    setIsSavingRoles(true);
    try {
      // Deducir userType de la fila (system_user o user)
      const isSystem = selectedUserForRoles.nivel !== undefined || selectedUserForRoles.rol === 'root' || selectedUserForRoles.rol === 'system';
      const userType = isSystem ? 'system_user' : 'user';

      await axios.put(
        `${API_URL}/api/manage/users/${selectedUserForRoles.id}/roles`,
        { roleIds: userRoleIds, userType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Combinar los permisos de los roles seleccionados para mostrarlos localmente
      const updatedRolesObj = roles.filter(r => userRoleIds.includes(r.id));
      const updatedRoleNames = updatedRolesObj.map(r => r.name);
      const allPermissions = Array.from(
        new Set(updatedRolesObj.flatMap(r => (r.permissions || []).map((p: any) => p.name)))
      );

      const updater = (u: any) =>
        u.id === selectedUserForRoles.id
          ? {
              ...u,
              roleIds: userRoleIds,
              roles: updatedRoleNames,
              permissions: allPermissions
            }
          : u;

      if (userType === 'system_user') {
        setSystemUsers(prev => prev.map(updater));
      } else {
        setUsers(prev => prev.map(updater));
      }

      toast.success('Roles asignados con éxito.');
      handleRolesClose();
    } catch (error: any) {
      console.error('Error saving user roles:', error);
      toast.error(error.response?.data?.error || 'Error al guardar los roles del usuario');
    } finally {
      setIsSavingRoles(false);
    }
  };

  const getInheritedPermissions = () => {
    const activeRoles = roles.filter(r => userRoleIds.includes(r.id));
    const perms = activeRoles.flatMap(r => r.permissions || []);
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

  if (loading) {
    return (
      <Container>
        <p style={{ color: '#aaa', fontStyle: 'italic' }}>Cargando información de usuarios y seguridad...</p>
      </Container>
    );
  }

  const currentList = activeTab === 'portal'
    ? users.filter(u => u.rol === 'admin')
    : activeTab === 'system'
    ? systemUsers
    : users.filter(u => u.rol === 'customer');

  return (
    <Container>
      <TabContainer>
        <TabButton $active={activeTab === 'portal'} onClick={() => setActiveTab('portal')}>
          Admins y Operadores
        </TabButton>
        <TabButton $active={activeTab === 'system'} onClick={() => setActiveTab('system')}>
          Usuarios de Sistema (Matriz)
        </TabButton>
        <TabButton $active={activeTab === 'customer'} onClick={() => setActiveTab('customer')}>
          Customers
        </TabButton>
      </TabContainer>

      {activeTab === 'system' && currentUser?.permissions?.includes('create_system_user') && (
        <ActionHeader>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Crear Usuario de Sistema
          </Button>
        </ActionHeader>
      )}

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol Base</th>
              <th>Estado</th>
              <th>Roles Asignados</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentList.length > 0 ? (
              currentList.map(u => {
                const isBanned = u.estado === 'baneado' || u.estado === 'inactivo';
                const isLocked = u.password_locked === 1;
                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.nombre || `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'No asignado'}</td>
                    <td>{u.email}</td>
                    <td>
                      <BadgeBase>{u.rol || u.nivel}</BadgeBase>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <BadgeStatus $type={isBanned ? 'banned' : 'active'}>
                          {isBanned ? 'SUSPENDIDO' : 'ACTIVO'}
                        </BadgeStatus>
                        {isLocked && (
                          <BadgeStatus $type="locked">CLAVE BLOQUEADA</BadgeStatus>
                        )}
                      </div>
                    </td>
                    <td>
                      {u.roles && u.roles.length > 0 ? (
                        u.roles.map((rName: string) => (
                          <BadgeRole key={rName}>{rName}</BadgeRole>
                        ))
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>Ninguno</span>
                      )}
                    </td>
                    <td>
                      <ActionButtonContainer style={{ justifyContent: 'flex-end' }}>
                        <IconButton
                          title="Ver Detalles"
                          onClick={() => setSelectedUserForDetail(u)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </IconButton>
                        
                        <IconButton
                          title="Seguridad y Moderación"
                          $variant={isBanned || isLocked ? 'danger' : 'warning'}
                          onClick={() => setSelectedUserForModeration(u)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        </IconButton>

                        {currentUser?.permissions?.includes('manage_rbac') && (
                          <Button $secondary onClick={() => handleRolesOpen(u)}>
                            Roles
                          </Button>
                        )}
                      </ActionButtonContainer>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                  No se encontraron usuarios en esta sección.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableContainer>

      {/* MODAL ASIGNAR ROLES */}
      {selectedUserForRoles && typeof window !== 'undefined' && document.getElementById('modal-portal-root') &&
        createPortal(
          <ModalOverlay onClick={handleRolesClose}>
            <ModalContent onClick={e => e.stopPropagation()} $maxWidth="520px">
              <ModalHeader>
                <div>
                  <ModalTitle>Asignar Roles</ModalTitle>
                  <ModalSubtitle>Modifica el perfil RBAC de {selectedUserForRoles.nombre || selectedUserForRoles.email}.</ModalSubtitle>
                </div>
                <CloseButton onClick={handleRolesClose}>&times;</CloseButton>
              </ModalHeader>
              <ModalBody>
                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Selecciona los roles que acumulará este usuario. Los permisos se calcularán en tiempo real.
                </p>

                <SectionTitle>Roles Disponibles</SectionTitle>
                <CheckboxList>
                  {roles
                    .filter(r => (activeTab === 'system' ? r.is_system === 1 : r.is_system === 0))
                    .map(role => (
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
                <Button $secondary onClick={handleRolesClose}>Cancelar</Button>
                <Button onClick={saveRoles} disabled={isSavingRoles}>
                  {isSavingRoles ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>,
          document.getElementById('modal-portal-root')!
        )
      }

      {/* MODAL CREAR USUARIO DE SISTEMA */}
      <SystemUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchData}
        roles={roles}
      />

      {/* MODAL DETALLE DE USUARIO */}
      <UserDetailModal
        isOpen={!!selectedUserForDetail}
        onClose={() => setSelectedUserForDetail(null)}
        user={selectedUserForDetail}
      />

      {/* MODAL MODERACIÓN DE USUARIO */}
      <UserModerationModal
        isOpen={!!selectedUserForModeration}
        onClose={() => setSelectedUserForModeration(null)}
        user={selectedUserForModeration}
        onSuccess={fetchData}
      />
    </Container>
  );
}
