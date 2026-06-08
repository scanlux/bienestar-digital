'use client';
import styled from 'styled-components';
import { ActionButton, standardCardHighlight, fadeIn } from '@/components/Common/UIElements';

export { SedeEstadoBadge } from './StoreHeroStyles';

export const PageContainer = styled.div`
  animation: ${fadeIn} 0.5s ease forwards;
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

export const GenericCardWrapper = styled.div<{ $isHighlighted?: boolean }>`
  background: rgba(45, 60, 45, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  
  &:hover {
    border-color: var(--emerald);
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

export const StoreImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const CardContent = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

export const StoreName = styled.h3`
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

export const SedeGhostCard = styled.div`
  min-height: 380px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 8px;
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
    border-color: var(--emerald);
    background: rgba(16, 185, 129, 0.05);
    color: var(--emerald);
  }
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
  margin-bottom: 12px;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
`;
