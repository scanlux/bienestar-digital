'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FloatingErrorToast } from '@/components/Common/Toasts';

export default function OperatorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));
  }, []);

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitted(true);
    setErrorMessage('');
    setShowErrorToast(false);

    if (!e.currentTarget.checkValidity()) {
      setErrorMessage('Por favor completa todos los campos.');
      setShowErrorToast(true);
      return;
    }

    setLoading(true);

    try {
      await login(email, password, 'operator');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesion');
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <BackgroundGlow />
      <LoginBox>
        <LogoArea onClick={() => router.push('/')}>
          <Cube>O</Cube>
          <LogoText>Operadores<span>Core</span></LogoText>
        </LogoArea>

        <Header>
          <Title>Portal de Operadores</Title>
          <Subtitle>Inicia sesión para operar tu sede física</Subtitle>
        </Header>

        <Form 
          onSubmit={handleSubmit} 
          noValidate 
          className={isSubmitted ? 'was-validated' : ''}
        >
          <InputWrapper>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="operador@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </InputWrapper>

          <InputWrapper>
            <Label>Contrasena</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </InputWrapper>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Iniciar Sesion'}
          </SubmitButton>
        </Form>

        <FooterText>
          Desarrollado para TrendyTech Marketplace
        </FooterText>
      </LoginBox>

      {showErrorToast && modalTarget && createPortal(
        <FloatingErrorToast 
          message={errorMessage} 
          onClose={() => setShowErrorToast(false)} 
        />,
        modalTarget
      )}
    </PageWrapper>
  );
}

// ------------- ANIMACIONES NATIVAS CSS -------------
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.05); }
  100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ------------- STYLED COMPONENTS -------------
const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--Background);
  position: relative;
  overflow: hidden;
  font-family: 'SF Pro Display', sans-serif;
`;

const BackgroundGlow = styled.div`
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

const LoginBox = styled.div`
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

const LogoArea = styled.div`
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

const Cube = styled.div`
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

const LogoText = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;

  span {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 400;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 0.25rem;
`;

const Input = styled.input`
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

const SubmitButton = styled.button`
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

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #000;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const FooterText = styled.p`
  margin-top: 2.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.2);
`;
