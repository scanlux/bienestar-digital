'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import styled from 'styled-components';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';

interface BypassRule {
  id: number;
  pattern: string;
  type: 'api' | 'page';
  description: string | null;
  is_system: number;
  created_at?: string;
}

export default function BypassRulesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [newRulePattern, setNewRulePattern] = useState<string>('');
  const [newRuleType, setNewRuleType] = useState<'api' | 'page'>('api');
  const [newRuleDescription, setNewRuleDescription] = useState<string>('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Query: Bypass Rules
  const { data: bypassRulesData, isLoading } = useQuery({
    queryKey: ['systemBypassRules'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/manage/system/maintenance/bypass-rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.rules as BypassRule[];
    },
    enabled: !!token
  });

  // Mutation: Add Bypass Rule
  const addBypassRuleMutation = useMutation({
    mutationFn: async (payload: { pattern: string; type: 'api' | 'page'; description: string }) => {
      const res = await axios.post(
        `${API_URL}/api/manage/system/maintenance/bypass-rules`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['systemBypassRules'] });
      setNewRulePattern('');
      setNewRuleDescription('');
      setSuccessMsg(data.message || 'Regla de bypass añadida exitosamente.');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Error al agregar regla de bypass.');
      setSuccessMsg(null);
    }
  });

  // Mutation: Delete Bypass Rule
  const deleteBypassRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axios.delete(
        `${API_URL}/api/manage/system/maintenance/bypass-rules/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['systemBypassRules'] });
      setSuccessMsg(data.message || 'Regla de bypass eliminada exitosamente.');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || err.message || 'Error al eliminar regla de bypass.');
      setSuccessMsg(null);
    }
  });

  return (
    <HudContainer>
      {/* Mensajes temporales de éxito/error */}
      {errorMsg && (
        <MessageBar $type="error" onClick={() => setErrorMsg(null)}>
          [ SYSTEM ALERT ] {errorMsg} (Click para descartar)
        </MessageBar>
      )}
      {successMsg && (
        <MessageBar $type="success" onClick={() => setSuccessMsg(null)}>
          [ TELEMETRY STATUS ] {successMsg} (Click para descartar)
        </MessageBar>
      )}

      <PanelCard>
        <PanelTitle>&gt; REGLAS DINAMICAS DE BYPASS (EXCEPCIONES DE MANTENIMIENTO)</PanelTitle>
        
        <BypassRulesContainer>
          <BypassTableWrapper>
            <RetroTable>
              <thead>
                <tr>
                  <th>Patrón de URL / Path</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#00ff00', padding: '1.5rem' }}>
                      &gt; CARGANDO REGLAS...
                    </td>
                  </tr>
                ) : !bypassRulesData || bypassRulesData.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'rgba(0, 255, 0, 0.4)', padding: '1.5rem' }}>
                      &gt; No hay reglas de excepciones registradas en la base de datos.
                    </td>
                  </tr>
                ) : (
                  bypassRulesData.map((rule) => (
                    <tr key={rule.id}>
                      <td className="pattern">{rule.pattern}</td>
                      <td>
                        <TypeBadge $type={rule.type}>
                          {rule.type.toUpperCase()}
                        </TypeBadge>
                      </td>
                      <td className="desc">{rule.description || 'Sin descripción'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {rule.is_system ? (
                          <SystemBadge>[ SISTEMA ]</SystemBadge>
                        ) : (
                          <DeleteBtn 
                            type="button"
                            onClick={() => {
                              if (confirm('¿Está seguro de eliminar esta regla de excepción?')) {
                                deleteBypassRuleMutation.mutate(rule.id);
                              }
                            }}
                          >
                            [ ELIMINAR ]
                          </DeleteBtn>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </RetroTable>
          </BypassTableWrapper>

          <Divider style={{ margin: '1.5rem 0' }} />

          <BypassForm onSubmit={(e) => {
            e.preventDefault();
            if (!newRulePattern) {
              setErrorMsg('El patrón es obligatorio.');
              return;
            }
            addBypassRuleMutation.mutate({
              pattern: newRulePattern,
              type: newRuleType,
              description: newRuleDescription
            });
          }}>
            <FormTitle>&gt; REGISTRAR NUEVA EXCEPCION</FormTitle>
            
            <FormRow>
              <FormCol $flex={2}>
                <FormLabel>Patrón (Ruta URL / RegExp)</FormLabel>
                <RetroTextInput 
                  type="text" 
                  value={newRulePattern}
                  onChange={(e) => setNewRulePattern(e.target.value)}
                  placeholder="Ej: /api/public/info o /custom-page"
                  required
                />
              </FormCol>

              <FormCol $flex={1}>
                <FormLabel>Tipo de Tráfico</FormLabel>
                <RetroSelect
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as 'api' | 'page')}
                >
                  <option value="api">API Endpoint (Backend)</option>
                  <option value="page">Page Route (Frontend)</option>
                </RetroSelect>
              </FormCol>
            </FormRow>

            <FormRow style={{ marginTop: '0.5rem' }}>
              <FormCol $flex={3}>
                <FormLabel>Descripción / Razón de Exclusión</FormLabel>
                <RetroTextInput 
                  type="text" 
                  value={newRuleDescription}
                  onChange={(e) => setNewRuleDescription(e.target.value)}
                  placeholder="Ej: Acceso público a consultas de catálogo..."
                />
              </FormCol>

              <FormCol $flex={1} style={{ justifyContent: 'flex-end' }}>
                <RetroSubmitBtn type="submit" disabled={addBypassRuleMutation.isPending}>
                  {addBypassRuleMutation.isPending ? 'REGISTRANDO...' : 'AÑADIR EXCEPCION'}
                </RetroSubmitBtn>
              </FormCol>
            </FormRow>
          </BypassForm>
        </BypassRulesContainer>
      </PanelCard>
    </HudContainer>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================
const HudContainer = styled.div`
  background-color: #030803;
  color: #00ff00;
  font-family: monospace;
  padding: 1.5rem;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
`;

const MessageBar = styled.div<{ $type: 'success' | 'error' }>`
  background: ${props => props.$type === 'error' ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 255, 0, 0.15)'};
  border: 1px solid ${props => props.$type === 'error' ? '#ff0000' : '#00ff00'};
  color: ${props => props.$type === 'error' ? '#ff3333' : '#00ff00'};
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  letter-spacing: 1px;
  text-shadow: 0 0 5px ${props => props.$type === 'error' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.5)'};
`;

const PanelCard = styled.div`
  background-color: #010401;
  border: 1px solid rgba(0, 255, 0, 0.25);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(0, 255, 0, 0.03);
  display: flex;
  flex-direction: column;
`;

const PanelTitle = styled.h2`
  font-size: 0.9rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0 0 1.25rem 0;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(0, 255, 0, 0.15);
  padding-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const BypassRulesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const BypassTableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(0, 255, 0, 0.15);
  border-radius: 4px;
  background-color: #000;
`;

const RetroTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: monospace;
  font-size: 0.8rem;
  color: #00ff00;

  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(0, 255, 0, 0.1);
  }

  th {
    background-color: rgba(0, 255, 0, 0.05);
    border-bottom: 1px solid rgba(0, 255, 0, 0.25);
    font-weight: 700;
    letter-spacing: 1px;
  }

  tr:hover td {
    background-color: rgba(0, 255, 0, 0.02);
  }

  .pattern {
    font-weight: 700;
    color: #00ffaa;
  }

  .desc {
    color: rgba(0, 255, 0, 0.6);
  }
`;

const TypeBadge = styled.span<{ $type: 'api' | 'page' }>`
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid ${props => props.$type === 'api' ? '#00ffff' : '#ffaa00'};
  color: ${props => props.$type === 'api' ? '#00ffff' : '#ffaa00'};
  background: ${props => props.$type === 'api' ? 'rgba(0, 255, 255, 0.05)' : 'rgba(255, 170, 0, 0.05)'};
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: #ff3333;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: all 0.2s;

  &:hover {
    color: #ff0000;
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
  }
`;

const SystemBadge = styled.span`
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid rgba(0, 255, 128, 0.3);
  color: rgba(0, 255, 128, 0.7);
  background: rgba(0, 255, 128, 0.05);
  text-shadow: 0 0 5px rgba(0, 255, 128, 0.3);
`;

const Divider = styled.div`
  height: 1px;
  background-color: rgba(0, 255, 0, 0.15);
  margin: 0.25rem 0;
`;

const BypassForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 255, 0, 0.02);
  border: 1px solid rgba(0, 255, 0, 0.1);
  padding: 1rem;
  border-radius: 4px;
