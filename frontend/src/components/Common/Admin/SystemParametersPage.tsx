'use client';

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { API_URL } from '@/constants';
import { fadeIn } from '@/components/Common/PageStyles';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(72, 214, 76, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(72, 214, 76, 0); }
  100% { box-shadow: 0 0 0 0 rgba(72, 214, 76, 0); }
`;

// Styled Components
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

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const HeaderSubtitle = styled.p`
  margin: 4px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
`;

const AccordionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionWrapper = styled.div<{ $isOpen: boolean }>`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid ${props => props.$isOpen ? 'rgba(72, 214, 76, 0.3)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 12px;
  overflow: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
`;

const InfoIconWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(72, 214, 76, 0.15);
  color: #48d64c;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: #48d64c;
    color: #0b1329;
    transform: scale(1.1);
  }
`;

const TooltipCard = styled.div`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  width: 280px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(72, 214, 76, 0.3);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  color: #f8fafc;
  font-weight: normal;

  ${InfoIconWrapper}:hover & {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }
`;

const TooltipTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 4px;
  text-align: left;
`;

const TooltipRow = styled.div`
  font-size: 11px;
  margin-bottom: 4px;
  line-height: 14px;
  text-align: left;
  
  strong {
    color: #48d64c;
  }
`;

const SectionHeader = styled.button`
  width: 100%;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  outline: none;
  font-family: inherit;

  &:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }
`;

const SectionHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 16px;
  color: #ffffff;
`;

const SectionIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(72, 214, 76, 0.1);
  color: #48d64c;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Chevron = styled.svg<{ $isOpen: boolean }>`
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.4);
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0)'};
  transition: transform 0.2s ease;
`;

const SectionContent = styled.div<{ $isOpen: boolean }>`
  display: ${props => props.$isOpen ? 'block' : 'none'};
  padding: 0 24px 24px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  background-color: transparent;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const SubSectionTitle = styled.h4`
  font-size: 13px;
  font-weight: 700;
  color: #48d64c;
  margin: 24px 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(72, 214, 76, 0.15);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
`;

const Input = styled.input`
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.02);
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #48d64c;
    box-shadow: 0 0 0 3px rgba(72, 214, 76, 0.15);
  }

  &:disabled {
    background-color: rgba(255, 255, 255, 0.01);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }
`;

const InputDesc = styled.p`
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  line-height: 14px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
`;

const StatValue = styled.span<{ $highlight?: boolean }>`
  font-size: 20px;
  font-weight: 800;
  color: ${props => props.$highlight ? '#48d64c' : '#ffffff'};
`;

const SwitchContainer = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  margin-top: 16px;
`;

const SwitchLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
`;

const SwitchInput = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  width: 44px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s ease;
  outline: none;

  &:checked {
    background-color: #48d64c;
  }

  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: white;
    top: 2px;
    left: 2px;
    transition: transform 0.2s ease;
  }

  &:checked::before {
    transform: translateX(20px);
  }
`;

const SaveButton = styled.button`
  background: rgba(72, 214, 76, 0.1);
  color: #48d64c;
  border: 1px solid rgba(72, 214, 76, 0.2);
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 700;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
  margin-top: 20px;
  animation: ${pulse} 2s infinite;

  &:hover {
    transform: translateY(-1px);
    background: rgba(72, 214, 76, 0.2);
    box-shadow: 0 4px 12px rgba(72, 214, 76, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.05);
    cursor: not-allowed;
    animation: none;
    box-shadow: none;
  }
