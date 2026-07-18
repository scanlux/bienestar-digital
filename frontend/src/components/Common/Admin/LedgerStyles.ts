'use client';
import styled from 'styled-components';

export const GlassCard = styled.div`
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.6) 0%, rgba(18, 18, 18, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const GridSection = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export const KPIRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  width: 100%;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export const FilterSection = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
`;

export const SearchInput = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: #fff;
  font-size: 0.9rem;
  flex: 1;
  min-width: 200px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--emerald);
  }
`;

export const SelectInput = styled.select`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;

  option {
    background: #1e1e1e;
  }
`;

export const TableContainer = styled.div`
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;
`;

export const Th = styled.th`
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

export const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.85);
`;

export const Tr = styled.tr`
  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

export const TxTypeBadge = styled.span<{ $type: string }>`
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  
  background: ${props => {
    switch (props.$type) {
      case 'mint': return 'rgba(16, 185, 129, 0.15)';
      case 'burn_service': return 'rgba(239, 68, 68, 0.15)';
      case 'transfer': return 'rgba(59, 130, 246, 0.15)';
      case 'lock': return 'rgba(245, 158, 11, 0.15)';
      case 'unlock': return 'rgba(139, 92, 246, 0.15)';
      default: return 'rgba(255, 255, 255, 0.15)';
    }
  }};

  color: ${props => {
    switch (props.$type) {
      case 'mint': return '#10b981';
      case 'burn_service': return '#ef4444';
      case 'transfer': return '#3b82f6';
      case 'lock': return '#f59e0b';
      case 'unlock': return '#8b5cf6';
      default: return '#fff';
    }
  }};
`;

export const PaginationSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
`;

export const Button = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const SmallText = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  font-family: monospace;
`;

export const AuditCard = styled(GlassCard)`
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8) 0%, rgba(10, 10, 10, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

export const StatusBadge = styled.div<{ $conciled: boolean }>`
  background: ${props => props.$conciled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${props => props.$conciled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
  color: ${props => props.$conciled ? '#10b981' : '#ef4444'};
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

export const DoughnutChart = styled.div<{ $gradient: string }>`
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: ${props => props.$gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem auto;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);

  &::before {
    content: '';
    width: 84px;
    height: 84px;
    border-radius: 50%;
    background: #181818;
    position: absolute;
    z-index: 2;
  }
`;

export const LegendList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
`;

export const LegendDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$color};
`;

export const VolumeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

export const AccessDeniedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 4rem 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 0, 0, 0.1);
  border-radius: 12px;
  max-width: 500px;
  margin: 4rem auto;
`;

export const DeniedTitle = styled.h2`
  color: #ef4444;
  margin: 0;
  font-size: 1.5rem;
`;

export const DeniedText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 0.95rem;
`;

export const FlagsPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  width: 100%;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

export const FlagCard = styled(GlassCard)`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  gap: 1rem;
`;

export const FlagInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
`;

export const FlagTitle = styled.h4`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const FlagDesc = styled.p`
  margin: 0;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
`;

export const FlagMeta = styled.span`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.3);
`;

export const SwitchContainer = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  flex-shrink: 0;
`;

export const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  
  &:checked + span {
    background-color: var(--emerald, #48d64c);
  }
  
  &:checked + span:before {
    transform: translateX(24px);
  }
`;

export const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #333;
  transition: .3s;
  border-radius: 34px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  
  &:before {
    position: absolute;
    content: "";
    height: 18px; width: 18px;
    left: 3px; bottom: 3px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
  }
`;
