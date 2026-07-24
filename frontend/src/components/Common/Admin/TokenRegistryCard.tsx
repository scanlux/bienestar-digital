'use client';
import React from 'react';
import styled from 'styled-components';

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
  outline: none;
  font-family: inherit;
  &:hover { background-color: rgba(255, 255, 255, 0.02); }
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

interface TokenRegistryCardProps {
  tokenInfo: any;
  treasury: any;
  isOpen: boolean;
  onToggle: () => void;
}

export default function TokenRegistryCard({ tokenInfo, treasury, isOpen, onToggle }: TokenRegistryCardProps) {
  const peg = parseFloat(tokenInfo?.fiat_peg_cop || 400);

  return (
    <SectionWrapper $isOpen={isOpen}>
      <SectionHeader onClick={onToggle}>
        <SectionHeaderTitle>
          <SectionIcon>🪙</SectionIcon>
          Sección 1: Estado del Token DOMI (Solo Lectura)
        </SectionHeaderTitle>
        <Chevron $isOpen={isOpen} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </Chevron>
      </SectionHeader>
      <SectionContent $isOpen={isOpen}>
        <StatsGrid>
          <StatCard>
            <StatLabel>Peg Fiduciario del DOMI</StatLabel>
            <StatValue $highlight={true}>${peg.toLocaleString()} COP</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Circulante Oficial</StatLabel>
            <StatValue>{parseFloat(treasury?.circulante_oficial || 0).toLocaleString()} DOMI</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Reserva Fiduciaria Declarada</StatLabel>
            <StatValue>${parseFloat(treasury?.reserva_cop || 0).toLocaleString()} COP</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Ratio de Colateralización</StatLabel>
            <StatValue $highlight={parseFloat(treasury?.collateral_ratio || 0) >= 100}>
              {parseFloat(treasury?.collateral_ratio || 0).toFixed(2)}%
            </StatValue>
          </StatCard>
        </StatsGrid>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '16px', lineHeight: '20px' }}>
          * La gobernanza del peg y las reservas fiduciarias bancarias determinan la equivalencia oficial del token. 
          El peg del DOMI es inmutable desde este panel y solo puede apreciarse mediante declaración formal de rendimientos en la tesorería. Verificado por el hash de integridad.
        </p>
      </SectionContent>
    </SectionWrapper>
  );
}
