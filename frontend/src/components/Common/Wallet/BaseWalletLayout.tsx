import styled, { keyframes } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const pulseGlow = keyframes`
  0% {
    border-color: rgba(0, 255, 128, 0.2);
    box-shadow: 0 0 2px rgba(0, 255, 128, 0.05);
  }
  50% {
    border-color: #00ff80;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.75);
  }
  100% {
    border-color: rgba(0, 255, 128, 0.2);
    box-shadow: 0 0 2px rgba(0, 255, 128, 0.05);
  }
`;

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  animation: ${fadeIn} 0.4s ease;
`;

export const TopCardsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const BalanceCard = styled.div`
  background: linear-gradient(135deg, rgba(20, 35, 25, 0.7) 0%, rgba(10, 15, 12, 0.9) 100%);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 16px;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  min-height: 210px;
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
    z-index: 1;
    pointer-events: none;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 2;
`;

export const CardTitle = styled.span`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
`;

export const BalanceContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  flex: 1;
`;

export const MainBalanceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 44px;
`;

export const BalanceValue = styled.h2`
  font-size: 2.25rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  font-family: monospace;
`;

export const BalanceEquivalent = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
`;

export const EyeButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }
`;

export const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const ActionButton = styled.button<{ $disabled?: boolean }>`
  background: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.02)' : 'rgba(45, 60, 45, 0.25)'};
  border: 1px solid ${p => p.$disabled ? 'rgba(255, 255, 255, 0.05)' : 'rgba(16, 185, 129, 0.18)'};
  border-radius: 10px;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.9)'};
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);

  .icon {
    width: 24px;
    height: 24px;
    stroke: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.15)' : 'var(--emerald, #10b981)'};
    transition: all 0.3s ease;
  }

  &:hover {
    ${p => !p.$disabled && `
      background: rgba(45, 60, 45, 0.45);
      border-color: var(--emerald, #10b981);
      color: #fff;
      transform: translateY(-2px);
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
      .icon {
        transform: scale(1.1);
        stroke: #34d399;
        filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.4));
      }
    `}
  }
`;

export const DynamicSection = styled.div`
  background: rgba(20, 25, 22, 0.85);
  border: 1px solid rgba(16, 185, 129, 0.18);
  border-radius: 16px;
  padding: 2rem;
  animation: ${fadeIn} 0.3s ease;
  backdrop-filter: blur(10px);
`;

export const HelperText = styled.div`
  font-size: 0.85rem;
  color: #10b981;
  margin-top: 0.5rem;
  font-weight: 500;
`;

export const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(16, 185, 129, 0.5);
    color: #fff;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
`;

export const Input = styled.input`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: var(--emerald, #10b981);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);
  }
`;

export const SubmitButton = styled.button`
  background: linear-gradient(135deg, var(--emerald, #10b981) 0%, #059669 100%);
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  color: #000;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const PulsingIncrementDecrementButton = styled.button`
  width: 42px;
  height: 42px;
  background: #040704;
  border: 1px solid rgba(0, 255, 128, 0.25);
  border-radius: 6px;
  color: #fff;
  font-size: 1.6rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: all 0.2s ease-in-out;
  animation: ${pulseGlow} 3s infinite ease-in-out;

  &:hover {
    animation: none;
    border-color: #00ff80;
    box-shadow: 0 0 15px rgba(0, 255, 128, 0.85);
    background: #0a110a;
  }

  &:active {
    transform: scale(0.95);
  }
`;

