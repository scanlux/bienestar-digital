import styled, { keyframes } from 'styled-components';
import { KpiCard } from '@/components/Common/Dashboard/KpiCard';
import { KpiGrid } from '@/components/Common/Dashboard/KpiGrid';
import { getStatusBorderColor, getStatusBoxShadow } from '../StoreHeroStyles';

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const pulseRedBorder = keyframes`
  0%, 100% {
    border-left-color: rgba(255, 26, 26, 0.15);
  }
  50% {
    border-left-color: #ff1a1a;
  }
`;

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: ${fadeIn} 0.5s ease-out forwards;
`;

export const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
`;

export const Panel = styled.div`
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const PanelTabs = styled.div`
  display: flex;
  gap: 32px;
  padding: 0 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

export const Tab = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  padding: 24px 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${props => props.$active ? 'var(--emerald)' : 'rgba(255,255,255,0.3)'};
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: color 0.2s;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--emerald);
    border-radius: 10px;
    opacity: ${props => props.$active ? 1 : 0};
    transform: scaleX(${props => props.$active ? 1 : 0.5});
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .count {
    background: rgba(16, 185, 129, 0.1);
    color: var(--emerald);
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 6px;
    &.secondary {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.5);
    }
  }
`;

export const PanelContent = styled.div`
  padding: 32px;
  min-height: 400px;
