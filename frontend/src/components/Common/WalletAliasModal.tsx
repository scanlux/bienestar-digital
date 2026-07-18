'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { API_URL } from '@/constants';
import { WalletOwnerType } from './Wallet/WalletTypes';
import { 
  ModalOverlay, ModalContent, ModalHeader, ModalTitle, CloseButton, SubmitButton 
} from './ModalStyles';
import { Spinner } from './UIElements';

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.8); }
  100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.4); }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

interface InputProps {
  $status: 'idle' | 'available' | 'taken' | 'invalid';
}

const Input = styled.input<InputProps>`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => {
    if (props.$status === 'available') return '#10b981';
    if (props.$status === 'taken' || props.$status === 'invalid') return '#ef4444';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 1rem;
  outline: none;
  font-family: monospace;
  transition: all 0.2s;
  box-shadow: ${props => {
    if (props.$status === 'available') return '0 0 8px rgba(16, 185, 129, 0.3)';
    if (props.$status === 'taken' || props.$status === 'invalid') return '0 0 8px rgba(239, 68, 68, 0.3)';
    return 'none';
  }};

  &:focus {
    border-color: ${props => {
      if (props.$status === 'available') return '#10b981';
      if (props.$status === 'taken' || props.$status === 'invalid') return '#ef4444';
      return 'var(--emerald, #10b981)';
    }};
  }
`;

const HelperText = styled.span<{ $type: 'success' | 'error' | 'info' }>`
  font-size: 0.78rem;
  color: ${props => {
    if (props.$type === 'success') return '#10b981';
    if (props.$type === 'error') return '#ef4444';
    return 'rgba(255, 255, 255, 0.4)';
  }};
  font-weight: 500;
`;

const AliasesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  margin-top: 1rem;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 0.25rem;

  &::-webkit-scrollbar {
    width: 0.25rem;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.25rem;
  }
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
`;

const AliasRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
`;

const AliasName = styled.span`
  font-family: monospace;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--emerald, #10b981);
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '@';
    color: rgba(255, 255, 255, 0.3);
    font-weight: 400;
  }
`;

const DeleteBtn = styled.button`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.25);
    color: #ff5f5f;
  }
`;

const AliasCountBadge = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.35rem 0.75rem;
  border-radius: 99px;
  align-self: flex-start;
`;

const SuggestLink = styled.button`
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.8rem;
  cursor: pointer;
  font-weight: 600;
  text-align: left;
  padding: 0;
  margin-top: 0.25rem;
  align-self: flex-start;
  text-decoration: underline;

  &:hover {
    color: #60a5fa;
  }
`;

interface AliasSubmitButtonProps {
  $status: 'idle' | 'available' | 'taken' | 'invalid';
}

const AliasSubmitButton = styled(SubmitButton)<AliasSubmitButtonProps>`
  margin-top: 0.5rem;
  background: ${props => props.$status === 'available' ? '#39d353' : 'rgba(255,255,255,0.05)'} !important;
  color: ${props => props.$status === 'available' ? '#000' : 'rgba(255,255,255,0.3)'} !important;
  box-shadow: ${props => props.$status === 'available' ? '0 0 15px rgba(57, 211, 83, 0.4)' : 'none'};
  transition: all 0.2s ease-in-out;
  font-weight: 700;

  &:hover {
    background: ${props => props.$status === 'available' ? '#2ebc47' : 'rgba(255,255,255,0.08)'} !important;
    box-shadow: ${props => props.$status === 'available' ? '0 0 20px rgba(57, 211, 83, 0.6)' : 'none'};
  }
