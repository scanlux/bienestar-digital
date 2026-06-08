'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';

export default function PermissionsAnalysisPage() {
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
      alert('No autorizado para ver el análisis de permisos.');
      router.push('/admin/dashboard/roles');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/admin/dashboard/roles');
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
            Análisis detallado de criticidad, alcance de seguridad y afectación de bases de datos de los 32 privilegios del sistema.
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
                <th>Tablas DB</th>
                <th>Endpoints</th>
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
                    <td style={{ verticalAlign: 'top', minWidth: '150px' }}>
                      <TableBadgeList style={{ marginBottom: 0 }}>
                        {p.impactedTables.map((table: string) => (
                          <TableBadge key={table}>{table}</TableBadge>
                        ))}
                      </TableBadgeList>
                    </td>
                    <td style={{ verticalAlign: 'top', minWidth: '200px' }}>
                      <EndpointList>
                        {p.endpoints.map((ep: string) => {
                          const parts = ep.split(' ');
                          const method = parts[0];
                          const route = parts.slice(1).join(' ');
                          return (
                            <EndpointRow key={ep}>
                              <MethodBadge method={method}>{method}</MethodBadge>
                              <RouteCode>{route}</RouteCode>
                            </EndpointRow>
                          );
                        })}
                      </EndpointList>
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
                  <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>
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
                    <PermCodeBadge>{p.code}</PermCodeBadge>
                  </div>
                  <CriticidadBadge criticidad={p.criticidad}>{p.criticidad}</CriticidadBadge>
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
                  {p.endpoints.map((ep: string) => {
                    const parts = ep.split(' ');
                    const method = parts[0];
                    const route = parts.slice(1).join(' ');
                    return (
                      <EndpointRow key={ep}>
                        <MethodBadge method={method}>{method}</MethodBadge>
                        <RouteCode>{route}</RouteCode>
                      </EndpointRow>
                    );
                  })}
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
