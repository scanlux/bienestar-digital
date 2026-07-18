import styled from 'styled-components';

export const CloneOptionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 6px;
  margin-top: 1rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

export const CloneOptionCard = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: ${(props: { $selected: boolean }) => props.$selected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)'};
  border: 1.5px solid ${(props: { $selected: boolean }) => props.$selected ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: ${(props: { $selected: boolean }) => props.$selected ? '0 0 16px rgba(16, 185, 129, 0.12)' : 'none'};

  &:hover {
    background: ${(props: { $selected: boolean }) => props.$selected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)'};
    border-color: ${(props: { $selected: boolean }) => props.$selected ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.2)'};
    transform: translateY(-1px);
    
    svg {
      transform: scale(1.05);
    }
  }
  
  &:active {
    transform: translateY(0);
  }
`;

export const StoreImageWrapper = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const EmptyCatalogIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  border: 1.5px dashed rgba(255, 255, 255, 0.15);
  transition: all 0.2s ease;
`;

export const StoreMetaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex-grow: 1;
  text-align: left;
`;

export const StoreNameText = styled.h4`
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
`;

export const StoreAdminText = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  display: flex;
  align-items: center;
`;

export const StorePhoneText = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
  display: flex;
  align-items: center;
`;
