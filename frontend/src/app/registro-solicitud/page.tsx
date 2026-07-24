'use client';

import React, { useState, useEffect, Suspense } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '@/context/AuthContext';
import { useRegistrationForm } from './components/useRegistrationForm';
import RegistrationStepOne from './components/RegistrationStepOne';
import RegistrationStepTwo from './components/RegistrationStepTwo';
import RegistrationStepThree from './components/RegistrationStepThree';

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

const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0, 255, 128, 0.4); }
  70% { transform: scale(1.1); opacity: 0.9; box-shadow: 0 0 0 20px rgba(0, 255, 128, 0); }
  100% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0, 255, 128, 0); }
`;

const shimmer = keyframes`
  0% { left: -40%; }
  100% { left: 100%; }
`;

// ------------- STYLED COMPONENTS -------------
const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0b0f19;
  background-image: 
    radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.05) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.03) 0px, transparent 50%);
  position: relative;
  overflow: hidden;
  padding: 3rem 1rem;
`;

const BackgroundGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, rgba(59, 130, 246, 0.02) 50%, transparent 100%);
  transform: translate(-50%, -50%);
  z-index: 1;
  pointer-events: none;
  animation: ${pulseGlow} 10s infinite ease-in-out;
`;

const Container = styled.div`
  width: 100%;
  max-width: 800px;
  z-index: 2;
  animation: ${fadeIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;

const Card = styled.div`
  background: rgba(17, 24, 39, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 2rem;
  padding: 3rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);

  @media (max-width: 640px) {
    padding: 2rem 1.5rem;
    border-radius: 1.5rem;
  }
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
  text-align: center;
`;

const LogoWrapper = styled.div`
  position: relative;
  margin-bottom: 1.25rem;
`;

const LogoGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70px;
  height: 70px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  filter: blur(5px);
  z-index: 1;
`;

const Hexagon = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
`;

const LogoText = styled.span`
  color: #000;
  font-weight: 900;
  font-size: 1.4rem;
  font-family: 'Outfit', sans-serif;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0;
  background: linear-gradient(to right, #fff, rgba(255, 255, 255, 0.7));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 0.5rem;
  margin-bottom: 0;
  max-width: 420px;
  line-height: 1.5;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .col-span-2 {
    grid-column: span 2;

    @media (max-width: 640px) {
      grid-column: span 1;
    }
  }
`;

// Navigation elements
const StepperHeader = styled.div`
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 2.5rem;
  padding: 0 1rem;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2px;
    background: rgba(255, 255, 255, 0.05);
    z-index: 1;
    transform: translateY(-50%);
  }
`;

const StepDot = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: ${props => props.$completed ? 'var(--emerald)' : props.$active ? '#1e293b' : '#0f172a'};
  border: 2px solid ${props => props.$completed || props.$active ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$completed ? '#000' : '#fff'};
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$active ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none'};
`;

const StepLabel = styled.span`
  position: absolute;
  top: 3rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 0.85rem 1.75rem;
  border-radius: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const NextButton = styled.button`
  background: var(--emerald);
  color: #000;
  padding: 0.85rem 2rem;
  border-radius: 1rem;
  border: none;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);

  &:hover {
    background: #059669;
    transform: translateY(-1px);
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
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
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

const SpinnerLarge = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(72, 214, 76, 0.1);
  border-top-color: var(--emerald);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  box-shadow: 0 0 15px rgba(72, 214, 76, 0.2);
`;

// ------------- STYLED COMPONENTS FOR MAINTENANCE SHIELD -------------
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

const CountdownTimer = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #00ff80;
  font-family: monospace;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0, 255, 128, 0.3);
  margin-top: 0.5rem;
