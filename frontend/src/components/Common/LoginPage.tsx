'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FloatingErrorToast } from '@/components/Common/Toasts';
import {
  PageWrapper, BackgroundGlow, LoginBox, LogoArea, Cube, LogoText,
  Header, Title, Subtitle, Form, InputWrapper, Label, Input,
  SubmitButton, Spinner, FooterText
} from './LoginStyles';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const { login, user, maintenanceMode } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const [isBypassed, setIsBypassed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutos en segundos

  useEffect(() => {
    if (!maintenanceMode) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 120));
    }, 1000);
    return () => clearInterval(interval);
  }, [maintenanceMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    setModalTarget(document.getElementById('modal-portal-root'));

    // Capturar motivo de logout
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    if (reason === 'session_expired') {
      setErrorMessage('Tu sesión ha expirado o fue invalidada. Por favor inicia sesión de nuevo.');
      setShowErrorToast(true);
    } else if (reason === 'security_update') {
      setErrorMessage('Se han actualizado los permisos de seguridad de tu cuenta. Por favor inicia sesión de nuevo.');
      setShowErrorToast(true);
    } else if (reason === 'logged_out') {
      setErrorMessage('Se cerró la sesión en otra pestaña del navegador.');
      setShowErrorToast(true);
    } else if (reason === 'maintenance_active') {
      setErrorMessage('Sesión cerrada por seguridad.');
      setShowErrorToast(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (maintenanceMode && user.actorType !== 'system_user') {
        return;
      }
      setIsRedirecting(true);
      const timer = setTimeout(() => {
        if (user.actorType === 'system_user') {
          router.push('/admin/dashboard');
        } else if (user.actorType === 'operator') {
          router.push('/commerce/store-admins');
        } else {
          if (user.rol === 'admin' || user.roles?.includes('commerce_manager') || user.roles?.includes('store_admin') || user.roles?.includes('delivery_company_admin')) {
            if (user.adminType === 'commerce' || user.roles?.includes('commerce_manager')) {
              router.push('/commerce/dashboard');
            } else if (user.adminType === 'store' || user.roles?.includes('store_admin')) {
              router.push('/commerce/dashboard');
            } else if (user.adminType === 'delivery_company' || user.roles?.includes('delivery_company_admin')) {
               router.push('/delivery-company/dashboard');
            } else {
              router.push('/commerce/dashboard');
            }
          } else if (user.rol === 'delivery' || user.roles?.includes('driver')) {
            router.push('/delivery/orders');
          } else if (user.rol === 'customer' || user.roles?.includes('customer')) {
            router.push('/app/home');
          } else {
            router.push('/');
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  useEffect(() => {
    if (showErrorToast) {
      const timer = setTimeout(() => {
        setShowErrorToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showErrorToast]);

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
      await login(email, password);
    } catch (err: any) {
      if (err.message === 'mantenimiento_silent') {
        // Silenciar error en UI (se desplegará el overlay de optimización de sistema en su lugar)
        setIsBypassed(false);
        return;
      }
      setErrorMessage(err.message || 'Error al iniciar sesión');
      setShowErrorToast(true);
      setIsBypassed(false);
    } finally {
      setLoading(false);
    }
  };

  const texts = {
    title: 'Portal de Acceso',
    subtitle: 'Inicia sesión para gestionar tu cuenta.',
  };

  if (isRedirecting) {
    return (
      <PageWrapper>
        <BackgroundGlow />
        <LoginBox style={{ textAlign: 'center' }}>
          <LogoArea>
            <Cube>N</Cube>
            <LogoText>Negocios<span>Core</span></LogoText>
          </LogoArea>
          <Spinner style={{ width: '40px', height: '40px', margin: '2rem auto' }} />
          <Title style={{ fontSize: '1.25rem' }}>Cargando datos</Title>
          <Subtitle>Redirigiéndote a tu panel de control principal...</Subtitle>
        </LoginBox>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <BackgroundGlow />
      <LoginBox>
        <LogoArea onClick={() => router.push('/')}>
          <Cube>N</Cube>
          <LogoText>Negocios<span>Core</span></LogoText>
        </LogoArea>

        <Header>
          <Title>{texts.title}</Title>
          <Subtitle>{texts.subtitle}</Subtitle>
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
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </InputWrapper>

          <InputWrapper>
            <Label>Contraseña</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </InputWrapper>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Iniciar Sesión'}
          </SubmitButton>
        </Form>

        <FooterText style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
          ¿Quieres afiliar tu negocio o empresa de repartidores?{' '}
          <Link href="/registro-solicitud" style={{ color: '#10b981', textDecoration: 'underline', fontWeight: 600 }}>
            Envía tu solicitud aquí
          </Link>
        </FooterText>

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

      {maintenanceMode && !isBypassed && (
        <MaintenanceOverlay>
          <MaintenanceCard>
            <CloseButton onClick={() => setIsBypassed(true)} aria-label="Cerrar">&times;</CloseButton>
            <GlowLogo>
              <PulseCircle />
              <CubeIcon>N</CubeIcon>
            </GlowLogo>
            <MaintenanceTitle>OPTIMIZACIÓN DEL SISTEMA</MaintenanceTitle>
            <MaintenanceText>
              Estamos aplicando mejoras de seguridad y estabilidad en los servidores financieros. Los servicios se restablecerán en breves instantes.
            </MaintenanceText>
            <ProgressBarWrapper>
              <ProgressBarAnimated />
            </ProgressBarWrapper>
            <ProgressText>Resguardando integridad y consistencia de transacciones...</ProgressText>
            <CountdownTimer>{formatTime(timeLeft)}</CountdownTimer>
          </MaintenanceCard>
        </MaintenanceOverlay>
      )}
    </PageWrapper>
  );
}

const MaintenanceOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MaintenanceCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(0, 255, 128, 0.15);
  border-radius: 16px;
  padding: 3rem 2.5rem;
  max-width: 480px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 128, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  position: relative;
`;

const GlowLogo = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
`;

const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0, 255, 128, 0.4); }
  70% { transform: scale(1.1); opacity: 0.9; box-shadow: 0 0 0 20px rgba(0, 255, 128, 0); }
  100% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0, 255, 128, 0); }
`;

const PulseCircle = styled.div`
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0, 255, 128, 0.1);
  border: 2px solid #00ff80;
  animation: ${pulse} 2s infinite ease-in-out;
  z-index: 1;
`;

const CubeIcon = styled.div`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #00ff80 0%, #00aa50 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: 800;
  font-size: 1.5rem;
  z-index: 2;
  box-shadow: 0 0 15px rgba(0, 255, 128, 0.4);
`;

const MaintenanceTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1.5px;
  margin: 0;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
`;

const MaintenanceText = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
`;

const ProgressBarWrapper = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin-top: 0.5rem;
`;

const shimmer = keyframes`
  0% { left: -40%; }
  100% { left: 100%; }
`;

const ProgressBarAnimated = styled.div`
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, #00ff80, transparent);
  position: absolute;
  animation: ${shimmer} 1.8s infinite linear;
`;

const ProgressText = styled.span`
  font-size: 0.8rem;
  color: rgba(0, 255, 128, 0.7);
  letter-spacing: 0.5px;
  font-weight: 500;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 1.8rem;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;

  &:hover {
    color: #00ff80;
    transform: scale(1.1);
  }
`;

const CountdownTimer = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #00ff80;
  font-family: monospace;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0, 255, 128, 0.3);
  margin-top: 0.5rem;
`;
