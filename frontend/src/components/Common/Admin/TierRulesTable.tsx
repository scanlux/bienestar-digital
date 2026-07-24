'use client';
import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(72, 214, 76, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(72, 214, 76, 0); }
  100% { box-shadow: 0 0 0 0 rgba(72, 214, 76, 0); }
`;

const SectionWrapper = styled.div<{ $isOpen: boolean }>`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid ${props => props.$isOpen ? 'rgba(72, 214, 76, 0.3)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 12px;
  overflow: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 16px;
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
  margin-top: 20px;
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
  transition: all 0.2s ease;
  &:focus {
    outline: none;
    border-color: #48d64c;
    box-shadow: 0 0 0 3px rgba(72, 214, 76, 0.15);
  }
`;

const InputDesc = styled.p`
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  line-height: 14px;
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
  transition: all 0.2s ease;
  align-self: flex-start;
  margin-top: 20px;
  animation: ${pulse} 2s infinite;
  &:hover {
    transform: translateY(-1px);
    background: rgba(72, 214, 76, 0.2);
  }
`;

interface TierRulesTableProps {
  rules: any;
  peg: number;
  isOpen: boolean;
  onToggle: () => void;
  onInputChange: (field: string, val: string) => void;
  onSave: () => void;
}

export default function TierRulesTable({ rules, peg, isOpen, onToggle, onInputChange, onSave }: TierRulesTableProps) {
  return (
    <SectionWrapper $isOpen={isOpen}>
      <SectionHeader onClick={onToggle}>
        <SectionHeaderTitle>
          <SectionIcon>🛡️</SectionIcon>
          Sección 2: Límites de Catálogo y Plan Gratuito
        </SectionHeaderTitle>
        <Chevron $isOpen={isOpen} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </Chevron>
      </SectionHeader>
      <SectionContent $isOpen={isOpen}>
        <h4 style={{ color: '#e2e8f0', marginBottom: '16px', fontSize: '15px' }}>Límites de Billetera y Retiros</h4>
        <Grid>
          <InputGroup>
            <Label>Tope Máximo de Billetera Estándar (COP)</Label>
            <Input 
              type="number" 
              value={rules.max_balance_cop || ''} 
              onChange={(e) => onInputChange('max_balance_cop', e.target.value)}
            />
            <InputDesc>Equivale a {(Number(rules.max_balance_cop || 0) / peg).toLocaleString()} DOMIs.</InputDesc>
          </InputGroup>
          <InputGroup>
            <Label>Retiros Gratuitos Mensuales</Label>
            <Input 
              type="number" 
              value={rules.free_withdrawals_per_month || ''} 
              onChange={(e) => onInputChange('free_withdrawals_per_month', e.target.value)}
            />
          </InputGroup>
          <InputGroup>
            <Label>Costo de Retiro Excedente (COP)</Label>
            <Input 
              type="number" 
              value={rules.withdrawal_fee_cop || ''} 
              onChange={(e) => onInputChange('withdrawal_fee_cop', e.target.value)}
            />
            <InputDesc>Equivale a ${(Number(rules.withdrawal_fee_cop || 0) / peg).toFixed(4)} DOMIs.</InputDesc>
          </InputGroup>
        </Grid>

        <h4 style={{ color: '#e2e8f0', marginTop: '24px', marginBottom: '16px', fontSize: '15px' }}>Límites de Catálogo</h4>
        <Grid>
          <InputGroup>
            <Label>Límite de Sedes en Plan Gratuito</Label>
            <Input 
              type="number" 
              value={rules.free_tier_stores_limit || ''} 
              onChange={(e) => onInputChange('free_tier_stores_limit', e.target.value)}
            />
          </InputGroup>
          <InputGroup>
            <Label>Límite de Categorías en Plan Gratuito</Label>
            <Input 
              type="number" 
              value={rules.free_tier_categories_limit || ''} 
              onChange={(e) => onInputChange('free_tier_categories_limit', e.target.value)}
            />
          </InputGroup>
          <InputGroup>
            <Label>Límite de Productos en Plan Gratuito</Label>
            <Input 
              type="number" 
              value={rules.free_tier_products_limit || ''} 
              onChange={(e) => onInputChange('free_tier_products_limit', e.target.value)}
            />
          </InputGroup>
          <InputGroup>
            <Label>Límite de Reels en Estatus Influencer</Label>
            <Input 
              type="number" 
              value={rules.influencer_reels_limit || ''} 
              onChange={(e) => onInputChange('influencer_reels_limit', e.target.value)}
            />
          </InputGroup>
        </Grid>
        <SaveButton style={{ marginTop: '20px' }} onClick={onSave}>Guardar Límites</SaveButton>
      </SectionContent>
    </SectionWrapper>
  );
}
