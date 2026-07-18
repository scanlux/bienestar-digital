'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { API_URL } from '@/constants';
import {
  PageWrapper, BackgroundGlow, LoginBox, LogoArea, Cube, LogoText,
  Header, Title, Subtitle, Form, InputWrapper, Label, Input,
  SubmitButton, Spinner, FooterText
} from '@/components/Common/LoginStyles';
import styled from 'styled-components';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMessage('Token de recuperación no válido o ausente en la URL.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Token de recuperación ausente.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword: password
      });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginBox>
      <LogoArea onClick={() => router.push('/login')}>
        <Cube>C</Cube>
        <LogoText>
          Commerce<span>Core</span>
        </LogoText>
      </LogoArea>

      <Header>
        <Title>Nueva Contraseña</Title>
        <Subtitle>Ingresa tu nueva clave de acceso para tu cuenta.</Subtitle>
      </Header>

      {success ? (
        <SuccessContainer>
          <div className="success-icon">✓</div>
          <p className="success-text">¡Contraseña restablecida con éxito!</p>
          <SubmitButton type="button" onClick={() => router.push('/login')} style={{ width: '100%' }}>
            Ir al Portal de Acceso
          </SubmitButton>
        </SuccessContainer>
      ) : (
        <Form onSubmit={handleSubmit} className={errorMessage ? 'was-validated' : ''}>
          {errorMessage && <ErrorMsg>{errorMessage}</ErrorMsg>}

          <InputWrapper>
            <Label htmlFor="new-password">Nueva Contraseña</Label>
            <Input
              type="password"
              id="new-password"
              placeholder="Ingresa al menos 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || !token}
            />
          </InputWrapper>

          <InputWrapper>
            <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
            <Input
              type="password"
              id="confirm-password"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading || !token}
            />
          </InputWrapper>

          <SubmitButton type="submit" disabled={loading || !token}>
            {loading ? <Spinner /> : 'Restablecer Contraseña'}
          </SubmitButton>
        </Form>
      )}

      <FooterText>© {new Date().getFullYear()} Bienestar Digital</FooterText>
    </LoginBox>
  );
}

const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
  padding: 10px 0;

  .success-icon {
    width: 60px;
    height: 60px;
    background: rgba(16, 185, 129, 0.15);
    border: 2px solid var(--emerald);
    color: var(--emerald);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 800;
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
  }

  .success-text {
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }
`;

const ErrorMsg = styled.div`
  color: #ff5f5f;
  font-size: 0.85rem;
  background: rgba(255, 95, 95, 0.1);
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 95, 95, 0.2);
  text-align: center;
`;

export default function ResetPasswordPage() {
  return (
    <PageWrapper>
      <BackgroundGlow />
      <Suspense fallback={
        <LoginBox style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Spinner style={{ width: '40px', height: '40px', borderTopColor: 'var(--emerald)' }} />
        </LoginBox>
      }>
        <ResetPasswordForm />
      </Suspense>
    </PageWrapper>
  );
}
