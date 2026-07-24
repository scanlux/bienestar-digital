'use client';
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { API_URL } from '@/constants';
import { fadeIn } from '@/components/Common/PageStyles';

import TokenRegistryCard from './TokenRegistryCard';
import TierRulesTable from './TierRulesTable';
import ProtocolRulesForm from './ProtocolRulesForm';

const PageContainer = styled.div`
  padding: 30px;
  max-width: 1100px;
  margin: 0 auto;
  animation: ${fadeIn} 0.5s ease-out;
  color: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
`;

const GlassHeader = styled.div`
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 24px 32px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export default function SystemParametersPage() {
  const { token } = useAuth();
  const { showAlert } = useAlert();
  
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<any>({});
  const [tokenInfo, setTokenInfo] = useState<any>({});
  const [treasury, setTreasury] = useState<any>({});
  const [flags, setFlags] = useState<{ key: string; enabled: number; label: string }[]>([]);
  const [metadata, setMetadata] = useState<any>({});

  const toggleSection = (idx: number) => {
    setOpenSection(openSection === idx ? null : idx);
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const paramsRes = await axios.get(`${API_URL}/api/manage/system/parameters`, { headers });
      setRules(paramsRes.data.rules || {});
      setTokenInfo(paramsRes.data.token || {});
      setTreasury(paramsRes.data.treasury || {});
      setMetadata(paramsRes.data.metadata || {});

      const flagsRes = await axios.get(`${API_URL}/api/manage/financial-flags`, { headers });
      setFlags(flagsRes.data || []);
    } catch (err: any) {
      showAlert({ title: 'Error', message: 'Error al cargar los parámetros.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleInputChange = (field: string, val: string) => {
    const numericVal = val === '' ? 0 : Number(val);
    setRules((prev: any) => ({ ...prev, [field]: numericVal }));
  };

  const handleToggleFlag = async (key: string, currentVal: number) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const nextVal = currentVal === 1 ? 0 : 1;
      await axios.patch(`${API_URL}/api/manage/financial-flags/${key}`, { enabled: nextVal }, { headers });
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: nextVal } : f));
      showAlert({ title: 'Interruptor Actualizado', message: `Flag '${key}' actualizada.` });
    } catch (err) {
      showAlert({ title: 'Error', message: 'Error al actualizar flag.' });
    }
  };

  const saveParameters = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload: any = {};
      Object.keys(rules).forEach(field => {
        if (rules[field] !== undefined && rules[field] !== '') payload[field] = Number(rules[field]);
      });
      await axios.patch(`${API_URL}/api/manage/system/parameters`, payload, { headers });
      showAlert({ title: 'Éxito', message: 'Configuración guardada.' });
      fetchData();
    } catch (err) {
      showAlert({ title: 'Error', message: 'Error al guardar.' });
    }
  };

  if (loading && Object.keys(rules).length === 0) return <div>Cargando...</div>;

  return (
    <PageContainer>
      <GlassHeader>
        <div>
          <h1 style={{ fontSize: '26px', margin: 0 }}>Parámetros del Protocolo Financiero</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>Configuración unificada del ecosistema</p>
        </div>
        <button onClick={fetchData} style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>Refrescar</button>
      </GlassHeader>
      
      <TokenRegistryCard 
        tokenInfo={tokenInfo} 
        treasury={treasury} 
        isOpen={openSection === 0} 
        onToggle={() => toggleSection(0)} 
      />
      
      <TierRulesTable 
        rules={rules} 
        peg={parseFloat(tokenInfo?.fiat_peg_cop || 400)} 
        isOpen={openSection === 1} 
        onToggle={() => toggleSection(1)} 
        onInputChange={handleInputChange} 
        onSave={saveParameters} 
      />

      <ProtocolRulesForm 
        rules={rules}
        flags={flags}
        metadata={metadata}
        openSection={openSection}
        onToggleSection={toggleSection}
        onInputChange={handleInputChange}
        onToggleFlag={handleToggleFlag}
        onSave={saveParameters}
      />
    </PageContainer>
  );
}
