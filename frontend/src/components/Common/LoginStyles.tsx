import styled, { keyframes } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const pulseGlow = keyframes`
  0% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.05); }
  100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--Background);
  position: relative;
  overflow: hidden;
  font-family: 'SF Pro Display', sans-serif;
`;

export const BackgroundGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(72, 214, 76, 0.08) 0%, transparent 60%);
  transform: translate(-50%, -50%);
  animation: ${pulseGlow} 6s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
`;

export const LoginBox = styled.div`
  width: 100%;
  max-width: 420px;
  background: rgba(15, 15, 15, 0.6);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  padding: 3rem;
  border-radius: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
  z-index: 1;
  animation: ${fadeIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

export const LogoArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 2.5rem;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

export const Cube = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--emerald) 0%, var(--green) 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #000;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(72, 214, 76, 0.3);
`;

export const LogoText = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;

  span {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 400;
  }
`;

export const Header = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

export const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
`;

export const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 0.25rem;
`;

export const Input = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  color: #fff;
  font-size: 0.95rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--emerald);
    background: rgba(72, 214, 76, 0.02);
    box-shadow: 0 0 0 4px rgba(72, 214, 76, 0.05);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.15);
  }

  .was-validated &:invalid {
    border-color: #ff5f5f !important;
    background: rgba(255, 95, 95, 0.05) !important;
    box-shadow: 0 0 0 4px rgba(255, 95, 95, 0.1) !important;
  }
`;

export const ErrorMessage = styled.div`
  color: #ff5f5f;
  font-size: 0.85rem;
  background: rgba(255, 95, 95, 0.1);
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 95, 95, 0.2);
  text-align: center;
  animation: ${fadeIn} 0.3s ease;
`;

export const SubmitButton = styled.button`
  background: var(--emerald);
  color: #000;
  padding: 1rem;
  border-radius: 1rem;
  border: none;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #000;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export const FooterText = styled.p`
  margin-top: 2.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.2);
`;
