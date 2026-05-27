'use client';
import styled from 'styled-components';
import { fadeIn, standardCardHighlight } from '@/components/Common/UIElements';

export const PageContainer = styled.div`
  animation: ${fadeIn} 0.5s ease forwards;
`;

export const HeaderSection = styled.div`
  margin: -2rem -2rem 2rem -2rem;
  padding: 1.25rem 2.5rem;
  position: sticky;
  top: -2rem;
  background: var(--Background);
  z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
`;

export const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-right: 1rem;
`;

export const SectionTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  letter-spacing: -0.01em;
`;

export const SearchWrapper = styled.div`
  position: relative;
  flex: 1.4;
  max-width: 980px;
  margin-right: 2rem;
`;

export const SearchInput = styled.input`
  width: 100%;
  background: #fff;
  border: none;
  padding: 0.6rem 1.25rem 0.6rem 3rem;
  border-radius: 4px;
  color: #333;
  font-size: 0.95rem;
  outline: none;
  
  &::placeholder {
    color: #666;
    font-size: 1.1rem;
    font-weight: 500;
  }
`;

export const SearchIconIcon = styled.svg`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #999;
`;

export const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  margin-top: 0.75rem;
`;

export const CommercesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const CommerceCardWrapper = styled.div<{ $isHighlighted?: boolean }>`
  background: rgba(45, 60, 45, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #10b981;
    background: rgba(45, 60, 45, 0.6);
    transform: translateY(-4px);
  }

  ${props => props.$isHighlighted && standardCardHighlight}
`;

export const CardImageWrapper = styled.div`
  height: 200px;
  position: relative;
  overflow: hidden;
  background: #000;
`;

export const CommerceImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const Badge = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const CardContent = styled.div`
  padding: 1.5rem;
`;

export const CommerceName = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

export const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
`;

export const InfoLabel = styled.span`
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
`;

export const InfoValue = styled.span`
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
`;

export const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 5rem;
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

export const SedesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    padding: 0 10px;
  }
`;

export const SedeCard = styled.div<{ $bgImage?: string; $isHighlighted?: boolean }>`
  position: relative;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background-color: #111;
  background-image: ${p => p.$bgImage ? `url("${p.$bgImage}")` : 'none'};
  background-size: cover;
  background-position: top;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  
  .card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 100%);
    z-index: 1;
    transition: all 0.3s;
  }

  .card-content {
    position: relative;
    z-index: 2;
    padding: 1.25rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: #10b981;
    .card-overlay {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(0,0,0,0.9) 100%);
    }
  }

  ${props => (props as any).$isHighlighted && standardCardHighlight}
`;

export const SedeGhostCard = styled.div`
  height: 200px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.3);
  transition: all 0.2s;

  .icon { font-size: 2rem; }
  .label { font-size: 0.9rem; font-weight: 600; }

  &:hover {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
    color: #10b981;
  }
`;

import { ActionButton } from '@/components/Common/UIElements';

export const SedeEditBtn = styled(ActionButton).attrs({ $variant: 'luminous' })`
  margin-top: 15px;
  width: fit-content;
`;

export const SedeRegresoAlert = styled.div`
  background: #EF4444; /* Danger color */
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
`;




export const SedeCardHeader = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
`;

// SedeEstadoBadge centralizado en StoreHeroStyles.tsx
export { SedeEstadoBadge } from '@/components/Common/StoreHeroStyles';

export const SedeNombre = styled.h4`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
`;

export const SedeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

export const SedeInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.2;
`;

export const SedeInfoIcon = styled.svg`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 1px;
  color: rgba(255, 255, 255, 0.3);
`;

// ScheduleGrid centralizado en ModalStyles.tsx