`;

const FormTitle = styled.h3`
  font-size: 0.8rem;
  font-weight: 700;
  color: #00ff00;
  margin: 0 0 0.5rem 0;
  letter-spacing: 1px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const FormCol = styled.div<{ $flex?: number }>`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: ${props => props.$flex || 1};
  min-width: 200px;
`;

const FormLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(0, 255, 0, 0.7);
  letter-spacing: 1px;
`;

const RetroTextInput = styled.input`
  width: 100%;
  background-color: #000;
  border: 1px solid rgba(0, 255, 0, 0.35);
  color: #00ff00;
  padding: 0.75rem 1rem;
  font-family: monospace;
  font-size: 0.9rem;
  border-radius: 4px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  transition: all 0.3s;

  &:focus {
    border-color: #00ff00;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
  }
`;

const RetroSelect = styled.select`
  width: 100%;
  background-color: #000;
  border: 1px solid rgba(0, 255, 0, 0.35);
  color: #00ff00;
  padding: 0.75rem 1rem;
  font-family: monospace;
  font-size: 0.9rem;
  border-radius: 4px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg fill='%2300ff00' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.25rem;
  padding-right: 2.25rem;

  &:focus {
    border-color: #00ff00;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
  }

  option {
    background-color: #000;
    color: #00ff00;
  }
`;

const RetroSubmitBtn = styled.button`
  background-color: rgba(0, 255, 0, 0.15);
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 0.75rem 1.2rem;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 5px rgba(0, 255, 0, 0.2);

  &:hover:not(:disabled) {
    background-color: rgba(0, 255, 0, 0.25);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
