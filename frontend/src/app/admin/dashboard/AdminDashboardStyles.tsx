import styled, { keyframes } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: ${fadeIn} 0.5s ease-out forwards;
`;

export const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;

  .subtitle {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 6px;
  }
  .title {
    font-size: 2.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .time-badge {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 8px 16px;
    border-radius: 100px;
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: capitalize;
  }
`;

export const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
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
  color: ${props => props.$active ? 'var(--emerald) ' : 'rgba(255,255,255,0.3)'};
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
    background: rgba(72, 214, 76, 0.1);
    color: var(--emerald);
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 6px;
  }
`;

export const PanelContent = styled.div`
  padding: 32px;
  min-height: 400px;
`;

export const RequestList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const RequestItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;

  &:hover { background: rgba(255, 255, 255, 0.04); border-color: rgba(255,255,255,0.08); }

  .b-info {
    display: flex;
    align-items: flex-start;
    gap: 18px;
    .b-logo {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .b-text {
      .b-name-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
      }
      .b-name { font-size: 1rem; font-weight: 700; color: #fff; }
      .b-desc { font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-bottom: 2px; }
      .b-contact-info { font-size: 11px; color: rgba(255, 255, 255, 0.35); }
    }
  }

  .b-actions {
    display: flex;
    gap: 8px;
  }
`;

export const TypeBadge = styled.span`
  font-size: 9px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  
  &.commerce {
    background: rgba(249, 115, 22, 0.1);
    color: #f97316;
    border: 1px solid rgba(249, 115, 22, 0.2);
  }
  
  &.delivery_company {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }
`;

export const ActionBtn = styled.button<{ $variant: 'approve' | 'reject' }>`
  background: ${props => props.$variant === 'approve' ? 'rgba(72, 214, 76, 0.08)' : 'rgba(255, 95, 95, 0.08)'};
  color: ${props => props.$variant === 'approve' ? 'var(--emerald)' : '#ff5f5f'};
  border: 1px solid ${props => props.$variant === 'approve' ? 'rgba(72, 214, 76, 0.1)' : 'rgba(255, 95, 95, 0.1)'};
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'approve' ? 'rgba(72, 214, 76, 0.15)' : 'rgba(255, 95, 95, 0.15)'};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const SidebarTools = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const ToolBox = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 24px;
  border-radius: 28px;

  h3 { font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; }
`;

export const ToolBtn = styled.button`
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 12px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;

  &:hover:not(.disabled) { background: rgba(255, 255, 255, 0.04); color: #fff; padding-left: 16px; }
  &.disabled { opacity: 0.2; cursor: not-allowed; }
  span { font-size: 1.1rem; opacity: 0.6; }
`;

export const StatusBox = styled.div`
  background: rgba(72, 214, 76, 0.03);
  border: 1px solid rgba(72, 214, 76, 0.1);
  padding: 24px;
  border-radius: 28px;

  .st-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    .dot { width: 8px; height: 8px; background: var(--emerald); border-radius: 50%; box-shadow: 0 0 10px var(--emerald); }
    h4 { font-size: 0.85rem; font-weight: 700; color: #fff; }
  }
  p { font-size: 12px; color: rgba(255, 255, 255, 0.4); line-height: 1.6; }
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

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 2px solid rgba(72, 214, 76, 0.1);
  border-top-color: var(--emerald);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;