`;

export default function SystemParametersPage() {
  const { token } = useAuth();
  const { showAlert } = useAlert();
  
  // Accordion state
  const [openSection, setOpenSection] = useState<number | null>(0);

  // Data states
  const [loading, setLoading] = useState(true);
  
  const [rules, setRules] = useState<any>({});
  const [tokenInfo, setTokenInfo] = useState<any>({});
  const [treasury, setTreasury] = useState<any>({});
  const [flags, setFlags] = useState<{ key: string; enabled: number; label: string }[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  // Toggle accordion helper
  const toggleSection = (idx: number) => {
    setOpenSection(openSection === idx ? null : idx);
  };

  // Fetch all system parameters and flags
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch unified parameters
      const paramsRes = await axios.get(`${API_URL}/api/manage/system/parameters`, { headers });
      setRules(paramsRes.data.rules || {});
      setTokenInfo(paramsRes.data.token || {});
      setTreasury(paramsRes.data.treasury || {});
      setMetadata(paramsRes.data.metadata || {});

      // Fetch financial flags
      const flagsRes = await axios.get(`${API_URL}/api/manage/financial-flags`, { headers });
      setFlags(flagsRes.data || []);
    } catch (err: any) {
      console.error(err);
      showAlert({
        title: 'Error de Conexión',
        message: err.response?.data?.message || 'Error al conectar con la API de administración.',
        confirmText: 'Aceptar'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle input change
  const handleInputChange = (field: string, val: string) => {
    // Definición de grupos acoplados
    const groups = [
      {
        target: 1.0,
        fields: [
          'customer_cancel_store_refund_prep_rate',
          'customer_cancel_client_refund_prep_rate',
          'customer_cancel_sys_retain_prep_rate'
        ]
      }
    ];

    const group = groups.find(g => g.fields.includes(field));

    if (!group) {
      // Cambio normal sin acoplamiento
      setRules((prev: any) => {
        const updatedRules = { ...prev, [field]: val };
        
        // Si cambia el limitador raíz, ajustar sus dependientes proporcionalmente
        if (field === 'driver_cancellation_compensation_rate') {
          const newTarget = val === '' ? 0 : Number(val);
          const groupD = [
            'customer_cancel_driver_delivery_refund_dispatch_rate',
            'customer_cancel_sys_delivery_processing_rate'
          ];
          const val1 = prev[groupD[0]] !== undefined && prev[groupD[0]] !== null ? Number(prev[groupD[0]]) : 0.40;
          const val2 = prev[groupD[1]] !== undefined && prev[groupD[1]] !== null ? Number(prev[groupD[1]]) : 0.10;
          const sumD = val1 + val2;
          if (sumD > 0) {
            updatedRules[groupD[0]] = Number((newTarget * (val1 / sumD)).toFixed(6));
            updatedRules[groupD[1]] = Number((newTarget * (val2 / sumD)).toFixed(6));
          } else {
            updatedRules[groupD[0]] = Number((newTarget / 2).toFixed(6));
            updatedRules[groupD[1]] = Number((newTarget / 2).toFixed(6));
          }
        }
        return updatedRules;
      });
      return;
    }

    const numericVal = val === '' ? 0 : Number(val);
    const target = group.target;
    // Clampar valor entre 0 y target
    const clampedVal = Math.max(0, Math.min(target, numericVal));

    setRules((prev: any) => {
      const updatedRules = { ...prev, [field]: clampedVal };

      const otherFields = group.fields.filter(f => f !== field);
      const otherVals = otherFields.map(f => {
        const v = prev[f];
        return v !== undefined && v !== null && v !== '' ? Number(v) : 0;
      });

      const sumOther = otherVals.reduce((acc, curr) => acc + curr, 0);
      const remaining = target - clampedVal;

      if (remaining === 0) {
        otherFields.forEach(f => {
          updatedRules[f] = 0;
        });
      } else if (sumOther > 0) {
        otherFields.forEach((f, idx) => {
          const proportion = otherVals[idx] / sumOther;
          const newVal = remaining * proportion;
          updatedRules[f] = Number(newVal.toFixed(6));
        });
      } else {
        const equalSplit = remaining / otherFields.length;
        otherFields.forEach(f => {
          updatedRules[f] = Number(equalSplit.toFixed(6));
        });
      }

      return updatedRules;
    });
  };

  const renderSection4Input = (paramKey: string, defaultLabel: string) => {
    const meta = metadata[paramKey];
    const rawVal = rules[paramKey];
    const numericVal = rawVal !== undefined && rawVal !== null && rawVal !== '' ? Number(rawVal) : 0;

    const formatDynamicText = (text: string) => {
      if (!text) return '';
      const valPct = (numericVal * 100).toFixed(2).replace(/\.00$/, '') + '%';
      return text
        .replace(/{val}/g, String(rawVal !== undefined && rawVal !== null ? rawVal : 0))
        .replace(/{val_pct}/g, valPct);
    };

    return (
      <InputGroup key={paramKey}>
        <LabelRow>
          <Label>{defaultLabel}</Label>
          {meta && (
            <InfoIconWrapper>
              &#9432;
              <TooltipCard>
                <TooltipTitle>{meta.label || defaultLabel}</TooltipTitle>
                <TooltipRow><strong>Definición:</strong> {formatDynamicText(meta.description)}</TooltipRow>
                <TooltipRow><strong>Estados aplicables:</strong> {meta.applicable_states}</TooltipRow>
                <TooltipRow><strong>Método de pago:</strong> {meta.payment_methods}</TooltipRow>
                <TooltipRow><strong>Actor Iniciador:</strong> {meta.initiator}</TooltipRow>
                <TooltipRow><strong>Actor afectado:</strong> {meta.actor}</TooltipRow>
                <TooltipRow><strong>Desencadenante:</strong> {meta.flow_trigger}</TooltipRow>
                {meta.formula_hint && <TooltipRow><strong>Fórmula:</strong> <code>{formatDynamicText(meta.formula_hint)}</code></TooltipRow>}
                {meta.impact_note && <TooltipRow><strong>Impacto:</strong> {formatDynamicText(meta.impact_note)}</TooltipRow>}
              </TooltipCard>
            </InfoIconWrapper>
          )}
        </LabelRow>
        <Input 
          type="number" 
          step="any"
          value={rules[paramKey] !== undefined && rules[paramKey] !== null ? rules[paramKey] : ''} 
          onChange={(e) => handleInputChange(paramKey, e.target.value)}
        />
        {meta && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.5)', padding: '2px 6px', borderRadius: '4px' }}>
              🎯 Estados: {meta.applicable_states || 'N/A'}
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
              💳 Pago: {meta.payment_methods || 'DOMI / COD'}
            </span>
          </div>
        )}
      </InputGroup>
    );
  };

  // Save rules parameters
  const saveParameters = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Sanitizar valores numericos antes de enviar
      const payload: any = {};
      const fieldsToSave = [
        'store_fixed_fee_cop',
        'driver_fixed_fee_cop',
        'cashback_rate_customer',
        'max_balance_cop',
        'min_domi_balance_driver',
        'free_withdrawals_per_month',
        'withdrawal_fee_cop',
        'score_min_for_cashback',
        'score_cashback_win_base',
        'max_monthly_yield_pct',
        'min_collateral_ratio_post_adjust',
        'wompi_commission_percent',
        'wompi_commission_fixed_cop',
        'wompi_commission_iva_percent',
        'wompi_min_purchase_cop',
        'score_earned_on_purchase',
        'score_earned_on_domi_purchase',
        'score_penalty_domi_cancel_accepted',
        'score_penalty_domi_cancel_in_transit',
        'score_penalty_domi_cancel_dispatch',
        'score_penalty_cash_cancel_accepted',
        'score_penalty_cash_cancel_in_transit',
        'score_penalty_cash_cancel_dispatch',
        'driver_cancellation_compensation_rate',
        'driver_cancel_pre_pickup_refund_rate',
        'driver_cancel_post_pickup_penalty_rate',
        'customer_cancel_store_refund_prep_rate',
        'customer_cancel_client_refund_prep_rate',
        'customer_cancel_sys_retain_prep_rate',
        'customer_cancel_driver_commission_refund_transit_rate',
        'customer_cancel_store_commission_refund_dispatch_rate',
        'customer_cancel_driver_commission_refund_dispatch_rate',
        'customer_cancel_driver_delivery_pct_dispatch',
        'platform_processing_fee_rate',
        'delivery_base_fare_cop',
        'delivery_base_distance_km',
        'delivery_extra_rate_cop_per_km',
        'delivery_max_distance_km',
        'retention_penalty_rate',
        'refund_standard_rate',
        'rescue_cashback_rate',
        'free_tier_stores_limit',
        'free_tier_categories_limit',
        'free_tier_products_limit',
        'influencer_reels_limit',
        'solvency_commission_guarantee_fraction',
        'minimum_delivery_rate',
        'store_solvency_delivery_multiplier',
        'driver_penalty_points_prep',
        'driver_penalty_points_dispatch',
        'driver_penalty_points_transit',
        'driver_penalty_points_rescue_original',
        'driver_rescue_chain_penalty_points',
        'store_penalty_points_prep',
        'store_penalty_points_dispatch',
        'store_cancel_client_indemnity_rate',
        'store_cancel_driver_delivery_pct_rate',
        'store_cancel_client_indemnity_domi_amount',
        'driver_commission_refund_on_store_cancel_rate',
        'driver_rescue_commission_refund_rate',
        'driver_rescue_timeout_minutes',
        'driver_rescue_max_attempts'
      ];

      fieldsToSave.forEach(field => {
        if (rules[field] !== undefined && rules[field] !== '') {
          payload[field] = Number(rules[field]);
        }
      });

      const res = await axios.patch(`${API_URL}/api/manage/system/parameters`, payload, { headers });
      showAlert({
        title: 'Parámetros del Protocolo',
        message: res.data.message || 'Configuración guardada exitosamente.',
        confirmText: 'Aceptar'
      });
      
      // Volver a consultar datos frescos para asegurar sincronizacion
      fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert({
        title: 'Error al Guardar',
        message: err.response?.data?.message || 'Error al guardar los parámetros en el servidor.',
        confirmText: 'Aceptar'
      });
    }
  };

  // Toggle system financial flag status
  const handleToggleFlag = async (key: string, currentVal: number) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const nextVal = currentVal === 1 ? 0 : 1;
      
      await axios.patch(
        `${API_URL}/api/manage/financial-flags/${key}`, 
        { enabled: nextVal }, 
        { headers }
      );
      
      // Actualizar estado local
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: nextVal } : f));
      showAlert({
        title: 'Interruptor Actualizado',
        message: `El interruptor '${key}' se actualizó correctamente.`,
        confirmText: 'Aceptar'
      });
    } catch (err: any) {
      console.error(err);
      showAlert({
        title: 'Error de Actualización',
        message: err.response?.data?.message || 'Error al actualizar el interruptor del sistema.',
        confirmText: 'Aceptar'
      });
    }
  };

  if (loading && Object.keys(rules).length === 0) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0', fontSize: '15px', color: '#64748b' }}>
          Cargando configuración de protocolo del motor financiero...
        </div>
      </PageContainer>
    );
  }

  const peg = parseFloat(tokenInfo.fiat_peg_cop || 400);

  return (
    <PageContainer>
      <GlassHeader>
        <div>
          <HeaderTitle>Parámetros del Protocolo Financiero</HeaderTitle>
          <HeaderSubtitle>Configuración unificada del token, comisiones, límites y cashback del Motor DOMI</HeaderSubtitle>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchData}
            style={{
              background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px',
              padding: '10px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#475569'
            }}
          >
            Refrescar
          </button>
        </div>
      </GlassHeader>
      <AccordionContainer>
        {/* SECCION 1: ESTADO DEL TOKEN */}
        <SectionWrapper $isOpen={openSection === 0}>
          <SectionHeader onClick={() => toggleSection(0)}>
            <SectionHeaderTitle>
              <SectionIcon>🪙</SectionIcon>
              Sección 1: Estado del Token DOMI (Solo Lectura)
            </SectionHeaderTitle>
            <Chevron $isOpen={openSection === 0} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </Chevron>
          </SectionHeader>
          <SectionContent $isOpen={openSection === 0}>
            <StatsGrid>
              <StatCard>
                <StatLabel>Peg Fiduciario del DOMI</StatLabel>
                <StatValue $highlight={true}>${peg.toLocaleString()} COP</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Circulante Oficial</StatLabel>
                <StatValue>{parseFloat(treasury.circulante_oficial || 0).toLocaleString()} DOMI</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Reserva Fiduciaria Declarada</StatLabel>
                <StatValue>${parseFloat(treasury.reserva_cop || 0).toLocaleString()} COP</StatValue>
              </StatCard>
              <StatCard>
                <StatLabel>Ratio de Colateralización</StatLabel>
                <StatValue $highlight={parseFloat(treasury.collateral_ratio || 0) >= 100}>
                  {parseFloat(treasury.collateral_ratio || 0).toFixed(2)}%
                </StatValue>
              </StatCard>
            </StatsGrid>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '16px', lineHeight: '20px' }}>
              * La gobernanza del peg y las reservas fiduciarias bancarias determinan la equivalencia oficial del token. 
              El peg del DOMI es inmutable desde este panel y solo puede apreciarse mediante declaración formal de rendimientos en la tesorería.
            </p>
          </SectionContent>
        </SectionWrapper>

        {/* SECCION 2: COMISIONES OPERATIVAS */}
        <SectionWrapper $isOpen={openSection === 1}>
          <SectionHeader onClick={() => toggleSection(1)}>
            <SectionHeaderTitle>
              <SectionIcon>💼</SectionIcon>
              Sección 2: Comisiones Operativas, Solvencia y Garantías de Respaldo
            </SectionHeaderTitle>
            <Chevron $isOpen={openSection === 1} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </Chevron>
          </SectionHeader>
          <SectionContent $isOpen={openSection === 1}>
            <Grid>
              <InputGroup>
                <Label>Comisión Fija de Sede (COP)</Label>
                <Input 
                  type="number" 
                  value={rules.store_fixed_fee_cop || ''} 
                  onChange={(e) => handleInputChange('store_fixed_fee_cop', e.target.value)}
                />
                <InputDesc>Costo cobrado a la sede al aceptar/preparar el pedido. Equivale a ${(Number(rules.store_fixed_fee_cop || 0) / peg).toFixed(4)} DOMIs al peg actual.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Comisión Fija de Repartidor (COP)</Label>
                <Input 
                  type="number" 
                  value={rules.driver_fixed_fee_cop || ''} 
                  onChange={(e) => handleInputChange('driver_fixed_fee_cop', e.target.value)}
                />
                <InputDesc>Costo cobrado al repartidor al aceptar un servicio normal. Equivale a ${(Number(rules.driver_fixed_fee_cop || 0) / peg).toFixed(4)} DOMIs al peg actual.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Saldo Mínimo Operativo del Repartidor (DOMI)</Label>
                <Input 
                  type="number" 
                  value={rules.min_domi_balance_driver || ''} 
                  onChange={(e) => handleInputChange('min_domi_balance_driver', e.target.value)}
                />
                <InputDesc>Margen de garantía requerido en DOMIs para que un repartidor pueda aceptar nuevos pedidos.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Fracción de Garantía de Solvencia (Comisiones)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={rules.solvency_commission_guarantee_fraction || ''} 
                  onChange={(e) => handleInputChange('solvency_commission_guarantee_fraction', e.target.value)}
                />
                <InputDesc>Porcentaje de las comisiones requeridas en saldo disponible al aceptar/crear una orden (ej: 0.50 = 50%).</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Tarifa Mínima de Domicilio (COP)</Label>
                <Input 
                  type="number" 
                  value={rules.minimum_delivery_rate || ''} 
                  onChange={(e) => handleInputChange('minimum_delivery_rate', e.target.value)}
                />
                <InputDesc>Base fiduciaria para el cálculo del saldo mínimo requerido de la sede para operar.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Multiplicador de Solvencia para Apertura de Turno de Sede</Label>
                <Input 
                  type="number" 
                  value={rules.store_solvency_delivery_multiplier || ''} 
                  onChange={(e) => handleInputChange('store_solvency_delivery_multiplier', e.target.value)}
                />
                <InputDesc>Número de tarifas mínimas de domicilio requeridas en saldo disponible de la sede para operar (ej: 3).</InputDesc>
              </InputGroup>
            </Grid>
            <SaveButton onClick={saveParameters}>Guardar Comisiones y Solvencias</SaveButton>
          </SectionContent>
        </SectionWrapper>

        {/* SECCION 3: BILLETERAS Y LIMITES */}
        <SectionWrapper $isOpen={openSection === 2}>
          <SectionHeader onClick={() => toggleSection(2)}>
            <SectionHeaderTitle>
              <SectionIcon>🛡️</SectionIcon>
              Sección 3: Límites del Ecosistema y Plan Gratuito
            </SectionHeaderTitle>
            <Chevron $isOpen={openSection === 2} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </Chevron>
          </SectionHeader>
          <SectionContent $isOpen={openSection === 2}>
            <h4 style={{ color: '#e2e8f0', marginBottom: '16px', fontSize: '15px' }}>Límites de Billetera y Retiros</h4>
            <Grid>
              <InputGroup>
                <Label>Tope Máximo de Billetera Estándar (COP)</Label>
                <Input 
                  type="number" 
                  value={rules.max_balance_cop || ''} 
                  onChange={(e) => handleInputChange('max_balance_cop', e.target.value)}
                />
                <InputDesc>Monto límite fiduciario equivalente en DOMIs que un usuario estándar puede retener. Equivale a {(Number(rules.max_balance_cop || 0) / peg).toLocaleString()} DOMIs.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Retiros Gratuitos Mensuales</Label>
                <Input 
                  type="number" 
                  value={rules.free_withdrawals_per_month || ''} 
                  onChange={(e) => handleInputChange('free_withdrawals_per_month', e.target.value)}
                />
                <InputDesc>Número de retiros off-chain que el usuario puede realizar cada mes calendario sin costo.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Costo de Retiro Excedente (COP)</Label>
                <Input 
                  type="number" 
                  value={rules.withdrawal_fee_cop || ''} 
                  onChange={(e) => handleInputChange('withdrawal_fee_cop', e.target.value)}
                />
                <InputDesc>Comisión fija cobrada a partir del segundo retiro mensual. Equivale a ${(Number(rules.withdrawal_fee_cop || 0) / peg).toFixed(4)} DOMIs.</InputDesc>
              </InputGroup>
            </Grid>

            <h4 style={{ color: '#e2e8f0', marginTop: '24px', marginBottom: '16px', fontSize: '15px' }}>Límites de Catálogo (Plan Gratuito y Mejoras)</h4>
            <Grid>
              <InputGroup>
                <Label>Límite de Sedes en Plan Gratuito</Label>
                <Input 
                  type="number" 
                  value={rules.free_tier_stores_limit || ''} 
                  onChange={(e) => handleInputChange('free_tier_stores_limit', e.target.value)}
                />
                <InputDesc>Cantidad máxima de sedes operativas que un comercio puede crear sin adquirir la mejora &quot;Adicionar Sede&quot;.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Límite de Categorías en Plan Gratuito</Label>
                <Input 
                  type="number" 
                  value={rules.free_tier_categories_limit || ''} 
                  onChange={(e) => handleInputChange('free_tier_categories_limit', e.target.value)}
                />
                <InputDesc>Cantidad máxima de categorías activas en el catálogo que puede tener un comercio sin el plan Empresarial.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Límite de Productos en Plan Gratuito</Label>
                <Input 
                  type="number" 
                  value={rules.free_tier_products_limit || ''} 
                  onChange={(e) => handleInputChange('free_tier_products_limit', e.target.value)}
                />
                <InputDesc>Cantidad máxima de productos activos en el catálogo que puede tener un comercio sin el plan Empresarial.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Límite de Reels en Estatus Influencer</Label>
                <Input 
                  type="number" 
                  value={rules.influencer_reels_limit || ''} 
                  onChange={(e) => handleInputChange('influencer_reels_limit', e.target.value)}
                />
                <InputDesc>Cantidad máxima de reels de video que una sede con estatus Influencer puede tener activos.</InputDesc>
              </InputGroup>
            </Grid>
            <SaveButton style={{ marginTop: '20px' }} onClick={saveParameters}>Guardar Límites</SaveButton>
          </SectionContent>
        </SectionWrapper>

        {/* SECCION 4: MATRIZ DE CANCELACIONES Y REEMBOLSOS */}
        <SectionWrapper $isOpen={openSection === 3}>
          <SectionHeader onClick={() => toggleSection(3)}>
            <SectionHeaderTitle>
              <SectionIcon>↩️</SectionIcon>
              Sección 4: Matriz General de Cancelaciones, Reembolsos, Compensaciones e Incidentes
            </SectionHeaderTitle>
            <Chevron $isOpen={openSection === 3} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </Chevron>
          </SectionHeader>
          <SectionContent $isOpen={openSection === 3}>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Configura los porcentajes de reembolso, retención y compensación aplicados automáticamente cuando un cliente o un repartidor cancela una orden en diferentes estados.
            </p>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO A] Cancelación en Preparación</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Aplica cuando el cliente cancela mientras la sede prepara los productos.</p>
              <Grid>
                {renderSection4Input('customer_cancel_store_refund_prep_rate', 'Reembolso Sede en Preparación')}
                {renderSection4Input('customer_cancel_client_refund_prep_rate', 'Reembolso Cliente en Preparación')}
                {renderSection4Input('customer_cancel_sys_retain_prep_rate', 'Retención Sistema en Preparación')}
              </Grid>
            </div>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO B] Cancelación en Despacho_Listo — Anticipos de Comisión (COD)</span>
                <span style={{ fontSize: '10px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>COD ONLY</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Porcentaje de la comisión de servicio devuelta como anticipo a sede y repartidor.</p>
              <Grid>
                {renderSection4Input('customer_cancel_store_commission_refund_dispatch_rate', 'Anticipo Comisión Sede')}
                {renderSection4Input('customer_cancel_driver_commission_refund_dispatch_rate', 'Anticipo Comisión Repartidor')}
              </Grid>
            </div>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO C] Cancelación en Despacho_Listo — Costo Domicilio</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Fracción de la tarifa de domicilio que se cobra al cliente por cancelación.</p>
              <Grid>
                {renderSection4Input('customer_cancel_driver_delivery_pct_dispatch', 'Porcentaje Domicilio Cobrado')}
              </Grid>
            </div>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO D] Cancelación en Ruta_Tránsito — COD</span>
                <span style={{ fontSize: '10px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>COD ONLY</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Anticipo de comisión al repartidor cuando cancelan con el pedido en camino.</p>
              <Grid>
                {renderSection4Input('customer_cancel_driver_commission_refund_transit_rate', 'Anticipo Comisión Repartidor Tránsito')}
              </Grid>
            </div>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO E] Tasa de Procesamiento de la Plataforma</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Tasa estándar administrativa retenida al liquidar Compensaciones Automáticas o en pagos netos por cancelaciones DOMI.</p>
              <Grid>
                {renderSection4Input('platform_processing_fee_rate', 'Tasa de Procesamiento de la Plataforma')}
              </Grid>
            </div>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO F] Cancelaciones por el Repartidor</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Penalizaciones y compensaciones cuando el repartidor rechaza o cancela el pedido asignado.</p>
              <Grid>
                {renderSection4Input('driver_cancel_pre_pickup_refund_rate', 'Reembolso Repartidor Pre-Pickup')}
                {renderSection4Input('driver_cancel_post_pickup_penalty_rate', 'Penalización Repartidor Post-Pickup')}
                {renderSection4Input('driver_cancellation_compensation_rate', 'Tasa de Compensación al Repartidor')}
              </Grid>
            </div>

            <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO G] Parámetros Generales de Incidente</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Tasas aplicables en la resolución de incidentes abiertos por soporte técnico.</p>
              <Grid>
                {renderSection4Input('refund_standard_rate', 'Tasa Reembolso Estándar de Incidente')}
                {renderSection4Input('rescue_cashback_rate', 'Tasa Reembolso Cashback de Rescate')}
                {renderSection4Input('retention_penalty_rate', 'Tasa Penalización Retención')}
              </Grid>
            </div>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO H] Cancelaciones por la Sede</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Penalizaciones e indemnizaciones cuando la sede cancela la preparación o el despacho.</p>
              <Grid>
                {renderSection4Input('store_cancel_client_indemnity_rate', 'Porcentaje Indemnización Cliente')}
                {renderSection4Input('store_cancel_driver_delivery_pct_rate', 'Porcentaje Domicilio Repartidor')}
                {renderSection4Input('store_cancel_client_indemnity_domi_amount', 'Bono Fijo Indemnización Cliente (DOMI)')}
                {renderSection4Input('driver_commission_refund_on_store_cancel_rate', 'Reembolso Comisión Repartidor')}
              </Grid>
            </div>

            <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[ESCENARIO I] Protocolo de Incidente y Rescate</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Tasas de comisiones y límites de tiempo aplicados en flujos de rescate.</p>
              <Grid>
                {renderSection4Input('driver_rescue_commission_refund_rate', 'Reembolso Comisión Conductor Original')}
                {renderSection4Input('driver_rescue_timeout_minutes', 'Límite Tiempo Búsqueda Rescatista (min)')}
                {renderSection4Input('driver_rescue_max_attempts', 'Intentos Máximos de Rescatistas')}
              </Grid>
            </div>

            <SaveButton style={{ marginTop: '30px' }} onClick={saveParameters}>Guardar Matriz de Cancelaciones</SaveButton>
          </SectionContent>
        </SectionWrapper>

        {/* SECCION 5: SISTEMA DE SCORE Y CASHBACK DEL CLIENTE */}
        <SectionWrapper $isOpen={openSection === 4}>
          <SectionHeader onClick={() => toggleSection(4)}>
            <SectionHeaderTitle>
              <SectionIcon>🎁</SectionIcon>
              Sección 5: Reputación, Penalizaciones y Fidelización (Score, Cashback y Prioridades)
            </SectionHeaderTitle>
            <Chevron $isOpen={openSection === 4} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </Chevron>
          </SectionHeader>
          <SectionContent $isOpen={openSection === 4}>
            <Grid>
              <InputGroup>
                <Label>Fracción Máxima de Cashback al Cliente (Tasa decimal)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={rules.cashback_rate_customer || ''} 
                  onChange={(e) => handleInputChange('cashback_rate_customer', e.target.value)}
                />
                <InputDesc>Fracción máxima del costo del envío (repartidor) que el cliente puede ganar como cashback (0.10 = 10% máximo).</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Score Mínimo Requerido para Cashback</Label>
                <Input 
                  type="number" 
                  value={rules.score_min_for_cashback || ''} 
                  onChange={(e) => handleInputChange('score_min_for_cashback', e.target.value)}
                />
                <InputDesc>Score acumulado que debe tener el cliente para poder jugar en la ruleta de cashback.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Probabilidad Base de Ganar Cashback (Tasa decimal)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={rules.score_cashback_win_base || ''} 
                  onChange={(e) => handleInputChange('score_cashback_win_base', e.target.value)}
                />
                <InputDesc>Probabilidad inicial base para ganar cashback en la ruleta de pedidos (0.10 = 10% de base).</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Score ganado por compra (Efectivo/General)</Label>
                <Input 
                  type="number" 
                  value={rules.score_earned_on_purchase || ''} 
                  onChange={(e) => handleInputChange('score_earned_on_purchase', e.target.value)}
                />
                <InputDesc>Score que gana el cliente al realizar una compra con efectivo u otros métodos no-token.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Score ganado por compra con DOMIs</Label>
                <Input 
                  type="number" 
                  value={rules.score_earned_on_domi_purchase || ''} 
                  onChange={(e) => handleInputChange('score_earned_on_domi_purchase', e.target.value)}
                />
                <InputDesc>Score adicional ganado al realizar la compra pagando con DOMIs.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Penalización Score: Cancelación DOMI Aceptado</Label>
                <Input 
                  type="number" 
                  value={rules.score_penalty_domi_cancel_accepted || ''} 
                  onChange={(e) => handleInputChange('score_penalty_domi_cancel_accepted', e.target.value)}
                />
                <InputDesc>Score deducido por cancelar un pedido en DOMIs en estado Aceptado/Preparando/Listo.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Penalización Score: Cancelación DOMI En Camino</Label>
                <Input 
                  type="number" 
                  value={rules.score_penalty_domi_cancel_in_transit || ''} 
                  onChange={(e) => handleInputChange('score_penalty_domi_cancel_in_transit', e.target.value)}
                />
                <InputDesc>Puntos de Score que se deducen cuando el cliente cancela un pedido pagado con DOMIs en tránsito (En Camino).</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Penalización Score: Cancelación DOMI Despacho</Label>
                <Input 
                  type="number" 
                  value={rules.score_penalty_domi_cancel_dispatch || ''} 
                  onChange={(e) => handleInputChange('score_penalty_domi_cancel_dispatch', e.target.value)}
                />
                <InputDesc>Score deducido por cancelar un pedido en DOMIs en estado Listo para Despacho.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Penalización Score: Cancelación Efectivo Aceptado</Label>
                <Input 
                  type="number" 
                  value={rules.score_penalty_cash_cancel_accepted || ''} 
                  onChange={(e) => handleInputChange('score_penalty_cash_cancel_accepted', e.target.value)}
                />
                <InputDesc>Score deducido por cancelar un pedido en Efectivo en estado Aceptado/Preparando/Listo.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Penalización Score: Cancelación Efectivo Despacho</Label>
                <Input 
                  type="number" 
                  value={rules.score_penalty_cash_cancel_dispatch || ''} 
                  onChange={(e) => handleInputChange('score_penalty_cash_cancel_dispatch', e.target.value)}
                />
                <InputDesc>Score deducido por cancelar un pedido en Efectivo en estado Listo para Despacho.</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Penalización Score: Cancelación Efectivo En Camino</Label>
                <Input 
                  type="number" 
                  value={rules.score_penalty_cash_cancel_in_transit || ''} 
                  onChange={(e) => handleInputChange('score_penalty_cash_cancel_in_transit', e.target.value)}
                />
                <InputDesc>Score deducido por cancelar un pedido en Efectivo en estado En Camino.</InputDesc>
              </InputGroup>
            </Grid>
            <div style={{ marginTop: '24px', marginBottom: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[NUEVO] Repartidores: Puntos de Penalización de Prioridad</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Puntos que se suman al contador de prioridad del conductor al cancelar asignaciones.</p>
              <Grid>
                {renderSection4Input('driver_penalty_points_prep', 'Penalización en Preparación')}
                {renderSection4Input('driver_penalty_points_dispatch', 'Penalización en Despacho')}
                {renderSection4Input('driver_penalty_points_transit', 'Penalización en Tránsito')}
                {renderSection4Input('driver_penalty_points_rescue_original', 'Penalización Conductor Original en Rescate')}
                {renderSection4Input('driver_rescue_chain_penalty_points', 'Penalización Rescatista que Falla')}
              </Grid>
            </div>

            <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.015)' }}>
              <SubSectionTitle style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>[NUEVO] Sedes: Puntos de Penalización de Confiabilidad</span>
                <span style={{ fontSize: '10px', background: 'rgba(72, 214, 76, 0.1)', color: '#48d64c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>DOMI / COD</span>
              </SubSectionTitle>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: '6px 0 16px 0' }}>Puntos de penalización al contador de confiabilidad de la sede al cancelar.</p>
              <Grid>
                {renderSection4Input('store_penalty_points_prep', 'Penalización Sede en Preparación')}
                {renderSection4Input('store_penalty_points_dispatch', 'Penalización Sede en Despacho')}
              </Grid>
            </div>

            <SaveButton onClick={saveParameters}>Guardar Score y Prioridades</SaveButton>
          </SectionContent>
        </SectionWrapper>

        {/* SECCION 6: PASARELA DE PAGO WOMPI */}
        <SectionWrapper $isOpen={openSection === 5}>
          <SectionHeader onClick={() => toggleSection(5)}>
            <SectionHeaderTitle>
              <SectionIcon>💳</SectionIcon>
              Sección 6: Pasarela de Pagos Fiduciarios (Wompi)
            </SectionHeaderTitle>
            <Chevron $isOpen={openSection === 5} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </Chevron>
          </SectionHeader>
          <SectionContent $isOpen={openSection === 5}>
            <Grid>
              <InputGroup>
                <Label>Porcentaje de Comisión Wompi (%)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={rules.wompi_commission_percent || ''} 
                  onChange={(e) => handleInputChange('wompi_commission_percent', e.target.value)}
                />
                <InputDesc>Tasa de comisión porcentual cobrada por Wompi (Ej: 2.65 para 2.65%).</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Tarifa Fija Wompi (COP)</Label>
                <Input 
                  type="number" 
                  value={rules.wompi_commission_fixed_cop || ''} 
                  onChange={(e) => handleInputChange('wompi_commission_fixed_cop', e.target.value)}
                />
                <InputDesc>Tarifa fija en pesos colombianos por transacción de Wompi (Ej: 700 para $700 COP).</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Porcentaje de IVA sobre Comisión (%)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={rules.wompi_commission_iva_percent || ''} 
                  onChange={(e) => handleInputChange('wompi_commission_iva_percent', e.target.value)}
                />
                <InputDesc>Impuesto al valor agregado aplicado sobre el costo de la comisión de la pasarela (Ej: 19 para 19%).</InputDesc>
              </InputGroup>
              <InputGroup>
                <Label>Compra Mínima Aceptada (COP)</Label>
                <Input 
                  type="number" 
                  value={rules.wompi_min_purchase_cop || ''} 
                  onChange={(e) => handleInputChange('wompi_min_purchase_cop', e.target.value)}
                />
                <InputDesc>Valor bruto mínimo en COP requerido por la pasarela de pagos (Ej: 1500).</InputDesc>
              </InputGroup>
            </Grid>
            <SaveButton onClick={saveParameters}>Guardar Parámetros Wompi</SaveButton>
          </SectionContent>
        </SectionWrapper>

        {/* SECCION 7: INTERRUPTORES */}
        <SectionWrapper $isOpen={openSection === 6}>
          <SectionHeader onClick={() => toggleSection(6)}>
            <SectionHeaderTitle>
              <SectionIcon>🔌</SectionIcon>
              Sección 7: Interruptores del Sistema (System Flags)
            </SectionHeaderTitle>
            <Chevron $isOpen={openSection === 6} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </Chevron>
          </SectionHeader>
          <SectionContent $isOpen={openSection === 6}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {flags.map((flag) => (
                <div key={flag.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <SwitchLabel>{flag.label}</SwitchLabel>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Clave de interruptor: {flag.key}</p>
                  </div>
                  <SwitchContainer>
                    <SwitchInput 
                      checked={flag.enabled === 1}
                      onChange={() => handleToggleFlag(flag.key, flag.enabled)}
                    />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: flag.enabled === 1 ? '#10b981' : '#64748b' }}>
                      {flag.enabled === 1 ? 'ON (Habilitado)' : 'OFF (Suspendido)'}
                    </span>
                  </SwitchContainer>
                </div>
              ))}
            </div>
          </SectionContent>
        </SectionWrapper>

        {/* SECCION 8: TARIFA DE DOMICILIO POR DISTANCIA */}
        <SectionWrapper $isOpen={openSection === 7}>
          <SectionHeader onClick={() => toggleSection(7)}>
            <SectionHeaderTitle>
              <SectionIcon>🛵</SectionIcon>
              Sección 8: Tarifación de Logística y Cobertura de Distribución
            </SectionHeaderTitle>
            <Chevron $isOpen={openSection === 7} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </Chevron>
          </SectionHeader>
          <SectionContent $isOpen={openSection === 7}>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Define el modelo matemático lineal para calcular la tarifa de domicilio que paga el cliente. El costo es estático hasta la <strong>distancia base</strong> y luego incrementa de forma proporcional por cada kilómetro extra.
            </p>
            <Grid style={{ marginBottom: '20px' }}>
              {renderSection4Input('delivery_base_fare_cop', 'Tarifa Base del Domicilio (COP)')}
              {renderSection4Input('delivery_base_distance_km', 'Distancia Base Incluida (km)')}
              {renderSection4Input('delivery_extra_rate_cop_per_km', 'Tarifa Extra por Km Adicional (COP)')}
              {renderSection4Input('delivery_max_distance_km', 'Distancia Máxima de Cobertura (km)')}
            </Grid>

            {/* Calculadora reactiva de simulación */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '13px',
              color: '#334155',
              lineHeight: '1.6'
            }}>
              <strong style={{ display: 'block', marginBottom: '8px', color: '#0f172a' }}>
                🧮 Calculadora de Simulación (Tarifas Estimadas):
              </strong>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>A 3 km: <strong>${Math.round(Number(rules.delivery_base_fare_cop || 3100))} COP</strong> (Tarifa base)</li>
                <li>A 5 km: <strong>${Math.round(
                  Number(rules.delivery_base_fare_cop || 3100) + 
                  Math.max(0, 5 - Number(rules.delivery_base_distance_km || 3)) * Number(rules.delivery_extra_rate_cop_per_km || 400)
                )} COP</strong></li>
                <li>A 9 km (Máximo): <strong>${Math.round(
                  Number(rules.delivery_base_fare_cop || 3100) + 
                  Math.max(0, Number(rules.delivery_max_distance_km || 9) - Number(rules.delivery_base_distance_km || 3)) * Number(rules.delivery_extra_rate_cop_per_km || 400)
                )} COP</strong></li>
              </ul>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                * Nota: El modo simulación está activo. Las distancias reales se calcularán cuando se integre el servidor de telemetría.
              </p>
            </div>

            <SaveButton style={{ marginTop: '20px' }} onClick={saveParameters}>Guardar Configuración de Tarifa</SaveButton>
          </SectionContent>
        </SectionWrapper>
      </AccordionContainer>
    </PageContainer>
  );
}
