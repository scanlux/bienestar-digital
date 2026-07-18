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
  color: ${props => props.$active ? '#3b82f6' : 'rgba(255,255,255,0.3)'};
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
    background: #3b82f6;
    border-radius: 10px;
    opacity: ${props => props.$active ? 1 : 0};
    transform: scaleX(${props => props.$active ? 1 : 0.5});
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .count {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
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

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

export const ConfirmModalContainer = styled.div`
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);

  h2 {
    font-size: 1.5rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 24px;
    letter-spacing: -0.02em;
  }

  .modal-details {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 24px;
    font-size: 0.88rem;
    color: rgba(255, 255, 255, 0.7);

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      &:last-child {
        margin-bottom: 0;
        padding-top: 12px;
        border-top: 1px dashed rgba(255, 255, 255, 0.1);
      }
      span.highlight {
        color: #fff;
        font-weight: 700;
      }
      span.result-balance {
        color: #3b82f6;
        font-weight: 700;
      }
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;

    button {
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    button.cancel {
      background: none;
      color: rgba(255, 255, 255, 0.6);
      border-color: rgba(255, 255, 255, 0.1);
      &:hover {
        background: rgba(255, 255, 255, 0.03);
        color: #fff;
      }
    }

    button.confirm {
      background: #3b82f6;
      color: #fff;
      &:hover:not(:disabled) {
        background: #2563eb;
        transform: translateY(-2px);
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
`;

export const DriverModalContainer = styled.div`
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 32px;
  padding: 32px;
  max-width: 950px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 24px;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .close-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      font-size: 1.5rem;
      cursor: pointer;
      &:hover { color: #fff; }
    }
  }

  .filters-row {
    display: flex;
    gap: 16px;
    align-items: center;

    .search-wrapper {
      position: relative;
      flex: 1;
      input {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 10px 16px;
        color: #fff;
        font-size: 0.9rem;
        outline: none;
        &:focus { border-color: #3b82f6; }
      }
    }

    .period-wrapper {
      display: flex;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 3px;

      button {
        background: none;
        border: none;
        padding: 8px 16px;
        font-size: 0.82rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        border-radius: 9px;
        transition: all 0.2s;

        &.active {
          background: #3b82f6;
          color: #fff;
        }
      }
    }
  }

  .table-wrapper {
    overflow-x: auto;
    max-height: 400px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 16px;

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;

      th, td {
        padding: 14px 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      }

      th {
        background: rgba(255, 255, 255, 0.02);
        color: rgba(255, 255, 255, 0.4);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.05em;
      }

      td {
        color: rgba(255, 255, 255, 0.85);
      }

      tr:last-child td {
        border-bottom: none;
      }

      .status-cell {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
        font-size: 11px;
        color: #ff5f5f;
        &.active { color: var(--emerald); }
      }
    }
  }
`;
