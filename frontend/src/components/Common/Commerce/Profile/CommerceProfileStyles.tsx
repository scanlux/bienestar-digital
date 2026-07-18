'use client';
import styled from 'styled-components';
import { Card } from '@/app/commerce/stores/[storeId]/profile/StoreProfileStyles';

export const AccountsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

export const AccountCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.25s ease;

  &.default {
    border-color: rgba(16, 185, 129, 0.35);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .acc-method {
    font-size: 0.95rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.5px;
  }

  .default-badge {
    background: rgba(16, 185, 129, 0.2);
    color: #00ff80;
    border: 1px solid rgba(16, 185, 129, 0.4);
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.75);

    p {
      margin: 0;
    }
  }

  .card-actions {
    margin-top: auto;
    display: flex;
    gap: 10px;
  }
`;

export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.25);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
`;

export const Th = styled.th`
  padding: 1.1rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const Td = styled.td`
  padding: 1.1rem 1.25rem;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

export const Tr = styled.tr`
  transition: background 0.15s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.015);
  }
  &:last-child td {
    border-bottom: none;
  }
`;

export const ActionButtonSmall = styled.button<{ $variant?: 'edit' | 'recovery' }>`
  background: ${props => props.$variant === 'recovery' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${props => props.$variant === 'recovery' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${props => props.$variant === 'recovery' ? '#10b981' : 'rgba(255, 255, 255, 0.8)'};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 8px;

  &:hover {
    background: ${props => props.$variant === 'recovery' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.$variant === 'recovery' ? '#00ff80' : 'rgba(255, 255, 255, 0.2)'};
    color: #fff;
    box-shadow: 0 0 8px ${props => props.$variant === 'recovery' ? 'rgba(16, 185, 129, 0.25)' : 'none'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const SedesSelectionBox = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .store-checkbox {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    input {
      cursor: pointer;
    }

    span {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.85);
    }
  }
`;

// --- MODAL ELEMENTOS DE APOYO (REUTILIZADOS EN EL PORTAL DE ESTILOS) ---

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: modalFadeIn 0.25s ease forwards;

  @keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

export const ModalContent = styled.div`
  background: linear-gradient(135deg, rgba(20, 25, 22, 0.95) 0%, rgba(10, 12, 11, 0.98) 100%);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  padding: 30px;
  box-shadow: 0 10px 45px rgba(0,0,0,0.8);
  position: relative;
  animation: modalSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;

  @keyframes modalSlideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
`;

export const ModalTitle = styled.h2`
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 1.75rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;

  &:hover {
    color: #fff;
  }
`;