`;

interface WalletAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerType: WalletOwnerType;
  ownerId?: number;
}

export const WalletAliasModal: React.FC<WalletAliasModalProps> = ({
  isOpen,
  onClose,
  ownerType,
  ownerId
}) => {
  const { token } = useAuth();
  const toast = useToast();
  const { showConfirm } = useAlert();

  const [aliases, setAliases] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [suggestedAlias, setSuggestedAlias] = useState<string>('');
  
  // Form states
  const [aliasInput, setAliasInput] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [statusText, setStatusText] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchAliases = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/domi/wallet/${ownerType}/${ownerId ?? 0}/aliases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAliases(res.data || []);
    } catch (e: any) {
      console.error('Error fetching aliases:', e);
      toast.error('No se pudieron obtener las llaves alias de la billetera.');
    } finally {
      setLoading(false);
    }
  }, [token, ownerType, ownerId, toast]);

  const fetchSuggestion = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/domi/wallet/${ownerType}/${ownerId ?? 0}/aliases/suggest`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestedAlias(res.data?.alias || '');
      // Si el input está vacío, autocompletar con la sugerencia
      if (!aliasInput && res.data?.alias) {
        setAliasInput(res.data.alias);
        // Validar la sugerencia inmediatamente
        validateAliasDebounced(res.data.alias);
      }
    } catch (e) {
      console.error('Error fetching suggested alias:', e);
    }
  }, [token, ownerType, ownerId, aliasInput]);

  useEffect(() => {
    if (isOpen && token) {
      fetchAliases();
      fetchSuggestion();
    }
  }, [isOpen, token, fetchAliases, fetchSuggestion]);

  // Validar alias
  const checkAvailability = async (name: string) => {
    if (!name) {
      setStatus('idle');
      setStatusText('');
      return;
    }
    const clean = name.trim().toLowerCase();
    const aliasRegex = /^[a-z0-9_-]{3,30}$/;
    if (!aliasRegex.test(clean)) {
      setStatus('invalid');
      setStatusText('Formato inválido. Usar letras minúsculas, números, guiones (-) y guiones bajos (_), longitud 3-30.');
      return;
    }

    setIsChecking(true);
    try {
      const res = await axios.get(`${API_URL}/api/domi/wallet/aliases/check-availability?alias=${clean}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.available) {
        setStatus('available');
        setStatusText('¡Alias disponible!');
      } else {
        setStatus('taken');
        setStatusText(res.data.error || 'Este alias Bre-b ya está registrado por otro usuario.');
      }
    } catch (e) {
      console.error('Error checking alias availability:', e);
      setStatus('invalid');
      setStatusText('Error al validar disponibilidad.');
    } finally {
      setIsChecking(false);
    }
  };

  // Debounce simple para no saturar con peticiones en cada tecla
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const validateAliasDebounced = (val: string) => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    setStatus('idle');
    setStatusText('Comprobando disponibilidad...');
    
    const timeout = setTimeout(() => {
      checkAvailability(val);
    }, 450);
    setDebounceTimeout(timeout);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''); // Limpieza en vivo
    setAliasInput(val);
    validateAliasDebounced(val);
  };

  const applySuggestion = () => {
    if (suggestedAlias) {
      setAliasInput(suggestedAlias);
      checkAvailability(suggestedAlias);
    }
  };

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'available' || !aliasInput) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/domi/wallet/${ownerType}/${ownerId ?? 0}/aliases`,
        { alias: aliasInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Alias @${aliasInput} registrado exitosamente.`);
      setAliasInput('');
      setStatus('idle');
      setStatusText('');
      fetchAliases();
      fetchSuggestion();
    } catch (error: any) {
      console.error('Error creating alias:', error);
      toast.error(error.response?.data?.error || 'Error al registrar el alias Bre-b.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlias = (aliasId: number, aliasName: string) => {
    showConfirm({
      title: 'Eliminar Alias Bre-b',
      message: `¿Estás seguro de que deseas eliminar el alias @${aliasName}? Ya no podrá usarse para recibir fondos en esta billetera.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await axios.delete(
            `${API_URL}/api/domi/wallet/${ownerType}/${ownerId ?? 0}/aliases/${aliasId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          toast.success('Alias eliminado correctamente.');
          fetchAliases();
          fetchSuggestion();
        } catch (error: any) {
          console.error('Error deleting alias:', error);
          toast.error(error.response?.data?.error || 'Error al eliminar el alias.');
        }
      }
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay onClick={onClose} style={{ zIndex: 1200 }}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="500px" style={{ padding: '2rem' }}>
        <ModalHeader style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ModalTitle style={{ fontSize: '1.75rem', fontWeight: 800 }}>Bre-b</ModalTitle>
            <AliasCountBadge style={{ marginTop: '2px' }}>{aliases.length} / 4 alias</AliasCountBadge>
          </div>
          <CloseButton onClick={onClose} style={{ fontSize: '1.5rem' }}>&times;</CloseButton>
        </ModalHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* BLOQUE 1: CREAR NUEVO ALIAS */}
          {aliases.length < 4 ? (
            <Form onSubmit={handleCreateAlias}>
              <FormGroup>
                <Label htmlFor="alias-input">Crear Nuevo Alias</Label>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <Input
                    id="alias-input"
                    type="text"
                    placeholder="Ej. ha101"
                    value={aliasInput}
                    onChange={handleInputChange}
                    $status={status}
                    required
                  />
                  {suggestedAlias && suggestedAlias !== aliasInput && (
                    <SuggestLink type="button" onClick={applySuggestion}>
                      Usar alias sugerido: @{suggestedAlias}
                    </SuggestLink>
                  )}
                </div>
                
                {statusText && (
                  <HelperText $type={status === 'available' ? 'success' : status === 'idle' ? 'info' : 'error'}>
                    {isChecking ? 'Comprobando en base de datos...' : statusText}
                  </HelperText>
                )}
              </FormGroup>

              <AliasSubmitButton 
                type="submit" 
                disabled={status !== 'available' || submitting}
                $status={status}
              >
                {submitting ? 'Registrando...' : 'Registrar Llave Alias'}
              </AliasSubmitButton>
            </Form>
          ) : (
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              padding: '1rem',
              borderRadius: '12px',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: 500,
              textAlign: 'center'
            }}>
              Has alcanzado el límite máximo de 4 alias Bre-b. Si deseas registrar uno nuevo, debes eliminar alguno existente.
            </div>
          )}

          {/* BLOQUE 2: LISTA DE ALIAS */}
          <ListContainer>
            <Label>Tus Alias Registrados</Label>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                <Spinner />
              </div>
            ) : aliases.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0' }}>
                No tienes alias configurados. Crea uno arriba para recibir tokens usando un nombre legible.
              </p>
            ) : (
              <AliasesList style={{ marginTop: '0.5rem' }}>
                {aliases.map(al => (
                  <AliasRow key={al.id}>
                    <AliasName>{al.alias}</AliasName>
                    <DeleteBtn onClick={() => handleDeleteAlias(al.id, al.alias)} title="Eliminar Alias">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </DeleteBtn>
                  </AliasRow>
                ))}
              </AliasesList>
            )}
          </ListContainer>
        </div>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};
