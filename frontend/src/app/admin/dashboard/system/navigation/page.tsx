'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '@/constants';

interface NavigationItem {
  id: number;
  parent_id: number | null;
  label: string;
  page_title: string | null;
  path: string | null;
  icon: string | null;
  required_permission: string | null;
  order_index: number;
  layout_scope: 'admin' | 'commerce' | 'store' | 'delivery';
  risk_level: 'normal' | 'high' | 'critical';
  is_system: number;
}

export default function NavigationManagementPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedScope, setSelectedScope] = useState<'admin' | 'commerce' | 'store' | 'delivery'>('admin');
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [formData, setFormData] = useState<Partial<NavigationItem>>({});
  const [localItems, setLocalItems] = useState<NavigationItem[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Obtener items del menú del sistema
  const { data: serverItems = [], isLoading } = useQuery<NavigationItem[]>({
    queryKey: ['systemNavigation'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/manage/system/navigation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: !!token
  });

  // Sincronizar items locales con los obtenidos del servidor al cambiar de scope o recibir datos
  useEffect(() => {
    if (serverItems.length > 0) {
      const filtered = serverItems.filter(item => item.layout_scope === selectedScope);
      // Ordenar por order_index
      const sorted = [...filtered].sort((a, b) => a.order_index - b.order_index);
      setLocalItems(sorted);
    }
  }, [serverItems, selectedScope]);

  // Toast Timer
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Reordenamiento local
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...localItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Intercambiar posiciones en el array
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Re-asignar order_index (múltiplos de 10)
    const updated = newItems.map((item, idx) => ({
      ...item,
      order_index: (idx + 1) * 10
    }));

    setLocalItems(updated);
  };

  // Guardar el nuevo orden de navegación en el backend
  const handleSaveOrder = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      // Mapear al formato esperado por el bulkUpdate
      const payload = localItems.map(item => ({
        id: item.id,
        order_index: item.order_index,
        parent_id: item.parent_id
      }));

      await axios.put(
        `${API_URL}/api/manage/system/navigation/reorder`,
        { items: payload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMsg('Orden de los menús guardado y propagado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['systemNavigation'] });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'No se pudo guardar el orden de los menús.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cargar item en formulario de edición
  const handleEditClick = (item: NavigationItem) => {
    setEditingItem(item);
    setFormData({ ...item });
  };

  // Guardar modificaciones del item individual
  const handleSaveItemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      await axios.patch(
        `${API_URL}/api/manage/system/navigation/${editingItem.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMsg(`Menú "${formData.label}" actualizado con éxito.`);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['systemNavigation'] });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'No se pudo actualizar el menú.');
    } finally {
      setIsSaving(false);
    }
  };

  // Invalidación de Sesiones
  const handleInvalidateSessions = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await axios.post(
        `${API_URL}/api/manage/system/maintenance/panic`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg('Sesiones de usuario invalidadas. La cache del menú ha sido expirada en Redis.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Fallo al invalidar las sesiones.');
    } finally {
      setIsSaving(false);
    }
  };

  // Jerarquía
  const roots = localItems.filter(item => !item.parent_id);
  const getChildrenOf = (parentId: number) => localItems.filter(item => item.parent_id === parentId);

  return (
    <Container>
      <Header>
        <div>
          <Title>Gestión de Menú</Title>
          <Subtitle>Configuración dinámica de navegación del ecosistema basada en permisos (SSOT)</Subtitle>
        </div>
        <HeaderActions>
          <InvalidateButton onClick={handleInvalidateSessions} disabled={isSaving} title="Fuerza a todos los usuarios del ecosistema a recargar su sesión y permisos">
            ⚡ Invalidar Caché de Sesiones
          </InvalidateButton>
          <SaveButton onClick={handleSaveOrder} disabled={isSaving || localItems.length === 0}>
            {isSaving ? 'Guardando...' : '💾 Guardar Orden'}
          </SaveButton>
        </HeaderActions>
      </Header>

      {successMsg && <Alert $type="success">{successMsg}</Alert>}
      {errorMsg && <Alert $type="error">{errorMsg}</Alert>}

      <TabContainer>
        <TabButton $active={selectedScope === 'admin'} onClick={() => setSelectedScope('admin')}>
          Administración
        </TabButton>
        <TabButton $active={selectedScope === 'commerce'} onClick={() => setSelectedScope('commerce')}>
          Comercio
        </TabButton>
        <TabButton $active={selectedScope === 'store'} onClick={() => setSelectedScope('store')}>
          Sedes (Store)
        </TabButton>
        <TabButton $active={selectedScope === 'delivery'} onClick={() => setSelectedScope('delivery')}>
          Delivery
        </TabButton>
      </TabContainer>

      <ContentGrid>
        <ListSection>
          <SectionTitle>Estructura de Navegación ({selectedScope.toUpperCase()})</SectionTitle>
          {isLoading ? (
            <LoadingPlaceholder>Cargando estructura de navegación del sistema...</LoadingPlaceholder>
          ) : roots.length === 0 ? (
            <EmptyPlaceholder>No hay ítems configurados en este scope.</EmptyPlaceholder>
          ) : (
            <TreeContainer>
              {roots.map((root, rootIdx) => {
                const subItems = getChildrenOf(root.id);
                return (
                  <RootGroup key={root.id}>
                    <ItemRow $isRoot={true}>
                      <ItemDragControls>
                        <ArrowButton onClick={() => moveItem(localItems.indexOf(root), 'up')} disabled={rootIdx === 0}>▲</ArrowButton>
                        <ArrowButton onClick={() => moveItem(localItems.indexOf(root), 'down')} disabled={rootIdx === roots.length - 1}>▼</ArrowButton>
                      </ItemDragControls>
                      <ItemInfo>
                        <ItemLabel>{root.label}</ItemLabel>
                        <ItemPath>{root.path || '(Menú Padre)'}</ItemPath>
                        {root.required_permission && <ItemBadge>{root.required_permission}</ItemBadge>}
                        {root.risk_level !== 'normal' && <RiskBadge $level={root.risk_level}>{root.risk_level}</RiskBadge>}
                      </ItemInfo>
                      <ItemActions>
                        <EditButton onClick={() => handleEditClick(root)}>✏️ Editar</EditButton>
                      </ItemActions>
                    </ItemRow>
                    {subItems.length > 0 && (
                      <ChildrenContainer>
                        {subItems.map((sub, subIdx) => (
                          <ItemRow key={sub.id} $isRoot={false}>
                            <ItemDragControls>
                              <ArrowButton onClick={() => moveItem(localItems.indexOf(sub), 'up')} disabled={subIdx === 0}>▲</ArrowButton>
                              <ArrowButton onClick={() => moveItem(localItems.indexOf(sub), 'down')} disabled={subIdx === subItems.length - 1}>▼</ArrowButton>
                            </ItemDragControls>
                            <ItemInfo>
                              <ItemLabel>{sub.label}</ItemLabel>
                              <ItemPath>{sub.path}</ItemPath>
                              {sub.required_permission && <ItemBadge>{sub.required_permission}</ItemBadge>}
                              {sub.risk_level !== 'normal' && <RiskBadge $level={sub.risk_level}>{sub.risk_level}</RiskBadge>}
                            </ItemInfo>
                            <ItemActions>
                              <EditButton onClick={() => handleEditClick(sub)}>✏️ Editar</EditButton>
                            </ItemActions>
                          </ItemRow>
                        ))}
                      </ChildrenContainer>
                    )}
                  </RootGroup>
                );
              })}
            </TreeContainer>
          )}
        </ListSection>

        <EditSection>
          <SectionTitle>{editingItem ? 'Editar Menú' : 'Información'}</SectionTitle>
          {editingItem ? (
            <EditCard onSubmit={handleSaveItemEdit}>
              <FormGroup>
                <Label>ID del Registro (BD)</Label>
                <Input type="text" value={editingItem.id} disabled />
              </FormGroup>

              <FormRow>
                <FormGroup>
                  <Label>Título Sidebar</Label>
                  <Input 
                    type="text" 
                    value={formData.label || ''} 
                    onChange={e => setFormData({ ...formData, label: e.target.value })} 
                    required 
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Título Banner Superior</Label>
                  <Input 
                    type="text" 
                    value={formData.page_title || ''} 
                    onChange={e => setFormData({ ...formData, page_title: e.target.value })} 
                  />
                </FormGroup>
              </FormRow>

              <FormGroup>
                <Label>Ruta / Enlace (Frontend)</Label>
                <Input 
                  type="text" 
                  value={formData.path || ''} 
                  onChange={e => setFormData({ ...formData, path: e.target.value })} 
                  placeholder="/admin/dashboard/..."
                />
              </FormGroup>

              <FormGroup>
                <Label>Permiso Atómico Requerido</Label>
                <Input 
                  type="text" 
                  value={formData.required_permission || ''} 
                  onChange={e => setFormData({ ...formData, required_permission: e.target.value })} 
                  placeholder="ej. manage_rbac"
                />
              </FormGroup>

              <FormRow>
                <FormGroup>
                  <Label>Nivel de Criticidad (Auditoría)</Label>
                  <Select 
                    value={formData.risk_level || 'normal'} 
                    onChange={e => setFormData({ ...formData, risk_level: e.target.value as any })}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Alto (Monitoreado)</option>
                    <option value="critical">Crítico (Bloqueo en Mantenimiento)</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Layout Scope</Label>
                  <Select 
                    value={formData.layout_scope || 'admin'} 
                    onChange={e => setFormData({ ...formData, layout_scope: e.target.value as any })}
                    disabled={editingItem.is_system === 1}
                  >
                    <option value="admin">Administrador</option>
                    <option value="commerce">Comercio</option>
                    <option value="store">Sede (Store)</option>
                    <option value="delivery">Delivery</option>
                  </Select>
                </FormGroup>
              </FormRow>

              <FormGroup>
                <Label>SVG Icon Path (Solo si es menú raíz)</Label>
                <TextArea 
                  rows={3}
                  value={formData.icon || ''} 
                  onChange={e => setFormData({ ...formData, icon: e.target.value })} 
                  placeholder="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
                />
              </FormGroup>

              {editingItem.is_system === 1 && (
                <SystemWarning>
                  ⚠️ Este es un menú del sistema. El layout scope y las restricciones fundamentales están protegidas contra alteraciones.
                </SystemWarning>
              )}

              <FormActions>
                <CancelButton type="button" onClick={() => setEditingItem(null)}>Cancelar</CancelButton>
                <SubmitButton type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Actualizar Ítem'}
                </SubmitButton>
              </FormActions>
            </EditCard>
          ) : (
            <InfoCard>
              <InfoTitle>Single Source of Truth</InfoTitle>
              <InfoText>
                La navegación ahora es totalmente dinámica. Al guardar el orden o editar un menú, los cambios impactarán en caliente en el sidebar de todos los usuarios según su rol.
              </InfoText>
              <InfoText>
                Selecciona un menú del árbol de la izquierda mediante el botón <strong>✏️ Editar</strong> para configurar sus títulos, permisos y criticidad.
              </InfoText>
            </InfoCard>
          )}
        </EditSection>
      </ContentGrid>
    </Container>
  );
}

// ------------- STYLED COMPONENTS -------------
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.9rem;
  color: rgba(255,255,255,0.4);
  margin: 0.25rem 0 0 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const SaveButton = styled.button`
  background: var(--emerald, #10b981);
  color: #000;
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #059669;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const InvalidateButton = styled.button`
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
  font-weight: 600;
  padding: 0.65rem 1.25rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.2);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
  }
`;

const Alert = styled.div<{ $type: 'success' | 'error' }>`
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  background: ${props => props.$type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${props => props.$type === 'success' ? '#10b981' : '#ef4444'};
  border: 1px solid ${props => props.$type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
`;

const TabContainer = styled.div`
  display: flex;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.5rem;
  padding: 0.25rem;
  width: fit-content;
`;

const TabButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? 'rgba(255,255,255,0.05)' : 'transparent'};
  color: ${props => props.$active ? '#fff' : 'rgba(255,255,255,0.4)'};
  border: none;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border-radius: 0.35rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #fff;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const ListSection = styled.div`
  background: rgba(15, 15, 15, 0.8);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: #fff;
`;

const LoadingPlaceholder = styled.div`
  padding: 3rem;
  text-align: center;
  color: rgba(255,255,255,0.3);
  font-size: 0.9rem;
`;

const EmptyPlaceholder = styled.div`
  padding: 3rem;
  text-align: center;
  color: rgba(255,255,255,0.3);
  font-size: 0.9rem;
`;

const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RootGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ChildrenContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 2.5rem;
  border-left: 1px dashed rgba(255,255,255,0.1);
`;

const ItemRow = styled.div<{ $isRoot: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${props => props.$isRoot ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)'};
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 0.5rem;
  transition: background 0.2s;

  &:hover {
    background: rgba(255,255,255,0.04);
  }
`;

const ItemDragControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ArrowButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.3);
  font-size: 8px;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;

  &:hover:not(:disabled) {
    color: #fff;
    background: rgba(255,255,255,0.1);
  }

  &:disabled {
    opacity: 0.15;
    cursor: not-allowed;
  }
`;

const ItemInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ItemLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
`;

const ItemPath = styled.span`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.35);
  font-family: monospace;
`;

const ItemBadge = styled.span`
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
`;

const RiskBadge = styled.span<{ $level: string }>`
  font-size: 9px;
  font-weight: bold;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${props => props.$level === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
  color: ${props => props.$level === 'critical' ? '#ef4444' : '#f59e0b'};
`;

const ItemActions = styled.div``;

const EditButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.35rem 0.65rem;
  border-radius: 0.35rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.05);
    color: #fff;
    border-color: rgba(255,255,255,0.2);
  }
`;

const EditSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EditCard = styled.form`
  background: rgba(15, 15, 15, 0.8);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
`;

const FormRow = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 576px) {
    flex-direction: column;
  }
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
`;

const Input = styled.input`
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.6rem 0.80rem;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--emerald, #10b981);
    background: rgba(255,255,255,0.04);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  background: rgba(15, 15, 15, 0.95);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.6rem 0.80rem;
  font-size: 0.85rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--emerald, #10b981);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.6rem 0.80rem;
  font-size: 0.85rem;
  font-family: monospace;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--emerald, #10b981);
  }
`;

const SystemWarning = styled.div`
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  line-height: 1.4;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const CancelButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
  padding: 0.55rem 1.25rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.02);
    color: #fff;
  }
`;

const SubmitButton = styled.button`
  background: var(--emerald, #10b981);
  color: #000;
  font-weight: 600;
  padding: 0.55rem 1.25rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #059669;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const InfoCard = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 0.75rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InfoTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #fff;
`;

const InfoText = styled.p`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.4);
  line-height: 1.5;
  margin: 0;
`;
