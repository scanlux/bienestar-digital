'use client';

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/constants';

export default function RegistroSolicitudPage() {
  const router = useRouter();
  const [tipoSolicitud, setTipoSolicitud] = useState<'commerce' | 'delivery_company'>('commerce');
  const [nit, setNit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [nombresContacto, setNombresContacto] = useState('');
  const [apellidosContacto, setApellidosContacto] = useState('');
  const [celularContacto, setCelularContacto] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      await axios.post(`${API_URL}/api/public/requests`, {
        tipo_solicitud: tipoSolicitud,
        nit,
        razon_social: razonSocial,
        email_contacto: emailContacto,
        nombres_contacto: nombresContacto,
        apellidos_contacto: apellidosContacto,
        celular_contacto: celularContacto
      });

      setSuccess(true);
      // Reset form
      setNit('');
      setRazonSocial('');
      setEmailContacto('');
      setNombresContacto('');
      setApellidosContacto('');
      setCelularContacto('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <BackgroundGlow />
      <Container>
        <LogoArea onClick={() => router.push('/')}>
          <Cube>N</Cube>
          <LogoText>TrendyTech<span>Partners</span></LogoText>
        </LogoArea>

        <Card>
          {!success ? (
            <>
              <Header>
                <Title>Únete al Ecosistema</Title>
                <Subtitle>Envía tu solicitud para registrar tu comercio o empresa de entrega en el marketplace</Subtitle>
              </Header>

              <Form onSubmit={handleSubmit}>
                <FormGrid>
                  <InputWrapper className="col-span-2">
                    <Label htmlFor="tipoSolicitud">Tipo de Negocio</Label>
                    <Select
                      id="tipoSolicitud"
                      value={tipoSolicitud}
                      onChange={(e) => setTipoSolicitud(e.target.value as 'commerce' | 'delivery_company')}
                    >
                      <option value="commerce">Comercio / Restaurante / Tienda</option>
                      <option value="delivery_company">Empresa de Mensajería / Domicilios</option>
                    </Select>
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="razonSocial">Razón Social</Label>
                    <Input
                      type="text"
                      id="razonSocial"
                      placeholder="Ej. Alimentos del Norte S.A.S."
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="nit">NIT (con dígito de verificación)</Label>
                    <Input
                      type="text"
                      id="nit"
                      placeholder="Ej. 901234567-1"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="nombres">Nombres del Contacto</Label>
                    <Input
                      type="text"
                      id="nombres"
                      placeholder="Ej. Carlos"
                      value={nombresContacto}
                      onChange={(e) => setNombresContacto(e.target.value)}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="apellidos">Apellidos del Contacto</Label>
                    <Input
                      type="text"
                      id="apellidos"
                      placeholder="Ej. Rodríguez"
                      value={apellidosContacto}
                      onChange={(e) => setApellidosContacto(e.target.value)}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="email">Correo Electrónico Corporativo</Label>
                    <Input
                      type="email"
                      id="email"
                      placeholder="contacto@empresa.com"
                      value={emailContacto}
                      onChange={(e) => setEmailContacto(e.target.value)}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="celular">Celular de Contacto</Label>
                    <Input
                      type="text"
                      id="celular"
                      placeholder="Ej. 3001234567"
                      value={celularContacto}
                      onChange={(e) => setCelularContacto(e.target.value)}
                      required
                    />
                  </InputWrapper>
                </FormGrid>

                {errorMsg && <ErrorMessage>{errorMsg}</ErrorMessage>}

                <SubmitButton type="submit" disabled={loading}>
                  {loading ? <Spinner /> : 'Enviar Solicitud de Registro'}
                </SubmitButton>
              </Form>
            </>
          ) : (
            <SuccessWrapper>
              <SuccessIcon>✓</SuccessIcon>
              <SuccessTitle>Solicitud Recibida</SuccessTitle>
              <SuccessText>
                Tu solicitud de afiliación ha sido registrada en el sistema. Nuestro equipo de soporte técnico validará los datos provistos y se pondrá en contacto contigo en breve a tu correo electrónico.
              </SuccessText>
              <HomeButton onClick={() => router.push('/')}>Volver al Inicio</HomeButton>
            </SuccessWrapper>
          )}
        </Card>
      </Container>
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
  padding: 3rem 1rem;
`;

const BackgroundGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, rgba(72, 214, 76, 0.06) 0%, transparent 60%);
  transform: translate(-50%, -50%);
  animation: ${pulseGlow} 8s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
`;

const Container = styled.div`
  width: 100%;
  max-width: 650px;
  z-index: 1;
  animation: ${fadeIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
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

const Card = styled.div`
  background: rgba(15, 15, 15, 0.6);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  padding: 3rem;
  border-radius: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
`;

const Header = styled.div`
  margin-bottom: 2.5rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 1.85rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  line-height: 1.5;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 2;
    @media (max-width: 580px) {
      grid-column: span 1;
    }
  }
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
  padding: 0.95rem 1.15rem;
  border-radius: 1rem;
  color: #fff;
  font-size: 0.9rem;
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
`;

const Select = styled.select`
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.95rem 1.15rem;
  border-radius: 1rem;
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  appearance: none;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--emerald);
    background: rgba(72, 214, 76, 0.02);
    box-shadow: 0 0 0 4px rgba(72, 214, 76, 0.05);
  }

  option {
    background: #121212;
    color: #fff;
  }
`;

const ErrorMessage = styled.div`
  color: #ff5f5f;
  font-size: 0.85rem;
  background: rgba(255, 95, 95, 0.1);
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 95, 95, 0.2);
  text-align: center;
  animation: ${fadeIn} 0.3s ease;
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
  margin-top: 1rem;

  &:hover:not(:disabled) {
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

const SuccessWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;
`;

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(72, 214, 76, 0.1);
  color: var(--emerald);
  border: 1px solid rgba(72, 214, 76, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  box-shadow: 0 0 20px rgba(72, 214, 76, 0.2);
`;

const SuccessTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
`;

const SuccessText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 450px;
`;

const HomeButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.95rem 2rem;
  border-radius: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;
