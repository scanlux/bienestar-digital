import React from 'react';
import styled from 'styled-components';
import { PanelTabs, Tab, FormInput } from '../../AdminDashboardStyles';

const FiltersContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  flex-wrap: wrap;
`;

interface RequestFiltersProps {
  activeTab: 'pending' | 'processed' | 'invitations';
  setActiveTab: (tab: 'pending' | 'processed' | 'invitations') => void;
  pendingCount: number;
  processedCount: number;
  invitationsCount: number;
  searchCommerce: string;
  setSearchCommerce: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterDate: string;
  setFilterDate: (val: string) => void;
}

export default function RequestFilters({
  activeTab, setActiveTab, pendingCount, processedCount, invitationsCount,
  searchCommerce, setSearchCommerce, filterStatus, setFilterStatus, filterDate, setFilterDate
}: RequestFiltersProps) {
  return (
    <>
      <PanelTabs>
        <Tab $active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
          Solicitudes Pendientes ({pendingCount})
        </Tab>
        <Tab $active={activeTab === 'processed'} onClick={() => setActiveTab('processed')}>
          Solicitudes Procesadas ({processedCount})
        </Tab>
        <Tab $active={activeTab === 'invitations'} onClick={() => setActiveTab('invitations')}>
          Invitaciones Enviadas ({invitationsCount})
        </Tab>
      </PanelTabs>
      {(activeTab === 'pending' || activeTab === 'processed') && (
        <FiltersContainer>
          <FormInput 
            placeholder="Buscar por comercio o NIT..." 
            value={searchCommerce} 
            onChange={(e) => setSearchCommerce(e.target.value)} 
            style={{ width: '250px' }}
          />
          {activeTab === 'processed' && (
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', 
                padding: '10px', borderRadius: '8px', outline: 'none'
              }}
            >
              <option value="">Todos los estados</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          )}
          <FormInput 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
          />
        </FiltersContainer>
      )}
    </>
  );
}
