import React from 'react';
import styled from 'styled-components';
import { AuditFilters } from './hooks/useAuditLog';

const EVENT_TYPES = [
  { id: '', label: 'Todos los eventos' },
  { id: 'BOLA_ATTEMPT', label: 'Intento BOLA / IDOR' },
  { id: 'UNAUTHORIZED_ROUTE_ACCESS', label: 'Acceso no autorizado a ruta' },
  { id: 'FAILED_LOGIN_ATTEMPT', label: 'Fallo de inicio de sesión' },
  { id: 'SUCCESSFUL_LOGIN', label: 'Inicio de sesión exitoso' }
];

const SEVERITIES = [
  { id: '', label: 'Todas las gravedades' },
  { id: 'LOW', label: 'Baja (LOW)' },
  { id: 'MEDIUM', label: 'Media (MEDIUM)' },
  { id: 'HIGH', label: 'Alta (HIGH)' },
  { id: 'CRITICAL', label: 'Crítica (CRITICAL)' }
];

interface Props {
  filters: AuditFilters;
  updateFilter: (key: keyof AuditFilters, value: string) => void;
  onReset: () => void;
}

export default function SecurityAuditFilters({ filters, updateFilter, onReset }: Props) {
  return (
    <FilterBar>
      <FilterGroup>
        <Label>Tipo de Evento</Label>
        <Select value={filters.eventType} onChange={e => updateFilter('eventType', e.target.value)}>
          {EVENT_TYPES.map(e => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </Select>
      </FilterGroup>

      <FilterGroup>
        <Label>Severidad</Label>
        <Select value={filters.severity} onChange={e => updateFilter('severity', e.target.value)}>
          {SEVERITIES.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </Select>
      </FilterGroup>

      <FilterGroup>
        <Label>Tipo de Actor</Label>
        <Select value={filters.actorType || ''} onChange={e => updateFilter('actorType', e.target.value)}>
          <option value="">Todos los actores</option>
          <option value="ADMIN">Administradores</option>
          <option value="SYSTEM">Sistema / Anónimo</option>
          <option value="USER">Usuarios</option>
        </Select>
      </FilterGroup>

      <FilterGroup>
        <Label>Desde</Label>
        <Input type="date" value={filters.startDate || ''} onChange={e => updateFilter('startDate', e.target.value)} />
      </FilterGroup>

      <FilterGroup>
        <Label>Hasta</Label>
        <Input type="date" value={filters.endDate || ''} onChange={e => updateFilter('endDate', e.target.value)} />
      </FilterGroup>

      <Button onClick={onReset} secondary style={{ alignSelf: 'flex-end', height: '42px' }}>
        Limpiar Filtros
      </Button>
    </FilterBar>
  );
}

const FilterBar = styled.div`
  display: flex;
  gap: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 20px;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 140px;
`;

const Label = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Select = styled.select`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 10px 14px;
  border-radius: 10px;
  outline: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #10b981;
  }
  option {
    background: #141414;
    color: white;
  }
`;

const Input = styled.input`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 10px 14px;
  border-radius: 10px;
  outline: none;
  font-size: 0.9rem;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #10b981;
  }
`;

const Button = styled.button<{ secondary?: boolean }>`
  background: ${props => props.secondary ? 'rgba(255, 255, 255, 0.05)' : '#10b981'};
  color: ${props => props.secondary ? '#ffffff' : '#000000'};
  border: 1px solid ${props => props.secondary ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.secondary ? 'rgba(255, 255, 255, 0.1)' : 'rgba(72, 214, 76, 0.85)'};
    transform: translateY(-1px);
  }
`;
