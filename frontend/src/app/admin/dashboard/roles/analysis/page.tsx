'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';

export default function PermissionsAnalysisPage() {
  const toast = useToast();
  const [analysisData, setAnalysisData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const router = useRouter();

  // Filtros y Vista
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCriticidad, setFilterCriticidad] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isListView, setIsListView] = useState(true); // Modo lista por defecto

  // Configuración de visibilidad (PRP)
  const [selectedPermission, setSelectedPermission] = useState<any | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [updatingPermId, setUpdatingPermId] = useState<number | null>(null);
  const [tempMode, setTempMode] = useState<'ghost' | 'hidden' | 'disabled'>('hidden');

  useEffect(() => {
    if (token) {
      fetchAnalysis();
    }
  }, [token]);

  const fetchAnalysis = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/manage/permissions-analysis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalysisData(res.data);
    } catch (err) {
      console.error('Error fetching analysis data:', err);
      toast.error('No autorizado para ver el análisis de permisos.');
      router.push('/admin/dashboard/roles');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/admin/dashboard/roles');
  };

  const handleOpenConfig = (perm: any) => {
    setSelectedPermission(perm);
    setTempMode(perm.ui_restriction_mode || 'hidden');
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedPermission || !selectedPermission.id) return;
    setUpdatingPermId(selectedPermission.id);
    try {
      await axios.patch(`${API_URL}/api/manage/permissions/${selectedPermission.id}`, 
        { ui_restriction_mode: tempMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Modo de restricción de interfaz actualizado con éxito.');
      
      // Actualizar el estado local
      setAnalysisData(prev => prev.map(p => 
        p.code === selectedPermission.code 
          ? { ...p, ui_restriction_mode: tempMode }
          : p
      ));
      
      setShowConfigModal(false);
    } catch (err: any) {
      console.error('Error updating permission UI mode:', err);
      toast.error(err.response?.data?.error || 'Error al actualizar el modo de restricción.');
    } finally {
      setUpdatingPermId(null);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingText>Cargando análisis de privilegios del sistema...</LoadingText>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <div>
          <TitleContainer>
            <ShieldIcon />
            <Title>Auditoría e Impacto de Permisos Atómicos</Title>
          </TitleContainer>
          <Subtitle>
            Análisis detallado de criticidad, alcance de seguridad y afectación de bases de datos de los privilegios del sistema.
          </Subtitle>
        </div>
        <BackButton onClick={handleBack}>Volver a Roles</BackButton>
      </Header>

      {/* Sección de Estadísticas de Distribución */}
      <StatsOverviewBlock>
        <StatItem>
          <StatVal style={{ color: '#ff4444' }}>
            {analysisData.filter(p => p.criticidad === 'Crítica').length}
          </StatVal>
          <StatLabel>Críticos</StatLabel>
        </StatItem>
        <StatItem>
          <StatVal style={{ color: '#ffa500' }}>
            {analysisData.filter(p => p.criticidad === 'Alta').length}
          </StatVal>
          <StatLabel>Alta Criticidad</StatLabel>
        </StatItem>
        <StatItem>
          <StatVal style={{ color: '#ffeb3b' }}>
            {analysisData.filter(p => p.criticidad === 'Media').length}
          </StatVal>
          <StatLabel>Media</StatLabel>
        </StatItem>
        <StatItem>
          <StatVal style={{ color: '#48d64c' }}>
            {analysisData.filter(p => p.criticidad === 'Baja').length}
          </StatVal>
          <StatLabel>Baja</StatLabel>
        </StatItem>
        <StatItem style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '1.5rem' }}>
          <StatVal style={{ color: '#0096ff' }}>
            {new Set(analysisData.flatMap(p => p.impactedTables)).size}
          </StatVal>
          <StatLabel>Tablas DB Impactadas</StatLabel>
        </StatItem>
        <StatItem>
          <StatVal style={{ color: '#fff' }}>
            {analysisData.filter(p => p.tipo === 'Lectura').length}L / {analysisData.filter(p => p.tipo !== 'Lectura').length}E
          </StatVal>
          <StatLabel>Lectura vs Escritura</StatLabel>
        </StatItem>
      </StatsOverviewBlock>

      {/* Controles de Filtrado */}
      <FilterBar>
        <ViewModeButton 
          type="button" 
          onClick={() => setIsListView(!isListView)} 
          title={isListView ? "Cambiar a vista de cuadrícula" : "Cambiar a vista de lista"}
        >
          {isListView ? <GridIcon /> : <ListIcon />}
        </ViewModeButton>
        <SearchInput 
          type="text" 
          placeholder="Buscar por código, descripción, tabla o endpoint..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <SelectFilter value={filterCriticidad} onChange={e => setFilterCriticidad(e.target.value)}>
          <option value="">Criticidad (Todas)</option>
          <option value="Crítica">Crítica</option>
          <option value="Alta">Alta</option>
          <option value="Media">Media</option>
          <option value="Baja">Baja</option>
        </SelectFilter>
        <SelectFilter value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Tipo (Todos)</option>
          <option value="Lectura">Lectura</option>
          <option value="Escritura">Escritura</option>
          <option value="Financiero">Financiero</option>
          <option value="Seguridad">Seguridad</option>
        </SelectFilter>
        <SelectFilter value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">Módulo (Todos)</option>
          {Array.from(new Set(analysisData.map(p => p.category))).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </SelectFilter>
      </FilterBar>

      {isListView ? (
        <TableContainer>
          <Table>
            <thead>
              <tr>
                <th>Código / Funcionalidad / Alcance</th>
                <th>Categoría</th>
                <th>Criticidad</th>
                <th>Modo UI</th>
                <th>Tablas DB</th>
                <th>Endpoints</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {analysisData
                .filter(p => {
                  const matchesSearch = 
                    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.impactedTables.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    p.endpoints.some((e: string) => e.toLowerCase().includes(searchTerm.toLowerCase()));
                  const matchesCriticidad = !filterCriticidad || p.criticidad === filterCriticidad;
                  const matchesTipo = !filterTipo || p.tipo === filterTipo;
                  const matchesCategory = !filterCategory || p.category === filterCategory;

                  return matchesSearch && matchesCriticidad && matchesTipo && matchesCategory;
                })
                .map(p => (
                  <tr key={p.code}>
                    <td style={{ verticalAlign: 'top', minWidth: '240px' }}>
                      <div style={{ marginBottom: '0.6rem' }}>
                        <PermCodeBadge>{p.code}</PermCodeBadge>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.35rem', color: '#fff' }}>{p.name}</div>
                      <div style={{ color: '#aaa', fontSize: '0.85rem', lineHeight: '1.5' }}>{p.scope}</div>
                    </td>
                    <td style={{ verticalAlign: 'top' }}><span style={{ color: '#aaa', fontSize: '0.85rem' }}>{p.category}</span></td>
                    <td style={{ verticalAlign: 'top' }}>
                      <CriticidadBadge criticidad={p.criticidad}>{p.criticidad}</CriticidadBadge>
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <UIModeBadge mode={p.ui_restriction_mode}>{p.ui_restriction_mode}</UIModeBadge>
                    </td>
                    <td style={{ verticalAlign: 'top', minWidth: '150px' }}>
                      <TableBadgeList style={{ marginBottom: 0 }}>
                        {p.impactedTables.map((table: string) => (
                          <TableBadge key={table}>{table}</TableBadge>
                        ))}
                      </TableBadgeList>
                    </td>
                     <td style={{ verticalAlign: 'top', minWidth: '200px' }}>
                      <EndpointList>
                        {p.endpoints && p.endpoints.length > 0 && p.endpoints[0] !== '' ? (
                          p.endpoints.map((ep: string) => {
                            const parts = ep.split(' ');
                            const method = parts[0];
                            const route = parts.slice(1).join(' ');
                            return (
                              <EndpointRow key={ep}>
                                <MethodBadge method={method}>{method}</MethodBadge>
                                <RouteCode>{route}</RouteCode>
                              </EndpointRow>
                            );
                          })
                        ) : (
                          <NoEndpointsBadge>Exclusivo de Interfaz</NoEndpointsBadge>
                        )}
                      </EndpointList>
                    </td>
                    <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
                      {p.id ? (
                        <IconButton onClick={() => handleOpenConfig(p)} title="Configurar Visibilidad de Interfaz">
                          <SettingsIcon />
                        </IconButton>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              }
              {analysisData.filter(p => {
                const matchesSearch = 
                  p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.impactedTables.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  p.endpoints.some((e: string) => e.toLowerCase().includes(searchTerm.toLowerCase()));
                const matchesCriticidad = !filterCriticidad || p.criticidad === filterCriticidad;
                const matchesTipo = !filterTipo || p.tipo === filterTipo;
                const matchesCategory = !filterCategory || p.category === filterCategory;

                return matchesSearch && matchesCriticidad && matchesTipo && matchesCategory;
              }).length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>
                    No se encontraron privilegios que coincidan con los filtros de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </TableContainer>
      ) : (
        /* Grid de Tarjetas de Análisis */
        <AnalysisGrid>
          {analysisData
            .filter(p => {
              const matchesSearch = 
                p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.impactedTables.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
                p.endpoints.some((e: string) => e.toLowerCase().includes(searchTerm.toLowerCase()));
              const matchesCriticidad = !filterCriticidad || p.criticidad === filterCriticidad;
              const matchesTipo = !filterTipo || p.tipo === filterTipo;
              const matchesCategory = !filterCategory || p.category === filterCategory;

              return matchesSearch && matchesCriticidad && matchesTipo && matchesCategory;
            })
            .map(p => (
              <AnalysisCard key={p.code} criticidad={p.criticidad}>
                <CardHeader>
                  <div>
                    <PermCategoryTag>{p.category}</PermCategoryTag>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <PermCodeBadge>{p.code}</PermCodeBadge>
                      <UIModeBadge mode={p.ui_restriction_mode}>{p.ui_restriction_mode}</UIModeBadge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CriticidadBadge criticidad={p.criticidad}>{p.criticidad}</CriticidadBadge>
                    {p.id && (
                      <IconButton onClick={() => handleOpenConfig(p)} title="Configurar Visibilidad de Interfaz">
                        <SettingsIcon />
                      </IconButton>
                    )}
                  </div>
                </CardHeader>
                <PermTitle>{p.name}</PermTitle>
                <PermScope>{p.scope}</PermScope>
                
                <TagTitle>Impacto en Base de Datos:</TagTitle>
                <TableBadgeList>
                  {p.impactedTables.map((table: string) => (
                    <TableBadge key={table}>{table}</TableBadge>
                  ))}
                </TableBadgeList>

                <TagTitle>Endpoints Protegidos:</TagTitle>
                <EndpointList>
                  {p.endpoints && p.endpoints.length > 0 && p.endpoints[0] !== '' ? (
                    p.endpoints.map((ep: string) => {
                      const parts = ep.split(' ');
                      const method = parts[0];
                      const route = parts.slice(1).join(' ');
                      return (
                        <EndpointRow key={ep}>
                          <MethodBadge method={method}>{method}</MethodBadge>
                          <RouteCode>{route}</RouteCode>
                        </EndpointRow>
                      );
                    })
                  ) : (
                    <NoEndpointsBadge>Exclusivo de Interfaz</NoEndpointsBadge>
                  )}
                </EndpointList>
              </AnalysisCard>
            ))
          }
          {analysisData.filter(p => {
            const matchesSearch = 
              p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.impactedTables.some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
              p.endpoints.some((e: string) => e.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCriticidad = !filterCriticidad || p.criticidad === filterCriticidad;
            const matchesTipo = !filterTipo || p.tipo === filterTipo;
            const matchesCategory = !filterCategory || p.category === filterCategory;

            return matchesSearch && matchesCriticidad && matchesTipo && matchesCategory;
          }).length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '3rem' }}>
              No se encontraron privilegios que coincidan con los filtros de búsqueda.
            </div>
          )}
        </AnalysisGrid>
      )}

      {/* Modal de Configuración PRP */}
      {showConfigModal && selectedPermission && (
        <ModalOverlay onClick={() => setShowConfigModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Configurar Visibilidad: {selectedPermission.code}</ModalTitle>
              <CloseBtn onClick={() => setShowConfigModal(false)}>&times;</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Define cómo responderá la interfaz de usuario cuando un rol de usuario <strong>NO</strong> posea el permiso <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: '#ffa500' }}>{selectedPermission.code}</code> ({selectedPermission.name}).
              </p>
              
              <RadioGroup>
                <RadioLabel>
                  <RadioInput 
                    type="radio" 
                    name="uiMode" 
                    value="ghost" 
                    checked={tempMode === 'ghost'} 
                    onChange={() => setTempMode('ghost')} 
                  />
                  <div>
                    <RadioTitle>Mostrar bloqueado (ghost)</RadioTitle>
                    <RadioDesc>Se renderiza cubierto por un overlay semitransparente con blur y cursor denegado. Click abre un diálogo informativo u oferta de mejora (adquirir planes/upgrades).</RadioDesc>
                  </div>
                </RadioLabel>

                <RadioLabel>
                  <RadioInput 
                    type="radio" 
                    name="uiMode" 
                    value="hidden" 
                    checked={tempMode === 'hidden'} 
                    onChange={() => setTempMode('hidden')} 
                  />
                  <div>
                    <RadioTitle>No renderizar (hidden)</RadioTitle>
                    <RadioDesc>No se renderiza en absoluto (retorna null). El elemento es invisible en la interfaz y el usuario no sabrá que existe.</RadioDesc>
                  </div>
                </RadioLabel>

                <RadioLabel>
                  <RadioInput 
                    type="radio" 
                    name="uiMode" 
                    value="disabled" 
                    checked={tempMode === 'disabled'} 
                    onChange={() => setTempMode('disabled')} 
                  />
                  <div>
                    <RadioTitle>Solo lectura (disabled)</RadioTitle>
                    <RadioDesc>Se renderiza con propiedad &quot;disabled&quot; nativa de HTML, sin overlay de bloqueo. Apropiado para campos de formulario y controles.</RadioDesc>
                  </div>
                </RadioLabel>
              </RadioGroup>
            </ModalBody>
            <ModalFooter>
              <CancelBtn onClick={() => setShowConfigModal(false)}>Cancelar</CancelBtn>
              <SaveBtn onClick={handleSaveConfig} disabled={updatingPermId !== null}>
                {updatingPermId ? 'Guardando...' : 'Guardar Modo'}
              </SaveBtn>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
}

// Styled Components
const Container = styled.div`
  color: white;
  padding: 1.5rem 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const LoadingText = styled.p`
  color: #aaa;
  text-align: center;
  font-size: 1.1rem;
  padding: 4rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const Title = styled.h1`
  font-size: 1.6rem;
  margin: 0;
`;

const Subtitle = styled.p`
  color: #aaa;
  margin: 0;
  max-width: 800px;
  font-size: 0.92rem;
  line-height: 1.5;
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.08);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
`;

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--emerald, #48d64c)' }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const StatsOverviewBlock = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
  gap: 1.5rem;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 100px;
`;

const StatVal = styled.span`
  font-size: 1.4rem;
  font-weight: 700;
`;

const StatLabel = styled.span`
  font-size: 0.78rem;
  color: #888;
  margin-top: 0.35rem;
  text-align: center;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 2;
  min-width: 250px;
  background: #121212;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 0.65rem 1.2rem;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  &:focus {
    border-color: var(--emerald, #48d64c);
  }
`;

const SelectFilter = styled.select`
  flex: 1;
  min-width: 140px;
  background: #121212;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 0.65rem;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  &:focus {
    border-color: var(--emerald, #48d64c);
  }
`;

const AnalysisGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 2rem;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const AnalysisCard = styled.div<{criticidad: string}>`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid ${p => 
    p.criticidad === 'Crítica' ? 'rgba(255, 68, 68, 0.15)' : 
    p.criticidad === 'Alta' ? 'rgba(255, 165, 0, 0.15)' : 
    'rgba(255, 255, 255, 0.04)'
  };
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.02);
    border-color: ${p => 
      p.criticidad === 'Crítica' ? '#ff4444' : 
      p.criticidad === 'Alta' ? '#ffa500' : 
      'var(--emerald, #48d64c)'
    };
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const PermCategoryTag = styled.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 0.25rem;
`;

const PermCodeBadge = styled.code`
  background: rgba(255, 255, 255, 0.06);
  color: #e0e0e0;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: monospace;
`;

const CriticidadBadge = styled.span<{criticidad: string}>`
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  
  ${p => {
    switch(p.criticidad) {
      case 'Crítica':
        return `color: #ff4444; background: rgba(255, 68, 68, 0.12); border: 1px solid rgba(255, 68, 68, 0.3);`;
      case 'Alta':
        return `color: #ffa500; background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.3);`;
      case 'Media':
        return `color: #ffeb3b; background: rgba(255, 235, 59, 0.08); border: 1px solid rgba(255, 235, 59, 0.2);`;
      default:
        return `color: #48d64c; background: rgba(72, 214, 76, 0.08); border: 1px solid rgba(72, 214, 76, 0.2);`;
    }
  }}
`;

const PermTitle = styled.h4`
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0.25rem 0 0.5rem 0;
  color: #fff;
`;

const PermScope = styled.p`
  font-size: 0.85rem;
  color: #aaa;
  line-height: 1.4;
  margin: 0 0 1.25rem 0;
`;

const TagTitle = styled.span`
  font-size: 0.72rem;
  text-transform: uppercase;
  color: #666;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 0.4rem;
`;

const TableBadgeList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
`;

const TableBadge = styled.span`
  font-size: 0.72rem;
  background: rgba(0, 150, 255, 0.06);
  color: #0096ff;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  border: 1px solid rgba(0, 150, 255, 0.15);
`;

const EndpointList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const EndpointRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MethodBadge = styled.span<{method: string}>`
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.08rem 0.3rem;
  border-radius: 3px;
  min-width: 50px;
  text-align: center;
  
  ${p => {
    switch(p.method) {
      case 'GET':
        return `color: #0096ff; background: rgba(0, 150, 255, 0.12); border: 1px solid rgba(0, 150, 255, 0.2);`;
      case 'POST':
        return `color: #48d64c; background: rgba(72, 214, 76, 0.12); border: 1px solid rgba(72, 214, 76, 0.2);`;
      case 'DELETE':
        return `color: #ff4444; background: rgba(255, 68, 68, 0.12); border: 1px solid rgba(255, 68, 68, 0.2);`;
      default:
        return `color: #ffa500; background: rgba(255, 165, 0, 0.12); border: 1px solid rgba(255, 165, 0, 0.2);`;
    }
  }}
`;

const NoEndpointsBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  text-align: center;
  color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.25);
  display: inline-block;
`;

const RouteCode = styled.code`
  font-size: 0.75rem;
  color: #ccc;
  font-family: monospace;
`;

const ViewModeButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 0.9rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: var(--emerald, #48d64c);
    color: var(--emerald, #48d64c);
  }
`;

const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 2rem;
  width: 100%;
  max-width: calc(100vw - 260px - 4rem);
  box-sizing: border-box;
  
  /* Deslizador horizontal premium */
  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.01);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    transition: background 0.2s ease;
    &:hover {
      background: var(--emerald, #48d64c);
    }
  }
`;

const Table = styled.table`
  width: 100%;
  min-width: 1100px; /* Asegura el scroll horizontal en pantallas no ultra anchas */
  border-collapse: collapse;
  th, td {
    padding: 0.85rem 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  th {
    background: rgba(255, 255, 255, 0.01);
    color: #888;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.08);
  }
  tbody tr {
    transition: background 0.15s ease;
    &:hover {
      background: rgba(255, 255, 255, 0.01);
    }
  }
`;

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const UIModeBadge = styled.span<{mode: 'ghost' | 'hidden' | 'disabled'}>`
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  display: inline-block;
  
  ${p => {
    switch(p.mode) {
      case 'ghost':
        return `color: #ffc107; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.25);`;
      case 'hidden':
        return `color: #9e9e9e; background: rgba(158, 158, 158, 0.1); border: 1px solid rgba(158, 158, 158, 0.25);`;
      case 'disabled':
        return `color: #03a9f4; background: rgba(3, 169, 244, 0.1); border: 1px solid rgba(3, 169, 244, 0.25);`;
      default:
        return `color: #fff; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);`;
    }
  }}
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--emerald, #48d64c);
    transform: scale(1.08);
  }
