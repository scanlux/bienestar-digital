'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .5; transform: scale(1.1); }
`;

const LoaderContainer = styled.div`
  min-h-screen bg-[#0E0E0E] flex items-center justify-center;
`;

const LoaderSpinner = styled.div`
  border: 2px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
  animation: ${spin} 1s linear infinite;
`;

const PageWrapper = styled.div`
  min-h-screen bg-[#0E0E0E] text-white font-sans;
  
  &::selection {
    background: rgba(59, 130, 246, 0.3);
  }
`;

const Navbar = styled.nav`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(24px);
  position: sticky;
  top: 0;
  z-index: 50;
`;

const NavbarContainer = styled.div`
  max-width: 80rem;
  margin: 0 auto;
  padding: 0 1rem;
  
  @media (min-width: 640px) {
    padding: 0 1.5rem;
  }
  @media (min-width: 1024px) {
    padding: 0 2rem;
  }
`;

const NavbarContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4rem;
`;

const BrandLink = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const BrandIcon = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #0891b2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const BrandName = styled.span`
  font-size: 1.25rem;
  font-weight: 500;
  letter-spacing: -0.05em;
`;

const BrandMuted = styled.span`
  color: rgba(255, 255, 255, 0.5);
`;

const NavbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const WalletButton = styled(Link)`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.2);
  transition: background-color 0.2s, color 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }
`;

const LogoutButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const MainContent = styled.main`
  max-width: 32rem;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const DashboardContent = styled.div`
  animation: ${fadeInUp} 0.5s ease forwards;
`;

const ProfileRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const WelcomeTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 300;
  margin: 0 0 0.25rem 0;
`;

const WelcomeName = styled.span`
  font-weight: 500;
  background: linear-gradient(to right, #60a5fa, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const ProfileSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin: 0;
`;

const StatusDot = styled.div`
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background-color: #3b82f6;
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
`;

const StatsGrid = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  flex: 1;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const StatLabel = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  margin: 0 0 0.25rem 0;
`;

const StatValue = styled.p<{ $blue?: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: ${props => props.$blue ? '#60a5fa' : '#fff'};
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 500;
  margin: 0 0 1rem 0;
`;

const OrderCardOuter = styled.div`
  padding: 1px;
  border-radius: 1.5rem;
  background: linear-gradient(to bottom, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.05));
  position: relative;
  overflow: hidden;
`;

const OrderCardPattern = styled.div`
  position: absolute;
  inset: 0;
  background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
  opacity: 0.1;
  mix-blend-mode: overlay;
`;

const OrderCardInner = styled.div`
  background: #121212;
  border-radius: 22px;
  padding: 1.5rem;
  position: relative;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`;

const ActionTag = styled.span`
  padding: 0.25rem 0.75rem;
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 9999px;
  margin-bottom: 0.5rem;
  display: inline-block;
`;

const PlaceName = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
`;

const PlaceAddress = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin: 0;
`;

const PinIcon = styled.div`
  width: 3rem;
  height: 3rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
`;

const DashedLine = styled.div`
  border-left: 2px dashed rgba(255, 255, 255, 0.1);
  margin-left: 1.5rem;
  height: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  position: relative;
`;

const DashedPin = styled.div`
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 0.5rem;
  height: 0.5rem;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
`;

const CardBody = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

const DeliverLabel = styled.span`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  display: inline-block;
`;

const ClientName = styled.h3`
  font-size: 1.125rem;
  font-weight: 500;
  margin: 0 0 0.25rem 0;
`;

const ClientAddress = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin: 0;
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: #2563eb;
  color: #fff;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(37, 99, 235, 0.3);
  transition: background-color 0.2s;

  &:hover {
    background-color: #3b82f6;
  }
`;

export default function DeliveryDashboard() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <LoaderContainer>
        <LoaderSpinner />
      </LoaderContainer>
    );
  }

  return (
    <PageWrapper>
      <Navbar>
        <NavbarContainer>
          <NavbarContent>
            <BrandLink>
              <BrandIcon>D</BrandIcon>
              <BrandName>Express<BrandMuted>Delivery</BrandMuted></BrandName>
            </BrandLink>
            <NavbarActions>
              <WalletButton href="/delivery/wallet">Mi Billetera</WalletButton>
              <LogoutButton onClick={logout}>Salir</LogoutButton>
            </NavbarActions>
          </NavbarContent>
        </NavbarContainer>
      </Navbar>

      <MainContent>
        <DashboardContent>
          <ProfileRow>
            <div>
              <WelcomeTitle>Hola, <WelcomeName>{user.nombre}</WelcomeName></WelcomeTitle>
              <ProfileSubtitle>Estás en línea y recibiendo pedidos.</ProfileSubtitle>
            </div>
            <StatusDot />
          </ProfileRow>

          <StatsGrid>
            <StatCard>
              <StatLabel>Ganancias (Hoy)</StatLabel>
              <StatValue $blue>$45,000</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Entregas</StatLabel>
              <StatValue>8</StatValue>
            </StatCard>
          </StatsGrid>

          <SectionTitle>Pedido Asignado</SectionTitle>
          
          <OrderCardOuter>
            <OrderCardPattern />
            <OrderCardInner>
              <CardHeader>
                <div>
                  <ActionTag>RECOGER</ActionTag>
                  <PlaceName>Entre Cazuelas Market</PlaceName>
                  <PlaceAddress>Cll 45 # 12-30</PlaceAddress>
                </div>
                <PinIcon>📍</PinIcon>
              </CardHeader>
              
              <DashedLine>
                <DashedPin />
              </DashedLine>

              <CardBody>
                <div>
                  <DeliverLabel>ENTREGAR A</DeliverLabel>
                  <ClientName>María López</ClientName>
                  <ClientAddress>Cra 10 # 5-20, Apto 401</ClientAddress>
                </div>
              </CardBody>

              <ActionButton>
                Llegué al restaurante
              </ActionButton>
            </OrderCardInner>
          </OrderCardOuter>

        </DashboardContent>
      </MainContent>
    </PageWrapper>
  );
}
