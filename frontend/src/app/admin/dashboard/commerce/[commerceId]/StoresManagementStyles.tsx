import styled from 'styled-components';
import { fadeIn } from '@/components/Common/UIElements';

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: ${fadeIn} 0.5s ease-out;
`;

export const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: space-between;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

export const BackButton = styled.button`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  &:hover {
    color: #fff;
  }
`;

export const TitleSection = styled.h1`
  font-size: 1.875rem;
  font-weight: 300;
  margin-bottom: 0.25rem;
  
  span {
    font-weight: 500;
    color: transparent;
    background: linear-gradient(to right, #34d399, #06b6d4);
    -webkit-background-clip: text;
    background-clip: text;
  }
`;

export const SubtitleText = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
`;

export const CreateButton = styled.button`
  width: 100%;
  padding: 0.625rem 1rem;
  border-radius: 0.75rem;
  background-color: #22c55e;
  color: #000;
  font-weight: 700;
  font-size: 0.875rem;
  transition: background-color 0.2s;
  box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.2);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  
  @media (min-width: 768px) {
    width: auto;
  }
  
  &:hover {
    background-color: #4ade80;
  }
`;

export const StoresGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const StoreCard = styled.div`
  padding: 1.5rem;
  border-radius: 1rem;
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  
  &:hover {
    border-color: rgba(34, 197, 94, 0.3);
    background-color: rgba(255, 255, 255, 0.04);
    
    .card-overlay {
      opacity: 1;
    }
  }
  
  .card-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(34, 197, 94, 0.05), transparent);
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }
`;

export const CardContent = styled.div`
  position: relative;
  z-index: 10;
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  
  h3 {
    font-weight: 700;
    font-size: 1.25rem;
    text-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }
  
  .badges {
    display: flex;
    gap: 0.5rem;
  }
`;

export const Badge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
  border: 1px solid transparent;
  
  &.open-now {
    background-color: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.5);
  }
  
  &.closed {
    background-color: rgba(107, 114, 128, 0.2);
    color: #9ca3af;
    border-color: rgba(107, 114, 128, 0.5);
  }
  
  &.open {
    background-color: rgba(34, 197, 94, 0.2);
    color: #4ade80;
  }
  
  &.inactive {
    background-color: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
`;

export const CardFooter = styled.div`
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`;

export const FooterButton = styled.button`
  width: 100%;
  padding: 0.625rem;
  border-radius: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

export const EmptyMessage = styled.div`
  grid-column: 1 / -1;
  padding: 5rem 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  
  span {
    font-size: 0.75rem;
  }
`;
