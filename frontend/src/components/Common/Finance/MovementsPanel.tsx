import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { getAuthHeaders } from '@/utils/auth';
import { API_URL } from '@/constants';
import RecentMovementsList from '@/components/Common/RecentMovementsList';

const SearchFilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(8px);
  width: 100%;
`;

const SearchInputContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 250px;
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.5rem 1rem 0.5rem 2.25rem;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--emerald);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
`;

const FilterSelect = styled.select`
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  min-width: 150px;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--emerald);
  }

  option {
    background: #111;
    color: #fff;
  }
`;

const MovementsListContainer = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  width: 100%;
`;

interface StoreOption {
  storeId: number;
  nombreSucursal: string;
}

interface MovementsPanelProps {
  ownerType: 'store' | 'delivery_company';
  ownerId: number | string;
  storeOptions?: StoreOption[]; // Solo se pasa para Commerce (permite filtrar por cada una de sus sedes)
  token: string | null;
}

export const MovementsPanel: React.FC<MovementsPanelProps> = ({
  ownerType,
  ownerId,
  storeOptions = [],
  token
}) => {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('');

  // Debounce para la barra de búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Si cambia el ownerId (por ejemplo en rutas dinámicas), resetear el filtro por sede
  useEffect(() => {
    if (ownerType === 'store' && storeOptions.length === 0) {
      setStoreFilter(String(ownerId));
    }
  }, [ownerId, ownerType, storeOptions]);

  // Consultar historial de billetera desde domi api
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['walletHistory', ownerType, ownerId, debouncedSearch, storeFilter, txTypeFilter],
    queryFn: async ({ signal }) => {
      const headers = getAuthHeaders();
      let endpoint = '';
      let params: any = {
        search: debouncedSearch || undefined,
        txType: txTypeFilter || undefined
      };

      if (ownerType === 'store' && storeOptions.length > 0) {
        // Modo commerce: consume endpoint consolidado de historial de comercios
        endpoint = `${API_URL}/api/manage/commerces/stores/history`;
        params.storeId = storeFilter || undefined;
      } else {
        // Modo sede individual o delivery: consume el endpoint de billetera genérico
        endpoint = `${API_URL}/api/domi/wallet/${ownerType}/${storeFilter || ownerId}/history`;
      }

      const res = await axios.get(endpoint, {
        params,
        headers,
        signal
      });
      // El endpoint /commerces/stores/history devuelve { history: [...] }, el de wallet devuelve [...] directamente
      return Array.isArray(res.data) ? { history: res.data } : res.data;
    },
    enabled: !!token
  });

  const showStoreSelect = ownerType === 'store' && storeOptions.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <SearchFilterBar>
        {/* Barra de Búsqueda */}
        <SearchInputContainer>
          <SearchIcon>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </SearchIcon>
          <SearchInput
            type="text"
            placeholder="Buscar por notas o hash..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </SearchInputContainer>

        {/* Dropdown filtro por Sede (solo visible para admin de comercio) */}
        {showStoreSelect && (
          <FilterSelect
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
          >
            <option value="">Todas las Sedes</option>
            {storeOptions.map((store) => (
              <option key={store.storeId} value={store.storeId}>
                {store.nombreSucursal}
              </option>
            ))}
          </FilterSelect>
        )}

        {/* Filtro por Tipo de transaccion */}
        <FilterSelect
          value={txTypeFilter}
          onChange={(e) => setTxTypeFilter(e.target.value)}
        >
          <option value="">Todos los Tipos</option>
          <option value="mint">Recargas de Saldo</option>
          <option value="transfer">Transferencias</option>
          <option value="burn_service">Pagos de Plan / Servicio</option>
          <option value="refund">Reembolsos</option>
          <option value="rescue_cashback">Cashback por Rescate</option>
        </FilterSelect>
      </SearchFilterBar>

      <MovementsListContainer>
        <RecentMovementsList
          history={historyData?.history || []}
          loadingHistory={isLoading}
          ownerType={ownerType}
          ownerId={storeFilter || ownerId}
          showAll={true}
          showStoreNames={showStoreSelect}
        />
      </MovementsListContainer>
    </div>
  );
};
