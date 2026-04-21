import styled, { keyframes } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

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
  background: #121212;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: ${props => props.$maxWidth || '650px'};
  border-radius: 16px;
  padding: 2.5rem;
  position: relative;
  height: auto;
  margin: 0 auto;
  animation: ${fadeIn} 0.3s ease;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
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
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
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

export const GeoButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.5);
  }
`;

export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #10b981;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;
