'use client';
import styled from 'styled-components';
import { fadeIn, standardCardHighlight } from '@/components/Common/UIElements';
export { ScheduleGrid, AccountsContainer } from '@/components/Common/ModalStyles';

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

export const AccordionItem = styled.div<{ $isOpen: boolean }>`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${p => p.$isOpen ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.04)'};
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.3s ease;
`;

export const AccordionHeader = styled.div<{ $isOpen: boolean }>`
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: ${p => p.$isOpen ? 'rgba(72, 214, 76, 0.05)' : 'transparent'};
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.04); }
  h3 { font-size: 1.1rem; font-weight: 600; color: ${p => p.$isOpen ? 'var(--emerald)' : '#fff'}; }
  .acc-actions { display: flex; align-items: center; gap: 16px; }
  .count { font-size: 0.8rem; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 20px; }
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-top: ${p => p.children ? '16px' : '0'};
`;

export const ProductCardStyle = styled.div`
  display: flex; gap: 16px; background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; padding: 16px;
  cursor: pointer; transition: all 0.2s ease;
  &:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(72, 214, 76, 0.3); }
  .p-img { width: 80px; height: 80px; border-radius: 10px; background: #1a1a1a; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .p-img img { width: 100%; height: 100%; object-fit: cover; }
  .p-img span { font-size: 10px; color: rgba(255,255,255,0.2); }
  .p-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
  .p-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .p-head h4 { font-size: 0.95rem; font-weight: 700; color: #fff; line-height: 1.2; }
  .p-head .price { color: var(--emerald); font-weight: 700; font-size: 0.9rem; }
  .desc { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .p-foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; }
  .p-foot .status { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
  .p-foot .status.on { background: rgba(72, 214, 76, 0.1); color: var(--emerald); }
  .p-foot .status.off { background: rgba(255, 95, 95, 0.1); color: #ff5f5f; }
  .prep-time { font-size: 0.75rem; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 4px; margin-top: 4px; }
  .prep-time .icon-time { width: 12px; height: 12px; opacity: 0.5; }
  .p-foot .edit-link { font-size: 0.75rem; color: rgba(255,255,255,0.3); text-decoration: underline; }
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
