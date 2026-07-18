'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { WalletPanel } from '@/components/Common/WalletPanel';
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

const BrandLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
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

const OrdersLink = styled(Link)`
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: #fff;
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

const WalletContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: ${fadeInUp} 0.5s ease forwards;
`;

const WalletHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
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

const WalletSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin: 0;
`;

const PanelCard = styled.div`
  background: #121212;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 1.5rem;
`;

export default function DeliveryWalletPage() {
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
            <BrandLink href="/delivery/orders">
              <BrandIcon>D</BrandIcon>
              <BrandName>Express<BrandMuted>Delivery</BrandMuted></BrandName>
            </BrandLink>
            <NavbarActions>
              <OrdersLink href="/delivery/orders">Pedidos</OrdersLink>
              <LogoutButton onClick={logout}>Salir</LogoutButton>
            </NavbarActions>
          </NavbarContent>
        </NavbarContainer>
      </Navbar>

      <MainContent>
        <WalletContent>
          <WalletHeader>
            <div>
              <WelcomeTitle>Billetera de <WelcomeName>{user.nombre}</WelcomeName></WelcomeTitle>
              <WalletSubtitle>Gestiona tus ganancias y saldos DOMIs.</WalletSubtitle>
            </div>
          </WalletHeader>

          <PanelCard>
            <WalletPanel ownerType="user" ownerId={user.id} />
          </PanelCard>
        </WalletContent>
      </MainContent>
    </PageWrapper>
  );
}