`;

function RegistroSolicitudContent() {
  const form = useRegistrationForm();
  const { maintenanceMode, isOffline } = useAuth();
  const [timeLeft, setTimeLeft] = useState(120);

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

  if (form.validation.success) {
    return (
      <PageWrapper>
        <BackgroundGlow />
        <Container>
          <Card>
            <SuccessWrapper>
              <SuccessIcon>✓</SuccessIcon>
              <SuccessTitle>¡Solicitud Registrada!</SuccessTitle>
              <SuccessText>
                {form.formState.isCorrectionsMode 
                  ? 'Tus correcciones han sido registradas y enviadas nuevamente al equipo auditor para su aprobación.'
                  : 'Tu solicitud de afiliación ha sido registrada en el sistema. Nuestro equipo de soporte técnico validará los documentos cargados directamente en el servidor de medios seguro de Bogotá. Una vez aprobada, recibirás las credenciales de acceso a tu correo corporativo.'}
              </SuccessText>
              <HomeButton onClick={() => form.validation.router.push('/')}>Volver al Inicio</HomeButton>
            </SuccessWrapper>
          </Card>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <BackgroundGlow />
      <Container>
        <Card>
          <TitleContainer>
            <LogoWrapper>
              <LogoGlow />
              <Hexagon>
                <LogoText>N</LogoText>
              </Hexagon>
            </LogoWrapper>
            <Title>Unirse a la Red de Comercios</Title>
            <Subtitle>
              Establezca su negocio y comience a despachar domicilios en minutos. Complete el formulario digital en 3 sencillos pasos.
            </Subtitle>
          </TitleContainer>

          <StepperHeader>
            <StepDot $active={form.step === 1} $completed={form.step > 1}>
              1
              <StepLabel>Establecimiento</StepLabel>
            </StepDot>
            <StepDot $active={form.step === 2} $completed={form.step > 2}>
              2
              <StepLabel>Administrador</StepLabel>
            </StepDot>
            <StepDot $active={form.step === 3} $completed={form.step > 3}>
              3
              <StepLabel>Confirmación</StepLabel>
            </StepDot>
          </StepperHeader>

          <Form onSubmit={form.handleSubmit}>
            {form.step === 1 && (
              <RegistrationStepOne form={form} validation={form.validation} />
            )}
            {form.step === 2 && (
              <RegistrationStepTwo form={form} validation={form.validation} />
            )}
            {form.step === 3 && (
              <RegistrationStepThree form={form} />
            )}

            {form.validation.errorMsg && (
              <ErrorMessage>{form.validation.errorMsg}</ErrorMessage>
            )}

            <ButtonGroup>
              {form.step > 1 ? (
                <BackButton type="button" onClick={form.prevStep}>
                  Atrás
                </BackButton>
              ) : <div />}

              {form.step < 3 ? (
                <NextButton type="button" onClick={form.nextStep}>
                  Siguiente
                </NextButton>
              ) : (
                <SubmitButton type="submit" disabled={form.validation.loading}>
                  {form.validation.loading ? <Spinner /> : form.formState.isCorrectionsMode ? 'Enviar Correcciones' : 'Enviar Solicitud de Registro'}
                </SubmitButton>
              )}
            </ButtonGroup>
          </Form>
        </Card>
      </Container>

      {(maintenanceMode || isOffline) && (
        <MaintenanceOverlay>
          <MaintenanceCard>
            <GlowLogo>
              <PulseCircle />
              <CubeIcon>N</CubeIcon>
            </GlowLogo>
            <MaintenanceTitle>
              {isOffline ? 'CANAL DE DATOS OFFLINE' : 'OPTIMIZACIÓN DEL SISTEMA'}
            </MaintenanceTitle>
            <MaintenanceText>
              {isOffline 
                ? 'El canal de transacciones está experimentando una interrupción temporal. Intentando reconectar...' 
                : 'Estamos aplicando mejoras de seguridad y estabilidad en los servidores financieros. Los servicios se restablecerán en breves instantes.'}
            </MaintenanceText>
            <ProgressBarWrapper>
              <ProgressBarAnimated />
            </ProgressBarWrapper>
            <ProgressText>
              {isOffline 
                ? 'Intentando reconectar con el nodo de transacciones...' 
                : 'Resguardando integridad y consistencia de transacciones...'}
            </ProgressText>
            <CountdownTimer>{formatTime(timeLeft)}</CountdownTimer>
          </MaintenanceCard>
        </MaintenanceOverlay>
      )}
    </PageWrapper>
  );
}

export default function RegistroSolicitudPage() {
  return (
    <Suspense fallback={
      <PageWrapper>
        <BackgroundGlow />
        <Container>
          <Card>
            <SuccessWrapper>
              <SpinnerLarge />
              <SuccessTitle style={{ marginTop: '1.5rem' }}>Cargando Formulario...</SuccessTitle>
            </SuccessWrapper>
          </Card>
        </Container>
      </PageWrapper>
    }>
      <RegistroSolicitudContent />
    </Suspense>
  );
}
