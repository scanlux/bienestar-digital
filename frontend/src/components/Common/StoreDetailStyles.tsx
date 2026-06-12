'use client';
import styled from 'styled-components';
import { fadeIn } from '@/components/Common/UIElements';

export { SedeEstadoBadge, StoreHeroCard } from '@/components/Common/StoreHeroStyles';
export { ScheduleGrid, AccountsContainer } from '@/components/Common/ModalStyles';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  animation: ${fadeIn} 0.3s ease;
`;

export const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;

  .top-header-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .header-buttons {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-top: 20px;

    .title {
      font-size: 1.5rem; font-weight: 300;
      letter-spacing: -0.02em; color: #fff;
    }
  }
`;

export const SeparatorLine = styled.div`
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 0 -24px;
`;

export const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px 0;
  letter-spacing: -0.01em;
`;

export const SectionDesc = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0 0 20px 0;
`;

export const MenuSelectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 1rem;
`;

export const MenuSelectionCard = styled.div<{ $isEnabled: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${p => p.$isEnabled ? 'rgba(16, 185, 129, 0.02)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1px solid ${p => p.$isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  padding: 16px 24px;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: ${p => p.$isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.15)'};
  }
  .menu-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    margin-right: 24px;
    h3 { font-size: 1.05rem; font-weight: 600; color: #fff; margin: 0; }
    p { font-size: 0.8rem; color: rgba(255, 255, 255, 0.4); margin: 0; }
  }
`;

export const MenuControlBar = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .selector-group {
    display: flex;
    align-items: center;
    gap: 12px;
    label { font-size: 0.9rem; color: rgba(255, 255, 255, 0.5); }
  }
`;

export const SelectPremium = styled.select`
  appearance: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 10px 40px 10px 16px;
  border-radius: 10px;
  font-size: 0.95rem; font-weight: 600;
  outline: none; cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 14px top 50%;
  background-size: 10px auto;
  transition: all 0.2s;
  min-width: 320px;
  max-width: 100%;
  
  &:focus { border-color: var(--emerald); }
  option { background: #111; color: #fff; }
`;

export const CategorySelectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 1rem;
`;

export const CategorySelectionCard = styled.div<{ $isEnabled: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${p => p.$isEnabled ? 'rgba(16, 185, 129, 0.02)' : 'rgba(255, 255, 255, 0.01)'};
  border: 1px solid ${p => p.$isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 12px;
  padding: 16px 24px;
  transition: all 0.2s ease;
  
  .cat-info {
    flex: 1;
    margin-right: 24px;
    h3 { font-size: 1rem; font-weight: 600; color: ${p => p.$isEnabled ? '#fff' : 'rgba(255, 255, 255, 0.5)'}; margin: 0; }
    p { font-size: 0.8rem; color: rgba(255, 255, 255, 0.3); margin: 4px 0 0 0; }
  }
  
  .actions-group {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
  }
`;
