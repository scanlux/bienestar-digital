'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.65rem 2.5rem 0.65rem 1rem;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: var(--emerald);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:hover {
    color: #fff;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 105%;
  left: 0;
  width: 100%;
  background: #181818;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
`;

const DropdownItem = styled.div`
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MainText = styled.span`
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
`;

const SubText = styled.span`
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
`;

const Badge = styled.span<{ $type: string }>`
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${props => {
    if (props.$type === 'store') return 'rgba(245, 158, 11, 0.15)';
    if (props.$type === 'commerce') return 'rgba(59, 130, 246, 0.15)';
    if (props.$type === 'user') return 'rgba(16, 185, 129, 0.15)';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  color: ${props => {
    if (props.$type === 'store') return '#f59e0b';
    if (props.$type === 'commerce') return '#3b82f6';
    if (props.$type === 'user') return '#10b981';
    return '#fff';
  }};
`;

const SelectionCard = styled.div`
  background: rgba(16, 185, 129, 0.06);
  border: 1px dashed var(--emerald);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;

interface WalletSearchInputProps {
  onSelectWallet: (walletId: number | null, walletInfo: any | null) => void;
  selectedWalletId: number | null;
  placeholder?: string;
}

export default function WalletSearchInput({ 
  onSelectWallet, 
  selectedWalletId, 
  placeholder = 'Buscar por nombre, email, teléfono o ID Billetera...' 
}: WalletSearchInputProps) {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown si se hace click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Efecto para buscar con debouncing
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      searchWallets(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const searchWallets = async (query: string) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/cash/wallets/search?q=${encodeURIComponent(query)}`, { headers });
      setResults(response.data);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (wallet: any) => {
    setSelectedWallet(wallet);
    onSelectWallet(wallet.wallet_id, wallet);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedWallet(null);
    onSelectWallet(null, null);
    setSearchTerm('');
    setResults([]);
  };

  if (selectedWalletId && selectedWallet) {
    return (
      <SelectionCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <Row style={{ gap: '0.5rem', justifyContent: 'flex-start' }}>
            <MainText>{selectedWallet.owner_name}</MainText>
            <Badge $type={selectedWallet.owner_type}>{selectedWallet.owner_type}</Badge>
          </Row>
          <SubText>
            Billetera ID: <strong>#{selectedWallet.wallet_id}</strong> | 
            Saldo: <strong>{parseFloat(selectedWallet.balance_custody).toLocaleString('es-CO')} DOMIs</strong>
          </SubText>
          {selectedWallet.owner_email && (
            <SubText style={{ fontSize: '0.72rem' }}>{selectedWallet.owner_email}</SubText>
          )}
        </div>
        <RemoveButton 
          type="button" 
          onClick={handleClear}
        >
          Quitar
        </RemoveButton>
      </SelectionCard>
    );
  }

  return (
    <Container ref={dropdownRef}>
      <InputWrapper>
        <SearchInput
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: '2.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            ...
          </span>
        )}
        {searchTerm && (
          <ClearButton type="button" onClick={() => setSearchTerm('')}>
            &times;
          </ClearButton>
        )}
      </InputWrapper>

      {showDropdown && results.length > 0 && (
        <Dropdown>
          {results.map((r) => (
            <DropdownItem key={r.wallet_id} onClick={() => handleSelect(r)}>
              <Row>
                <MainText>{r.owner_name}</MainText>
                <Badge $type={r.owner_type}>{r.owner_type}</Badge>
              </Row>
              <Row>
                <SubText>Billetera #{r.wallet_id}</SubText>
                <SubText style={{ color: 'var(--emerald)', fontWeight: 'bold' }}>
                  {parseFloat(r.balance_custody).toLocaleString('es-CO')} DOMIs
                </SubText>
              </Row>
              {(r.owner_email || r.owner_phone) && (
                <SubText style={{ fontSize: '0.72rem' }}>
                  {r.owner_email} {r.owner_phone ? `| ${r.owner_phone}` : ''}
                </SubText>
              )}
            </DropdownItem>
          ))}
        </Dropdown>
      )}

      {showDropdown && searchTerm.trim().length >= 2 && results.length === 0 && !loading && (
        <Dropdown>
          <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            No se encontraron billeteras coincidentes.
          </div>
        </Dropdown>
      )}
    </Container>
  );
}
