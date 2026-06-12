'use client';
import styled, { keyframes } from 'styled-components';
import { fadeIn, standardCardHighlight } from '@/components/Common/UIElements';
export { ScheduleGrid, AccountsContainer } from '@/components/Common/ModalStyles';

const pulseGlow = keyframes`
  0% {
    border-color: rgba(72, 214, 76, 0.4);
    box-shadow: 0 0 5px rgba(72, 214, 76, 0.2);
    background: rgba(72, 214, 76, 0.05);
  }
  100% {
    border-color: rgba(72, 214, 76, 1);
    box-shadow: 0 0 15px rgba(72, 214, 76, 0.5);
    background: rgba(72, 214, 76, 0.12);
  }
`;

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

export const AnimatedSection = styled.div`
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

export { SedeEstadoBadge, StoreHeroCard } from '@/components/Common/StoreHeroStyles';

export const SeparatorLine = styled.div`
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 0 -24px;
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

  .button-group {
    display: flex;
    gap: 12px;
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

export const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  .categories-header {
     display: flex; 
     justify-content: flex-start; 
     align-items: center;
     gap: 20px;
     .section-title { font-size: 1.2rem; font-weight: 600; color: #fff; }
  }
`;

export const AccordionList = styled.div` display: flex; flex-direction: column; gap: 12px; `;

export const AccordionItem = styled.div<{ $isOpen: boolean; $isEnabled?: boolean }>`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${p => p.$isOpen ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 16px;
  overflow: hidden;
  opacity: ${p => p.$isEnabled === false ? 0.5 : 1};
  filter: ${p => p.$isEnabled === false ? 'grayscale(0.6)' : 'none'};
  transition: border-color 0.3s ease, opacity 0.3s ease, filter 0.3s ease;
`;

export const AccordionHeader = styled.div<{ $isOpen: boolean }>`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  cursor: pointer;
  background: ${p => p.$isOpen ? 'rgba(72, 214, 76, 0.05)' : 'transparent'};
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.04); }
  h3 { font-size: 1.35rem; font-weight: 600; color: ${p => p.$isOpen ? 'var(--emerald)' : '#fff'}; }
  .acc-actions { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
  .count { font-size: 0.8rem; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 20px; }

  .header-thumbnails {
    display: flex;
    align-items: center;
    margin-top: 16px;
    padding-top: 16px;
    width: 100%;
    overflow: hidden;
    position: relative;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    
    @media (max-width: 520px) {
      display: none;
    }
  }

  .thumb-scroll-wrapper {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 2px 0;
    max-width: 100%;
    
    &::-webkit-scrollbar {
      display: none;
    }
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .thumb-item {
    width: 80px;
    height: 80px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, border-color 0.2s ease;
    cursor: pointer;

    &:hover {
      transform: scale(1.05);
      border-color: var(--emerald);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumb-placeholder {
      font-size: 0.65rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.4);
    }
  }
`;

export const Chevron = styled.span<{ $isOpen: boolean }>`
  font-size: 0.8rem;
  color: ${p => p.$isOpen ? 'var(--emerald)' : 'rgba(255,255,255,0.3)'};
  transform: ${p => p.$isOpen ? 'rotate(-180deg)' : 'rotate(0deg)'};
  transition: transform 0.3s ease, color 0.3s ease;
`;

export const AccordionContentWrapper = styled.div<{ $isOpen: boolean }>`
  display: grid;
  grid-template-rows: ${p => p.$isOpen ? '1fr' : '0fr'};
  transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  .acc-body { overflow: hidden; }
`;

export const ProductsGrid = styled.div`
  padding: 0 24px 24px 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: ${p => p.children ? '16px' : '0'};

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const EditIconButton = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:active {
    transform: scale(0.95);
  }
`;

export const ProductCardStyle = styled.div<{ $isEnabled?: boolean; $isDisponible?: boolean; $isHighlighted?: boolean }>`
  display: flex; gap: 12px;
  background: ${p => (p.$isEnabled === false || p.$isDisponible === false) ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 12px;
  cursor: pointer; transition: all 0.2s ease;
  opacity: ${p => (p.$isEnabled === false || p.$isDisponible === false) ? 0.55 : 1};
  filter: ${p => (p.$isEnabled === false || p.$isDisponible === false) ? 'grayscale(0.85) contrast(0.75)' : 'none'};
  &:hover { background: ${p => (p.$isEnabled === false || p.$isDisponible === false) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)'}; border-color: rgba(72, 214, 76, 0.3); }
  
  ${props => props.$isHighlighted && standardCardHighlight}
  
  .p-left-col {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .p-img { width: 120px; height: 120px; border-radius: 10px; background: #1a1a1a; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .p-img img { width: 100%; height: 100%; object-fit: cover; }
  .p-img span { font-size: 10px; color: rgba(255,255,255,0.2); }

  .p-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
  
  .p-info-body {
    display: flex;
    flex-direction: column;
    
    h4 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }
  }

  .price {
    color: var(--emerald);
    font-weight: 700;
    font-size: 1.1rem;
    white-space: nowrap;
    margin-top: 6px;
  }

  .prep-time { font-size: 0.75rem; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 4px; margin-top: 4px; }
  .prep-time .icon-time { width: 12px; height: 12px; opacity: 0.5; }
  
  .p-info-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    
    .action-control {
      margin-left: auto;
    }
    
    .edit-link {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.3);
      text-decoration: underline;
    }
  }
`;

export const ProductCreateCard = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; background: transparent; border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 16px; padding: 24px; cursor: pointer; transition: all 0.2s ease;
  min-height: 114px;
  .icon { font-size: 24px; color: rgba(255,255,255,0.2); }
  p { font-size: 0.85rem; color: rgba(255,255,255,0.4); text-align: center; font-weight: 500;}
  &:hover { border-color: rgba(72, 214, 76, 0.4); background: rgba(72, 214, 76, 0.02); }
  &:hover .icon { color: var(--emerald); }
  &:hover p { color: rgba(255,255,255,0.7); }
`;
 
export const EmptyHeroCard = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; background: transparent; border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 20px; padding: 60px 20px; cursor: pointer; transition: all 0.2s ease;
  margin-top: 20px;
  &:hover { border-color: rgba(72, 214, 76, 0.4); background: rgba(72, 214, 76, 0.02); }
  .icon { font-size: 32px; color: rgba(255,255,255,0.2); transition: color 0.2s; }
  &:hover .icon { color: var(--emerald); }
  .animated-text { font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 16px; animation: colorShift 4s infinite; }
  .arrow { animation: fadeArrow 1.5s infinite alternate; }
  @keyframes colorShift { 0% { color: #fff; } 33% { color: rgb(72, 214, 76); } 66% { color: #ccc; } 100% { color: #fff; } }
  @keyframes fadeArrow { 0% { opacity: 0; color: rgba(17, 17, 17, 1); } 100% { opacity: 1; color: inherit; } }
`;
 
// Animaciones Globales de Feedback
export const GlobalFeedbackStyles = styled.div`
  .highlight-glow {
    ${standardCardHighlight}
  }
`;

export const UnifiedCatalogCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const UnifiedControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
  gap: 16px;

  .selector-group {
    display: flex;
    align-items: center;
    gap: 12px;
    label { font-size: 0.9rem; color: rgba(255, 255, 255, 0.5); }
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-left: auto;
  }
`;