`;

export const OrderList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const OrderItem = styled.div<{ $expanded?: boolean }>`
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid ${props => props.$expanded ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)'};
  padding: 20px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  box-shadow: ${props => props.$expanded ? '0 8px 30px rgba(0, 0, 0, 0.3)' : 'none'};

  &.pendiente {
    border-left: 4px solid #ff1a1a;
    animation: ${pulseRedBorder} 2s infinite ease-in-out;
    background: ${props => props.$expanded ? 'rgba(255, 26, 26, 0.02)' : 'rgba(255, 26, 26, 0.01)'};
  }

  &.aceptado, &.preparando {
    border-left: 4px solid var(--emerald);
    background: ${props => props.$expanded ? 'rgba(16, 185, 129, 0.02)' : 'rgba(16, 185, 129, 0.01)'};
  }

  &.listo, &.listo_despacho {
    border-left: 4px solid #f59e0b;
    background: ${props => props.$expanded ? 'rgba(245, 158, 11, 0.02)' : 'rgba(245, 158, 11, 0.01)'};
  }

  &.en_camino {
    border-left: 4px solid #3b82f6;
    background: ${props => props.$expanded ? 'rgba(59, 130, 246, 0.02)' : 'rgba(59, 130, 246, 0.01)'};
  }

  &.entregado {
    border-left: 4px solid var(--emerald);
    background: ${props => props.$expanded ? 'rgba(16, 185, 129, 0.01)' : 'rgba(16, 185, 129, 0.005)'};
  }

  &.cancelado {
    border-left: 4px solid rgba(255, 26, 26, 0.2);
    background: ${props => props.$expanded ? 'rgba(255, 26, 26, 0.01)' : 'rgba(255, 26, 26, 0.005)'};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .order-main-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    width: 100%;

    @media (max-width: 480px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
  }

  .order-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    width: 100%;

    .order-top-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;

      .order-id { font-size: 0.95rem; font-weight: 800; color: #fff; }
      .order-store { font-size: 0.75rem; color: #ff9e00; background: rgba(255, 165, 0, 0.08); padding: 2px 8px; border-radius: 6px; }
      .order-time { font-size: 0.75rem; color: rgba(255, 255, 255, 0.3); }
    }

    .customer-info { font-size: 0.82rem; color: rgba(255, 255, 255, 0.65); margin: 0; }
    .order-notes { font-size: 0.8rem; color: rgba(255, 255, 255, 0.4); font-style: italic; margin: 0; }

    .order-price-row {
      display: flex;
      gap: 16px;
      font-size: 0.85rem;
      margin-top: 4px;
      .total-amount { color: #fff; font-weight: 700; }
      .domi-cost { color: rgba(255, 255, 255, 0.4); }
    }
  }

  .order-actions {
    display: flex;
    gap: 12px;
    width: 100%;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
    margin-top: 16px;
    padding-top: 16px;
    justify-content: flex-start;
  }
`;

export const ActionButtonStyle = styled.button<{ $variant: 'approve' | 'reject' | 'ready' | 'manage' }>`
  background: ${props => {
    if (props.$variant === 'approve') return 'rgba(16, 185, 129, 0.1)';
    if (props.$variant === 'reject') return 'rgba(255, 26, 26, 0.08)';
    if (props.$variant === 'manage') return 'rgba(245, 158, 11, 0.08)';
    return 'rgba(72, 214, 76, 0.08)';
  }};
  color: ${props => {
    if (props.$variant === 'approve') return 'var(--emerald)';
    if (props.$variant === 'reject') return '#ff1a1a';
    if (props.$variant === 'manage') return '#f59e0b';
    return '#48d64c';
  }};
  border: 1px solid ${props => {
    if (props.$variant === 'approve') return 'rgba(16, 185, 129, 0.2)';
    if (props.$variant === 'reject') return 'rgba(255, 26, 26, 0.1)';
    if (props.$variant === 'manage') return 'rgba(245, 158, 11, 0.2)';
    return 'rgba(72, 214, 76, 0.2)';
  }};
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${props => {
      if (props.$variant === 'approve') return 'rgba(16, 185, 129, 0.18)';
      if (props.$variant === 'reject') return 'rgba(255, 26, 26, 0.15)';
      if (props.$variant === 'manage') return 'rgba(245, 158, 11, 0.15)';
      return 'rgba(72, 214, 76, 0.18)';
    }};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;



export const SelectorGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  label { font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: 600; }
`;

export const SelectPremium = styled.select<{ $estado?: string }>`
  appearance: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${p => getStatusBorderColor(p.$estado, 'rgba(255, 255, 255, 0.1)')};
  box-shadow: ${p => getStatusBoxShadow(p.$estado, 'none')};
  color: #fff;
  padding: 10px 40px 10px 16px;
  border-radius: 10px;
  font-size: 0.9rem; font-weight: 600;
  outline: none; cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 14px top 50%;
  background-size: 10px auto;
  transition: all 0.3s ease;
  width: 100%;
  height: 42px;
  box-sizing: border-box;

  &:focus { border-color: ${p => getStatusBorderColor(p.$estado, 'var(--emerald)')}; }
  option { background: #111; color: #fff; }
`;

export const InputPremium = styled.input<{ $estado?: string }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${p => getStatusBorderColor(p.$estado, 'rgba(255, 255, 255, 0.1)')};
  box-shadow: ${p => getStatusBoxShadow(p.$estado, 'none')};
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 0.9rem; font-weight: 600;
  outline: none;
  transition: all 0.3s ease;
  width: 100%;
  height: 42px;
  box-sizing: border-box;
  color-scheme: dark;

  &:focus { border-color: ${p => getStatusBorderColor(p.$estado, 'var(--emerald)')}; }
`;






export const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
  p { font-size: 0.9rem; color: rgba(255, 255, 255, 0.3); font-weight: 600; }
`;

export const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 2px solid rgba(16, 185, 129, 0.1);
  border-top-color: var(--emerald);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export const BalanceContainer = styled.span`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

export const BalanceValueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
`;

export const BalanceValue = styled.span`
  font-size: 1.45rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  white-space: nowrap;
`;

export const BalanceEquivalent = styled.span`
  font-size: 0.85rem !important;
  font-weight: 600 !important;
  color: #8e8e93 !important;
  margin-top: 4px;
  display: block;
  white-space: nowrap;
`;

export const EyeButton = styled.span`
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.35);
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: var(--emerald, #10b981);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  .eye-icon {
    width: 32px;
    height: 32px;
  }
`;

export const WalletKpiCard = styled(KpiCard)`
  .data {
    flex: 1;
  }
`;

export const DashboardKpiGrid = styled(KpiGrid)<{ $cols: number }>`
  grid-template-columns: repeat(${props => props.$cols}, 1fr);

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ConfiguracionKpiCard = styled.div<{ $isActive: boolean }>`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${props => props.$isActive ? 'var(--emerald, #10b981)' : 'rgba(255, 255, 255, 0.05)'};
  padding: 24px;
  border-radius: 24px;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  min-height: 104px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isActive ? '0 8px 32px rgba(16, 185, 129, 0.04)' : 'none'};

  .icon {
    width: 52px;
    height: 52px;
    background: ${props => props.$isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)'};
    border: 1px solid ${props => props.$isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.$isActive ? 'var(--emerald, #10b981)' : 'rgba(255, 255, 255, 0.25)'};
    flex-shrink: 0;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: ${props => props.$isActive ? '0 0 12px rgba(16, 185, 129, 0.15)' : 'none'};

    &:hover {
      transform: scale(1.06);
      background: ${props => props.$isActive ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.06)'};
      color: ${props => props.$isActive ? 'var(--emerald, #10b981)' : 'rgba(255, 255, 255, 0.45)'};
      border-color: ${props => props.$isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'};
    }
  }

  .card-settings-gear {
    position: absolute;
    top: 14px;
    right: 14px;
    color: rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 50%;
    background: transparent;

    &:hover {
      color: #fff;
      transform: rotate(45deg);
      background: rgba(255, 255, 255, 0.03);
    }
  }

  .config-data {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;

    .label {
      font-size: 11px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .controls {
      display: flex;
      flex-direction: column;
      gap: 6px;
      
      .store-select-wrapper {
        select {
          width: 90%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 8px;
          outline: none;
          cursor: pointer;
          &:hover {
            border-color: rgba(255, 255, 255, 0.25);
          }
        }
      }

      .toggle-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 2px;
        
        span {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          strong {
            color: var(--emerald);
            &.manual { color: #ff1a1a; }
          }
        }
      }
    }
  }
`;

export const HeroCard = styled.div<{ $bgImage?: string; $estado?: string }>`
  position: relative;
  width: 100%;
  min-height: 180px;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  background-color: #0b0b0b;
  background-image: ${p => p.$bgImage ? `url("${p.$bgImage}")` : 'none'};
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(16, 185, 129, 0.15);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(10, 10, 10, 0.95) 0%, rgba(10, 10, 10, 0.75) 50%, rgba(6, 78, 59, 0.25) 100%);
    z-index: 1;
  }

  .hero-content {
    position: relative;
    z-index: 2;
    padding: 24px 32px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: flex-start;
      padding: 20px;
    }
  }

  .hero-left {
    display: flex;
    align-items: center;
    gap: 20px;
    flex: 1;

    @media (max-width: 640px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
  }

  .logo-container {
    width: 120px;
    height: 120px;
    border-radius: 20px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    span {
      font-size: 2rem;
      font-weight: 800;
      color: var(--emerald);
    }
  }

  .hero-details {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .commerce-name, .store-name {
      font-size: 1.75rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .commerce-nit, .store-nit {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--emerald);
      background: rgba(16, 185, 129, 0.1);
      padding: 4px 10px;
      border-radius: 8px;
      width: fit-content;
    }

    .commerce-desc, .store-desc {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 4px 0 0 0;
      line-height: 1.4;
      max-width: 500px;
    }
  }

  .hero-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 16px;

    @media (max-width: 768px) {
      width: 100%;
      align-items: flex-start;
      flex-direction: row;
      justify-content: space-between;
    }

    @media (max-width: 480px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

export const CommerceHeroCard = HeroCard;

export const CommerceInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.45);
  padding: 16px 20px;
  border-radius: 16px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  min-width: 280px;
  backdrop-filter: blur(8px);

  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-size: 0.8rem;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
    padding-bottom: 4px;
    &:last-child { border-bottom: none; padding-bottom: 0; }
  }

  .info-label { color: rgba(255, 255, 255, 0.5); font-weight: 500; }
  .info-value { color: #fff; font-weight: 700; text-align: right; }
`;

export const VerPerfilButton = styled.button`
  background: rgba(16, 185, 129, 0.25);
  border: 1px solid rgba(16, 185, 129, 0.6);
  color: #00ff80;
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.5rem 1.25rem;
  border-radius: 20px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.55);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px) brightness(0.6);
  -webkit-backdrop-filter: blur(10px) brightness(0.6);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  width: fit-content;

  &:hover {
    background: rgba(16, 185, 129, 0.4);
    border-color: rgba(16, 185, 129, 0.8);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25);
  }

  &:active {
    transform: translateY(0);
  }
`;

export const StoreHeroCard = styled(HeroCard)<{ $estado?: string }>`
  border: 1px solid ${p => getStatusBorderColor(p.$estado, 'rgba(16, 185, 129, 0.15)')};
  box-shadow: ${p => getStatusBoxShadow(p.$estado, '0 8px 32px 0 rgba(0, 0, 0, 0.37)')};
  transition: all 0.3s ease;
`;

export const CollapsibleContainer = styled.div<{ $expanded: boolean }>`
  display: grid;
  grid-template-rows: ${props => props.$expanded ? '1fr' : '0fr'};
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  width: 100%;
`;

export const CollapsibleInner = styled.div<{ $expanded?: boolean }>`
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: all 0.3s ease;
  ${props => props.$expanded ? `
    padding-top: 16px;
    margin-top: 12px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
  ` : `
    padding-top: 0;
    margin-top: 0;
    border-top: none;
  `}
`;

export const ExtendedDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 12px;

  .detail-box {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .label {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .value {
      font-size: 0.85rem;
      color: #fff;
      font-weight: 600;
    }
    
    .score-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      color: var(--emerald);
      &.low { color: #ff1a1a; }
      &.medium { color: #ff9e00; }
    }
  }
`;

export const StepperContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 14px 0;
  margin: 0 16px;
  flex: 2;
  max-width: 750px;
  min-width: 320px;

  @media (max-width: 768px) {
    max-width: none;
    width: 100%;
    margin: 8px 0 16px 0;
    justify-content: flex-start;
  }
`;

export const StepperWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  width: 100%;
`;

export const StepperLine = styled.div<{ $progress: number }>`
  position: absolute;
  top: 11px;
  left: 0;
  height: 6px;
  border-radius: 3px;
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  z-index: 1;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 3px;
    width: ${props => props.$progress}%;
    background: linear-gradient(90deg, #ff5f5f 0%, #f59e0b 50%, var(--emerald) 100%);
    transition: width 0.4s ease;
  }
`;

export const StepNode = styled.div<{ $active: boolean; $completed: boolean; $cancelled?: boolean; $stepIndex: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
  position: relative;
  cursor: default;

  .circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${props => {
      if (props.$cancelled) return '#2a1a1a';
      if (props.$completed) return 'var(--emerald)';
      if (props.$active) {
        if (props.$stepIndex === 1) return '#ff1a1a';
        if (props.$stepIndex >= 2 && props.$stepIndex <= 4) return '#f59e0b';
        return 'var(--emerald)';
      }
      return '#1a1a1a';
    }};
    border: 2.2px solid ${props => {
      if (props.$cancelled) return '#ff1a1a';
      if (props.$completed) return 'var(--emerald)';
      if (props.$active) {
        if (props.$stepIndex === 1) return '#ff1a1a';
        if (props.$stepIndex >= 2 && props.$stepIndex <= 4) return '#f59e0b';
        return 'var(--emerald)';
      }
      return 'rgba(255, 255, 255, 0.15)';
    }};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 800;
    color: ${props => (props.$active || props.$completed || props.$cancelled ? '#fff' : 'rgba(255, 255, 255, 0.4)')};
    transition: all 0.3s ease;
    box-shadow: ${props => {
      if (props.$cancelled) return 'none';
      if (props.$completed) return '0 0 8px rgba(0, 255, 128, 0.15)';
      if (props.$active) {
        if (props.$stepIndex === 1) return '0 0 8px rgba(255, 26, 26, 0.3)';
        if (props.$stepIndex >= 2 && props.$stepIndex <= 4) return '0 0 8px rgba(245, 158, 11, 0.3)';
        return '0 0 8px rgba(16, 185, 129, 0.3)';
      }
      return 'none';
    }};
  }

  .label {
    font-size: 0.68rem;
    color: ${props => {
      if (props.$cancelled) return '#ff1a1a';
      if (props.$active || props.$completed) return '#fff';
      return 'rgba(255, 255, 255, 0.4)';
    }};
    font-weight: ${props => (props.$active || props.$completed ? '700' : '500')};
    margin-top: 6px;
    white-space: nowrap;
    position: absolute;
    top: 30px;
    left: 50%;
    transform: translateX(-50%);
  }
`;

export const OrderItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 12px;
`;

export const OrderItemsHeader = styled.div`
  display: grid;
  grid-template-columns: 36px 240px 140px 1fr 100px;
  align-items: center;
  gap: 12px;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
  margin-bottom: 8px;

  .col-detail {
    grid-column: span 2;
    text-align: left;
  }
  .col-agotado {
    text-align: center;
  }
  .col-qty {
    text-align: right;
    color: rgba(255, 255, 255, 0.4);
  }
  .col-price {
    text-align: right;
    color: #ff9e00;
  }
`;

export const OrderItemRow = styled.div`
  display: grid;
  grid-template-columns: 36px 240px 140px 1fr 100px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  &:last-child {
    border-bottom: none;
  }
`;

export const ItemThumbnail = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
`;

export const ItemThumbnailPlaceholder = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
`;

export const ItemName = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  flex: 1;
`;

export const ItemQtyBadge = styled.span`
  background: rgba(16, 185, 129, 0.1);
  color: var(--emerald);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
`;

export const ItemPrice = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  text-align: right;
  min-width: 80px;
`;

export const OrderNotesContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.15);
  padding: 12px 16px;
  border-radius: 10px;
  margin-top: 8px;

  .notes-icon {
    color: #f59e0b;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .notes-content {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .notes-label {
      font-size: 0.7rem;
      color: #f59e0b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .notes-text {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.8);
      font-style: italic;
      line-height: 1.4;
    }
  }
`;

export const CheckboxLabel = styled.label`
  display: block;
  position: relative;
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin-left: 12px;
  flex-shrink: 0;

  input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }

  .checkbox-custom {
    position: absolute;
    top: 0;
    left: 0;
    height: 20px;
    width: 20px;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1.5px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    transition: all 0.2s ease;
  }

  &:hover input ~ .checkbox-custom {
    border-color: rgba(239, 68, 68, 0.5);
    background-color: rgba(239, 68, 68, 0.03);
  }

  input:checked ~ .checkbox-custom {
    background-color: #ef4444;
    border-color: #ef4444;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
  }

  .checkbox-custom:after {
    content: "";
    position: absolute;
    display: none;
  }

  input:checked ~ .checkbox-custom:after {
    display: block;
  }

  .checkbox-custom:after {
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
`;

