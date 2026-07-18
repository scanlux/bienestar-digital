import React from 'react';
import styled, { keyframes } from 'styled-components';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { fadeIn, spin, Spinner } from './UIElements';

// Animations moved to UIElements.tsx

// === MODAL SHELL ===

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: start center;
  padding: 60px 20px 80px 20px; /* Margen superior amplio y margen inferior de seguridad */
  z-index: 1000;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
`;

export const ModalContent = styled.div<{ $maxWidth?: string }>`
  background: rgba(18, 22, 19, 0.95);
  border: 1px solid rgba(16, 185, 129, 0.35);
  width: 100%;
  max-width: ${props => props.$maxWidth || '650px'};
  border-radius: 20px;
  padding: 2.5rem;
  position: relative;
  height: auto;
  margin: 0 auto;
  animation: ${fadeIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 45px rgba(16, 185, 129, 0.15);
  backdrop-filter: blur(12px);
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

export const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
`;

export const ModalSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  margin: 0.25rem 0 0 0;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 1rem;

  &:hover {
    color: #fff;
  }
`;

// === WARNING BANNER ===

export const WarningBanner = styled.div`
  background-color: rgba(234, 179, 8, 0.1);
  border-left: 4px solid #eab308;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  color: #fef08a;
  font-size: 0.85rem;
  line-height: 1.4;
  animation: ${fadeIn} 0.3s ease;

  strong {
    color: #facc15;
    font-weight: 700;
  }
`;

// === FORM SYSTEM (referencia: commerce/page.tsx) ===

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const Input = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.7rem 1rem;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }

  &:focus {
    border-color: rgba(16, 185, 129, 0.5);
    background: rgba(255, 255, 255, 0.07);
  }

  /* Para que los inputs de tipo number se vean consistentes */
  &[type='number'] {
    -moz-appearance: textfield;
  }
  &[type='number']::-webkit-inner-spin-button,
  &[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }

  .was-validated &:invalid {
    border-color: #ef4444 !important;
    color: #f87171 !important;
    background: rgba(239, 68, 68, 0.05) !important;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
  }
`;

export const Select = styled.select`
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.7rem 1rem;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  box-sizing: border-box;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 14px top 50%;
  background-size: 10px auto;

  &:focus {
    border-color: rgba(16, 185, 129, 0.5);
  }

  option {
    background: #1a1a1a;
    color: #fff;
  }

  .was-validated &:invalid {
    border-color: #ef4444 !important;
    color: #f87171 !important;
    background: rgba(239, 68, 68, 0.05) !important;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.7rem 1rem;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
  font-family: inherit;

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }

  &:focus {
    border-color: rgba(16, 185, 129, 0.5);
    background: rgba(255, 255, 255, 0.07);
  }

  .was-validated &:invalid {
    border-color: #ef4444 !important;
    color: #f87171 !important;
    background: rgba(239, 68, 68, 0.05) !important;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
  }
`;

export const SubmitButton = styled.button`
  width: 100%;
  background: #10b981;
  color: #000;
  padding: 0.85rem;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s, transform 0.1s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);

  &:hover {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: #10b981;
    cursor: pointer;
  }

  label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
  }
`;

import { ActionButton } from './UIElements';

export const GeoButton = styled(ActionButton).attrs({ $variant: 'luminous' })`
  width: 100%;
  border-radius: 10px;
  font-size: 0.95rem;

  svg {
    width: 20px;
    height: 20px;
  }
`;

export const GeoInfo = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 0.25rem;
  animation: ${fadeIn} 0.4s ease;
  
  .geo-tag {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    display: flex;
    align-items: center;
    gap: 6px;
    
    strong {
      color: #10b981;
      font-weight: 700;
    }
  }
`;

// Spinner moved to UIElements.tsx

