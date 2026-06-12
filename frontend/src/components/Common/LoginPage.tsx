'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FloatingErrorToast } from '@/components/Common/Toasts';
import {
  PageWrapper, BackgroundGlow, LoginBox, LogoArea, Cube, LogoText,
  Header, Title, Subtitle, Form, InputWrapper, Label, Input,
  SubmitButton, Spinner, FooterText
} from './LoginStyles';

interface LoginPageProps {
  type: 'business' | 'operator' | 'system';
}

export default function LoginPage({ type }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const { login, user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

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
    }
  }, []);

  useEffect(() => {
    if (user) {
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
              if (user.storeIds && user.storeIds.length > 0) {
                router.push(`/commerce/stores/${user.storeIds[0]}`);
              } else {
                router.push('/commerce/dashboard');
              }
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
      await login(email, password, type);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión');
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  const getPageTexts = () => {
    switch (type) {
      case 'system':
        return {
          title: 'Portal de Soporte y Sistema',
          subtitle: 'Inicia sesión con tu cuenta directiva o de soporte',
        };
      case 'operator':
        return {
          title: 'Portal de Operadores',
          subtitle: 'Inicia sesión para gestionar los pedidos de tu sede',
        };
      case 'business':
      default:
        return {
          title: 'Portal de Negocios',
          subtitle: 'Inicia sesión para gestionar tu comercio, sede o delivery',
        };
    }
  };

  const texts = getPageTexts();

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
