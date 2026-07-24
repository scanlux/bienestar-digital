'use client';
import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(72, 214, 76, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(72, 214, 76, 0); }
  100% { box-shadow: 0 0 0 0 rgba(72, 214, 76, 0); }
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
  color: white;
`;

const SectionHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 16px;
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
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
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
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.02);
  &:focus {
    outline: none;
    border-color: #48d64c;
    box-shadow: 0 0 0 3px rgba(72, 214, 76, 0.15);
  }
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
  cursor: pointer;
  margin-top: 20px;
  animation: ${pulse} 2s infinite;
  &:hover { background: rgba(72, 214, 76, 0.2); }
`;

interface ProtocolRulesFormProps {
  rules: any;
  flags: any[];
  metadata: any;
  openSection: number | null;
  onToggleSection: (idx: number) => void;
  onInputChange: (field: string, val: string) => void;
  onToggleFlag: (key: string, val: number) => void;
  onSave: () => void;
}

export default function ProtocolRulesForm({ rules, flags, metadata, openSection, onToggleSection, onInputChange, onToggleFlag, onSave }: ProtocolRulesFormProps) {
  
  const renderInput = (paramKey: string, defaultLabel: string) => {
    const rawVal = rules[paramKey] !== undefined ? rules[paramKey] : '';
    return (
      <InputGroup key={paramKey}>
        <Label>{defaultLabel}</Label>
        <Input 
          type="number" 
          step="any"
          value={rawVal} 
          onChange={(e) => onInputChange(paramKey, e.target.value)}
        />
      </InputGroup>
    );
  };

  return (
    <AccordionContainer>
      {/* SECCION: MATRIZ DE CANCELACIONES */}
      <SectionWrapper $isOpen={openSection === 3}>
        <SectionHeader onClick={() => onToggleSection(3)}>
          <SectionHeaderTitle>
            <SectionIcon>↩️</SectionIcon>
            Sección 3: Matriz General de Cancelaciones y Reembolsos
          </SectionHeaderTitle>
          <Chevron $isOpen={openSection === 3} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </Chevron>
        </SectionHeader>
        <SectionContent $isOpen={openSection === 3}>
          <Grid>
            {renderInput('customer_cancel_store_refund_prep_rate', 'Reembolso Sede (Prep)')}
            {renderInput('customer_cancel_client_refund_prep_rate', 'Reembolso Cliente (Prep)')}
            {renderInput('customer_cancel_sys_retain_prep_rate', 'Retención Sistema (Prep)')}
            {renderInput('driver_cancel_post_pickup_penalty_rate', 'Penalización Repartidor Post-Pickup')}
            {renderInput('platform_processing_fee_rate', 'Tasa Procesamiento Plataforma')}
          </Grid>
          <SaveButton onClick={onSave}>Guardar Matriz</SaveButton>
        </SectionContent>
      </SectionWrapper>

      {/* SECCION: BANDERAS DEL SISTEMA */}
      <SectionWrapper $isOpen={openSection === 6}>
        <SectionHeader onClick={() => onToggleSection(6)}>
          <SectionHeaderTitle>
            <SectionIcon>🔌</SectionIcon>
            Sección 4: Interruptores del Sistema Financiero
          </SectionHeaderTitle>
          <Chevron $isOpen={openSection === 6} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </Chevron>
        </SectionHeader>
        <SectionContent $isOpen={openSection === 6}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {flags.map((flag) => (
              <div key={flag.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <div>
                  <SwitchLabel>{flag.label}</SwitchLabel>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Clave: {flag.key}</p>
                </div>
                <SwitchContainer>
                  <SwitchInput 
                    checked={flag.enabled === 1}
                    onChange={() => onToggleFlag(flag.key, flag.enabled)}
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
    </AccordionContainer>
  );
}
