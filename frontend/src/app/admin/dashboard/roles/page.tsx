'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissionIds, setRolePermissionIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [onlyShowChecked, setOnlyShowChecked] = useState(false);

  const openAnalysisPage = () => {
    router.push('/admin/dashboard/roles/analysis');
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [rolesRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/api/manage/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/manage/permission-categories`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setRoles(rolesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching roles/categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (role: any) => {
    setIsNew(false);
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleCode(role.code);
    setRoleDescription(role.description || '');
    setRolePermissionIds(role.permissions?.map((p: any) => p.id) || []);
    setOnlyShowChecked(false);
  };

  const openNewModal = () => {
    setIsNew(true);
    setSelectedRole({});
    setRoleName('');
    setRoleCode('');
    setRoleDescription('');
    setRolePermissionIds([]);
    setOnlyShowChecked(false);
  };

  const closeModal = () => {
    setSelectedRole(null);
    setOnlyShowChecked(false);
  };

  const togglePermission = (permId: number) => {
    setRolePermissionIds(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const saveRole = async () => {
    if (isNew && (!roleName || !roleCode)) {
      alert('Nombre y código de rol son requeridos.');
      return;
    }
    
    setIsSaving(true);
    try {
      if (isNew) {
        await axios.post(`${API_URL}/api/manage/roles`, {
          name: roleName,
          code: roleCode,
          description: roleDescription,
          permissionIds: rolePermissionIds
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.put(`${API_URL}/api/manage/roles/${selectedRole.id}`, {
          name: roleName,
          description: roleDescription,
          permissionIds: rolePermissionIds
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      await fetchData();
      closeModal();
    } catch (error: any) {
      console.error('Error saving role:', error);
      alert(error.response?.data?.error || 'Error al guardar el rol');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRole = async (roleId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este rol? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/manage/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert(error.response?.data?.error || 'Error al eliminar el rol');
    }
  };

  if (loading) return <Container><p>Cargando catálogo de roles...</p></Container>;

  return (
    <Container>
      <Header>
        <div>
          <Title>Roles y Permisos del Sistema</Title>
          <Subtitle>Configura los roles globales y sus respectivos niveles de acceso.</Subtitle>
        </div>
        <HeaderButtons>
          <AddButton style={{ marginRight: '1rem', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} onClick={openAnalysisPage}>
            Analizar Permisos Atómicos
          </AddButton>
          <AddButton onClick={openNewModal}>Crear Rol Personalizado</AddButton>
        </HeaderButtons>
      </Header>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre del Rol</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Permisos Incluidos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td><Code>{role.code}</Code></td>
                <td><strong>{role.name}</strong></td>
                <td><span style={{ color: '#aaa', fontSize: '0.9rem' }}>{role.description || 'Sin descripción'}</span></td>
                <td>
                  {role.is_system === 1 ? (
                    <SystemBadge>Sistema</SystemBadge>
                  ) : (
                    <CustomBadge>Personalizado</CustomBadge>
                  )}
                </td>
                <td>
                  <PermCount title={role.permissions?.map((p: any) => p.name).join(', ')}>
                    {role.permissions?.length || 0} permisos
                  </PermCount>
                </td>
                <td>
                  <ActionButtons>
                    <ActionButton onClick={() => openEditModal(role)}>
                      {role.code === 'root' ? 'Ver' : 'Editar'}
                    </ActionButton>
                    {role.is_system !== 1 && (
                      <ActionButton danger onClick={() => deleteRole(role.id)}>
                        Eliminar
                      </ActionButton>
                    )}
                  </ActionButtons>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableContainer>

      {/* Modal */}
      {selectedRole && typeof window !== 'undefined' && document.getElementById('modal-portal-root') &&
        createPortal(
          <ModalOverlay onClick={closeModal}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <ModalHeader>
                <h3>{isNew ? 'Crear Rol Personalizado' : `Editar Rol: ${roleName}`}</h3>
                <CloseButton onClick={closeModal}>&times;</CloseButton>
              </ModalHeader>
              <ModalBody>
                <FormGroup>
                  <label>Nombre del Rol:</label>
                  <input 
                    type="text" 
                    value={roleName} 
                    onChange={e => setRoleName(e.target.value)}
                    disabled={!isNew && selectedRole.is_system === 1}
                    placeholder="Ej. Auditor Financiero"
                  />
                </FormGroup>

                {isNew && (
                  <FormGroup>
                    <label>Código del Rol (slug):</label>
                    <input 
                      type="text" 
                      value={roleCode} 
                      onChange={e => setRoleCode(e.target.value)}
                      placeholder="Ej. auditor_financiero"
                    />
                  </FormGroup>
                )}

                <FormGroup>
                  <label>Descripción:</label>
                  <textarea 
                    value={roleDescription} 
                    onChange={e => setRoleDescription(e.target.value)}
                    placeholder="Describe los alcances y responsabilidades de este rol..."
                  />
                </FormGroup>

                <SectionTitle>Permisos del Rol</SectionTitle>
                {selectedRole.code === 'root' ? (
                  <p style={{ color: '#48d64c', fontWeight: 'bold' }}>El Super Administrador (root) posee implícitamente todos los privilegios del sistema.</p>
                ) : (
                  <PermissionGroupList>
                    {categories.map(cat => {
                      const visiblePermissions = cat.permissions?.filter((perm: any) => {
                        if (onlyShowChecked) {
                          return rolePermissionIds.includes(perm.id);
                        }
                        return true;
                      }) || [];

                      if (onlyShowChecked && visiblePermissions.length === 0) {
                        return null;
                      }

                      return (
                        <CategoryBlock key={cat.id}>
                          <CategoryName>{cat.name}</CategoryName>
                          <CheckboxGrid>
                            {visiblePermissions.map((perm: any) => (
                              <CheckboxLabel key={perm.id} title={perm.description}>
                                <input 
                                  type="checkbox" 
                                  checked={rolePermissionIds.includes(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                />
                                <span>{perm.name}</span>
                              </CheckboxLabel>
                            ))}
                          </CheckboxGrid>
                        </CategoryBlock>
                      );
                    })}
                    {onlyShowChecked && !categories.some(cat => cat.permissions?.some((p: any) => rolePermissionIds.includes(p.id))) && (
                      <p style={{ color: '#aaa', textAlign: 'center', padding: '1rem', fontSize: '0.9rem' }}>No hay permisos seleccionados (activos) en este rol.</p>
                    )}
                  </PermissionGroupList>
                )}
              </ModalBody>
              <ModalFooter>
                {selectedRole.code !== 'root' && (
                  <FilterCheckedButton 
                    type="button" 
                    $active={onlyShowChecked} 
                    onClick={() => setOnlyShowChecked(!onlyShowChecked)}
                  >
                    {onlyShowChecked ? "Mostrar Todos" : "Solo Activos"}
                  </FilterCheckedButton>
                )}
                <Button secondary onClick={closeModal}>Cancelar</Button>
                {selectedRole.code !== 'root' && (
                  <Button onClick={saveRole} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                )}
              </ModalFooter>
            </ModalContent>
          </ModalOverlay>,
          document.getElementById('modal-portal-root')!
        )
      }


    </Container>
  );
}

// Styled Components Premium
const Container = styled.div`
  color: white;
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;
const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;
const Subtitle = styled.p`
  color: #aaa;
`;
const AddButton = styled.button`
  background: var(--emerald, #48d64c);
  color: black;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(72, 214, 76, 0.2);
  }
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
  }
`;
const Code = styled.code`
  background: rgba(255, 255, 255, 0.08);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #f0f0f0;
  font-family: monospace;
`;
const SystemBadge = styled.span`
  background: rgba(0, 150, 255, 0.15);
  color: #0096ff;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  border: 1px solid rgba(0, 150, 255, 0.3);
`;
const CustomBadge = styled.span`
  background: rgba(255, 165, 0, 0.15);
  color: #ffa500;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  border: 1px solid rgba(255, 165, 0, 0.3);
`;
const PermCount = styled.span`
  background: rgba(255, 255, 255, 0.04);
  color: #ccc;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: help;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;
const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;
const ActionButton = styled.button<{danger?: boolean}>`
  background: ${p => p.danger ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${p => p.danger ? '#ff4444' : '#fff'};
  border: 1px solid ${p => p.danger ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
  padding: 0.3rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s ease;
  &:hover {
    background: ${p => p.danger ? 'rgba(255, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.15)'};
  }
`;

// Modal y Formularios
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
  width: 650px;
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
`;
const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  label {
    font-size: 0.9rem;
    color: #ccc;
    font-weight: 500;
  }
  input, textarea {
    background: #1e1e1e;
    border: 1px solid rgba(255,255,255,0.1);
    color: white;
    padding: 0.6rem;
    border-radius: 6px;
    font-size: 0.95rem;
    outline: none;
    &:focus {
      border-color: var(--emerald, #48d64c);
    }
  }
  textarea {
    resize: vertical;
    min-height: 80px;
  }
`;
const SectionTitle = styled.h4`
  color: #fff;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding-bottom: 0.4rem;
`;
const PermissionGroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;
const CategoryBlock = styled.div`
  background: rgba(255,255,255,0.01);
  border: 1px solid rgba(255,255,255,0.04);
  padding: 1rem;
  border-radius: 8px;
`;
const CategoryName = styled.h5`
  color: var(--emerald, #48d64c);
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
`;
const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`;
const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: #aaa;
  transition: color 0.15s ease;
  &:hover {
    color: white;
  }
  input { transform: scale(1.1); }
`;
const Button = styled.button<{secondary?: boolean}>`
  background: ${p => p.secondary ? 'rgba(255,255,255,0.08)' : 'var(--emerald, #48d64c)'};
  color: ${p => p.secondary ? 'white' : 'black'};
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  &:disabled { opacity: 0.5; }
`;
const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

// New Styled Components for Permissions Analysis
const HeaderButtons = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const FilterCheckedButton = styled.button<{ $active?: boolean }>`
  background: ${props => props.$active ? 'rgba(72, 214, 76, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$active ? 'var(--emerald, #48d64c)' : '#aaa'};
  border: 1px solid ${props => props.$active ? 'var(--emerald, #48d64c)' : 'rgba(255, 255, 255, 0.1)'};
  padding: 0.6rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  margin-right: auto;
  transition: all 0.2s ease;
  &:hover {
    background: ${props => props.$active ? 'rgba(72, 214, 76, 0.25)' : 'rgba(255, 255, 255, 0.1)'};
    color: white;
  }
`;


