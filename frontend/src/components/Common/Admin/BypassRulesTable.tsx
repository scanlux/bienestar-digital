'use client';
import React from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';

const Table = styled.table` width: 100%; border-collapse: collapse; color: #00ff00; font-family: monospace; `;
const Th = styled.th` padding: 12px; text-align: left; border-bottom: 1px solid rgba(0, 255, 0, 0.4); `;
const Td = styled.td` padding: 12px; border-bottom: 1px solid rgba(0, 255, 0, 0.1); `;

const DeleteButton = styled.button`
  background: rgba(255, 0, 0, 0.1); color: #ff3333; border: 1px solid #ff3333;
  padding: 6px 12px; cursor: pointer; border-radius: 4px; font-family: monospace;
  &:disabled { opacity: 0.3; cursor: not-allowed; border-color: #555; color: #555; }
  &:hover:not(:disabled) { background: rgba(255, 0, 0, 0.3); }
`;

export default function BypassRulesTable() {
  const { token } = useAuth();
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['bypassRules'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/manage/system/maintenance/bypass-rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data?.rules || [];
    },
    enabled: !!token
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${API_URL}/api/manage/system/maintenance/bypass-rules/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bypassRules'] });
      showAlert({ title: 'Regla Eliminada', message: 'La regla de bypass ha sido removida exitosamente.' });
    },
    onError: (err: any) => {
      showAlert({ title: 'Error', message: err.response?.data?.message || 'No se pudo eliminar la regla.' });
    }
  });

  const rulesList = Array.isArray(rules) ? rules : [];

  if (isLoading) return <div style={{ color: '#00ff00' }}>Cargando matriz de excepciones...</div>;

  return (
    <div style={{ background: '#010401', padding: '20px', border: '1px solid rgba(0, 255, 0, 0.25)', borderRadius: '6px' }}>
      <h2 style={{ color: '#00ff00', marginTop: 0, fontSize: '1.1rem', borderBottom: '1px solid rgba(0, 255, 0, 0.15)', paddingBottom: '10px' }}>
        &gt; MATRIZ DE REGLAS DE EXCEPCIÓN (BYPASS)
      </h2>
      <Table>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Tipo</Th>
            <Th>Patrón Excepción (req.path)</Th>
            <Th>Descripción</Th>
            <Th>Estado de Sistema (Lock)</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {rulesList.map((rule: any) => (
            <tr key={rule.id}>
              <Td>{rule.id}</Td>
              <Td style={{ textTransform: 'uppercase', color: rule.type === 'api' ? '#00ffff' : '#ff00ff' }}>{rule.type}</Td>
              <Td style={{ fontWeight: 'bold' }}>{rule.pattern}</Td>
              <Td>{rule.description}</Td>
              <Td>
                {rule.is_system === 1 ? (
                  <span style={{ color: '#ffaa00', padding: '4px 8px', background: 'rgba(255, 170, 0, 0.1)', borderRadius: '4px' }}>🛡️ BLINDADO</span>
                ) : (
                  <span style={{ color: '#00ff00' }}>MODIFICABLE</span>
                )}
              </Td>
              <Td>
                <DeleteButton 
                  disabled={rule.is_system === 1}
                  onClick={() => {
                    if (window.confirm(`¿Está seguro de eliminar la regla de bypass para ${rule.pattern}?`)) {
                      deleteMutation.mutate(rule.id);
                    }
                  }}
                >
                  Revocar
                </DeleteButton>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