export const ScheduleGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  margin-top: 5px;

  .grid-header {
    display: grid;
    grid-template-columns: 100px 120px 1fr 60px;
    gap: 12px;
    padding: 0 8px 8px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.65);
    text-align: center;
    span:first-child { text-align: left; }
  }

  .grid-row {
    display: grid;
    grid-template-columns: 100px 120px 1fr 60px;
    gap: 12px;
    align-items: center;
    padding: 6px 8px;
    border-radius: 8px;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .day-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
    }

    .status-select {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: #fff;
      font-size: 0.85rem;
      padding: 6px 10px;
      outline: none;
      cursor: pointer;
      transition: all 0.2s;

      &:focus {
        background: rgba(255, 255, 255, 0.18);
        border-color: #10b981;
      }

      &.abierto { color: #34d399; font-weight: 700; }
      &.cerrado { color: #f87171; }
    }

    .time-inputs {
      display: grid;
      grid-template-columns: 24px 1fr 20px 1fr 24px;
      gap: 8px;
      align-items: center;
      width: 100%;
      max-width: 380px; /* Aumentado ligeramente para acomodar el nuevo spacer */
      margin: 0 auto;

      input {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid #10b981;
        padding: 6px 12px;
        width: 100%;
        font-size: 0.95rem;
        text-align: center;
        border-radius: 6px;
        color: #fff;
        transition: all 0.2s;
        box-sizing: border-box;

        &:focus {
          background: rgba(16, 185, 129, 0.2);
          border-color: #34d399;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }



        &:disabled {
          opacity: 0.3;
          background: rgba(255, 255, 255, 0.05);
        }

        &.maintenance-mode {
          border-color: #f97316;
          color: #ffedd5; /* Color crema/blanco para contraste sobre naranja */
          background: rgba(249, 115, 22, 0.15);
          
          &:focus {
            border-color: #ff781f;
            background: rgba(249, 115, 22, 0.2);
            box-shadow: 0 0 15px rgba(249, 115, 22, 0.5);
          }
        }

        
        &.invalid-time {
          border-color: #ef4444 !important;
          color: #f87171 !important;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.6) !important;
          background: rgba(239, 68, 68, 0.05) !important;
        }


      }

      .sep {
        color: rgba(255, 255, 255, 0.4);
        font-size: 1rem;
        text-align: center;
      }
    }
  }
`;

export const AccountsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(255, 255, 255, 0.01);
  border-radius: 12px;
  padding: 10px;
`;

export const MaintenanceBtn = styled.button`
  background: rgba(249, 115, 22, 0.1);
  border: 1px dashed #f97316;
  color: #fb923c;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  grid-column: 2 / span 3;
  box-sizing: border-box;
  margin: 0 auto;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  
  &:hover {
    background: rgba(249, 115, 22, 0.2);
    border-style: solid;
    color: #fff;
    box-shadow: 0 0 15px rgba(249, 115, 22, 0.2);
  }
`;

export const RemoveMaintenanceBtn = styled.button`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  color: #f87171;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: #ef4444;
    color: #fff;
    transform: scale(1.1);
  }
`;

const StyledSwitch = styled(SwitchPrimitive.Root)`
  all: unset;
  width: 46px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  position: relative;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  WebkitTapHighlightColor: rgba(0, 0, 0, 0);
  cursor: pointer;
  transition: all 0.2s;

  &[data-state='checked'] {
    background-color: #10b981;
    border-color: #10b981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.6);
  }

  &[data-disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const StyledThumb = styled(SwitchPrimitive.Thumb)`
  display: block;
  width: 18px;
  height: 18px;
  background-color: white;
  border-radius: 9999px;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
  transition: transform 100ms;
  transform: translateX(2px);
  will-change: transform;

  &[data-state='checked'] {
    transform: translateX(24px); /* 46px width - 18px thumb - 2px right padding - 2px border offset = 24px */
  }
`;

export const PremiumSwitch = ({ id, checked, onCheckedChange, disabled = false }: { id?: string, checked: boolean, onCheckedChange: (c: boolean) => void, disabled?: boolean }) => (
  <StyledSwitch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled}>
    <StyledThumb />
  </StyledSwitch>
);

export const SwitchGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
  flex: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    flex: 1;
  }
`;