`;

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
`;

const ModalContent = styled.div`
  background: #181818;
  border: 1px solid rgba(255, 255, 255, 0.08);
  width: 500px;
  max-width: 90%;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
`;

const CloseBtn = styled.button`
  background: transparent;
  border: none;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
  &:hover {
    color: #fff;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  flex: 1;
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RadioLabel = styled.label`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }
`;

const RadioInput = styled.input`
  margin-top: 0.25rem;
  cursor: pointer;
  accent-color: var(--emerald, #48d64c);
  transform: scale(1.1);
`;

const RadioTitle = styled.span`
  display: block;
  font-weight: 600;
  color: #fff;
  font-size: 0.95rem;
  margin-bottom: 0.15rem;
`;

const RadioDesc = styled.span`
  display: block;
  font-size: 0.8rem;
  color: #888;
  line-height: 1.4;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.01);
`;

const CancelBtn = styled.button`
  background: transparent;
  color: #aaa;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.55rem 1.1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
`;

const SaveBtn = styled.button`
  background: var(--emerald, #48d64c);
  color: #0c0c0c;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s;
  &:hover {
    background: #39be3d;
    transform: translateY(-1px);
  }
  &:disabled {
    background: #3c823f;
    cursor: not-allowed;
    color: rgba(0,0,0,0.5);
  }
`;

