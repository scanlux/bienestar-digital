'use client';

import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAlert } from '@/context/AlertContext';
import { API_URL } from '@/constants';
import { getAuthHeaders } from '@/utils/auth';
import { Spinner } from '@/components/Common/UIElements';
import { CurrencyFormatter } from '@/components/Common/CurrencyFormatter';
import { ModalOverlay, ModalContent, ModalHeader, ModalTitle, CloseButton } from '@/components/Common/ModalStyles';
import { createPortal } from 'react-dom';
import { CapacityProgressBar } from '@/components/Common/CapacityProgressBar';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
  50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
  100% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
`;

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  padding: 1.5rem;
  color: #fff;
  animation: ${fadeIn} 0.5s ease forwards;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  &::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 18px;
    background: var(--emerald, #10b981);
    border-radius: 2px;
  }
`;

// ==========================================
// ESTADOS Y BUFFS (GAMING PANEL)
// ==========================================
const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const BuffsContainer = styled.div`
  background: rgba(20, 25, 22, 0.7);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 16px;
  padding: 1.75rem;
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const BuffRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--emerald, #10b981);
  }
`;



// ==========================================
// LIMITS PANEL (RESOURCE COUNTERS)
// ==========================================
const LimitsContainer = styled.div`
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.75rem;
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ResourceItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ResourceLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 700;
`;

const ResourceLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
`;

const ResourceCount = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
`;

const ResourceBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
`;

const ResourceFill = styled.div<{ $percent: number; $isExceeded?: boolean; $isUnlimited?: boolean }>`
  width: ${p => p.$percent}%;
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${p => {
    if (p.$isUnlimited) {
      return 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)';
    }
    if (p.$isExceeded) {
      return 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)';
    }
    return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
  }};
`;

// ==========================================
// TIENDA DE MEJORAS (POWER-UP CARDS)
// ==========================================
const StoreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const goldGlow = keyframes`
  0% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.4); }
  50% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.7); border-color: rgba(245, 158, 11, 1); }
  100% { box-shadow: 0 0 10px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.4); }
`;

const UpgradeCard = styled.div<{ $highlighted?: boolean }>`
  background: rgba(45, 60, 45, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);

  &:hover {
    transform: translateY(-5px);
    border-color: var(--emerald, #10b981);
    background: rgba(45, 60, 45, 0.35);
    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.15);
  }

  ${props => props.$highlighted && css`
    border-color: #f59e0b;
    background: rgba(80, 60, 20, 0.25);
    animation: ${goldGlow} 2s infinite ease-in-out;
  `}
`;

const UpgradeIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--emerald, #10b981);
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;

  ${UpgradeCard}:hover & {
    background: rgba(16, 185, 129, 0.2);
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
  }
`;

const UpgradeTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
`;

const UpgradeDescription = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.5;
  flex-grow: 1;
`;

const PriceTag = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--emerald, #10b981);
  font-family: monospace;
  margin-top: 1rem;
`;

const BuyButton = styled.button`
  background: linear-gradient(135deg, var(--emerald, #10b981) 0%, #059669 100%);
  border: none;
  border-radius: 8px;
  padding: 0.75rem 2rem;
  color: #000;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;

  &:hover {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const renderIcon = (iconName: string) => {
  switch (iconName) {
    case 'building':
    case 'adicionar_sede':
      return (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'video':
    case 'estatus_influencer':
      return (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case 'store':
    case 'estado_empresarial':
      return (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
    default:
      return (
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.18 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.773-.57-.375-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.519-4.674z" />
        </svg>
      );
  }
};

export default function UpgradesMarketPage() {
  const { user } = useAuth();
  const toast = useToast();
  const alert = useAlert();

  const [activeData, setActiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [highlightedUpgrade, setHighlightedUpgrade] = useState<string | null>(null);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [insufficientBalanceErrorMsg, setInsufficientBalanceErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchActiveData();

    // Comprobar parámetros de consulta para resaltar tarjeta recomendada
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get('highlight');
    if (highlight) {
      setHighlightedUpgrade(highlight);
      setTimeout(() => {
        const el = document.getElementById(`upgrade-card-${highlight}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, []);

  const fetchActiveData = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/manage/upgrades/active`, { headers });
      setActiveData(res.data);
    } catch (err) {
      console.error('Error fetching active upgrades:', err);
      toast.error('Error al cargar la información del mercado.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (upgradeType: string, label: string, price: number) => {
    const permissions = user?.permissions || [];
    if (!permissions.includes('purchase_upgrades')) {
      toast.error('No tienes permisos para adquirir mejoras.');
      return;
    }

    const catalogItem = activeData?.catalog?.find((c: any) => c.upgrade_key === upgradeType);
    const scopeMsg = catalogItem?.benefit_scope === 'global'
      ? 'Esta mejora beneficiará a todo el comercio (Alcance Global).'
      : 'Esta mejora beneficiará únicamente a esta sede (Alcance Individual).';

    alert.showConfirm({
      title: '¿Confirmar Adquisición de Buff?',
      message: `¿Estás seguro de que deseas activar '${label}' por un costo de ${price} DOMIs? ${scopeMsg} El valor será debitado de tu billetera corporativa.`,
      onConfirm: async () => {
        setPurchasing(upgradeType);
        try {
          const headers = getAuthHeaders();
          const res = await axios.post(
            `${API_URL}/api/manage/upgrades/purchase`,
            { upgrade_type: upgradeType },
            { headers }
          );
          toast.success(res.data.message || `¡Mejora '${label}' activada correctamente!`);
          fetchActiveData();
        } catch (err: any) {
          console.error('Error purchasing upgrade:', err);
          const errMsg = err.response?.data?.error || 'No se pudo completar la compra.';
          if (errMsg.includes('Saldo insuficiente')) {
            setInsufficientBalanceErrorMsg(errMsg);
            setShowInsufficientBalanceModal(true);
          } else {
            toast.error(errMsg);
          }
        } finally {
          setPurchasing(null);
        }
      }
    });
  };

  const getRemainingDays = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const diff = expiry.getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(days));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10rem' }}>
        <Spinner />
      </div>
    );
  }

  const limits = activeData?.limits || {
    stores: { used: 0, max: 1 },
    categories: { used: 0, max: 3 },
    products: { used: 0, max: 5 },
    reels: { used: 0, max: 0 }
  };

  const activeBuffs = activeData?.upgrades || [];

  return (
    <PageContainer>
      <DashboardGrid>
        {/* PANEL DE BUFFS ACTIVOS */}
        <BuffsContainer>
          <SectionTitle>Buffs y Estados Activos</SectionTitle>
          {activeBuffs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.35)', fontSize: '0.9rem' }}>
              No tienes mejoras activas en este momento. Compra un buff en la tienda para activarlo.
            </div>
          ) : (
            activeBuffs.map((up: any) => {
              const daysLeft = getRemainingDays(up.expires_at);
              const percent = (daysLeft / 30) * 100;
              return (
                <BuffRow key={up.id}>
                  <CapacityProgressBar
                    label={
                      (up.upgrade_type === 'estado_empresarial' && 'Estado Empresarial (Buff)') ||
                      (up.upgrade_type === 'estatus_influencer' && 'Estatus de Influencer (Buff)') ||
                      (up.upgrade_type === 'adicionar_sede' && 'Licencia de Sede Adicional') ||
                      (up.upgrade_type === 'catalogo_ilimitado' && 'Catálogo Ilimitado (Sede)') ||
                      'Buff Activo'
                    }
                    percent={percent}
                    rightText={`${daysLeft} días restantes`}
                  />
                </BuffRow>
              );
            })
          )}
        </BuffsContainer>

        {/* PANEL DE RECURSOS Y LÍMITES */}
        <LimitsContainer>
          <SectionTitle>Recursos y Límites</SectionTitle>

          <CapacityProgressBar 
            label={user?.adminType === 'store' ? "Sedes del Comercio" : "Sedes Operativas"} 
            used={limits.stores.used} 
            max={limits.stores.max} 
          />

          <CapacityProgressBar 
            label="Categorías de Menú" 
            used={limits.categories.used} 
            max={limits.categories.max} 
          />

          <CapacityProgressBar 
            label="Productos (Por Categoría)" 
            used={limits.products.used} 
            max={limits.products.max} 
          />

          <CapacityProgressBar 
            label="Reels Activos (Influencer)" 
            used={limits.reels.used} 
            max={limits.reels.max} 
          />
        </LimitsContainer>
      </DashboardGrid>

      {/* TIENDA DE MEJORAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <SectionTitle>Tienda de Upgrades (Power-ups)</SectionTitle>
        <StoreGrid>
          {activeData?.catalog && activeData.catalog.length > 0 ? (
            activeData.catalog.map((item: any) => (
              <UpgradeCard 
                key={item.id}
                id={`upgrade-card-${item.upgrade_key}`} 
                $highlighted={highlightedUpgrade === item.upgrade_key}
              >
                <UpgradeIcon>
                  {renderIcon(item.icon)}
                </UpgradeIcon>
                <UpgradeTitle>{item.label}</UpgradeTitle>
                <div style={{
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  marginTop: '4px',
                  marginBottom: '8px',
                  backgroundColor: item.benefit_scope === 'global' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: item.benefit_scope === 'global' ? '#60a5fa' : '#34d399',
                  border: item.benefit_scope === 'global' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  {item.benefit_scope === 'global' ? 'Global (Comercio)' : 'Individual (Sede)'}
                </div>
                <UpgradeDescription>
                  {item.description}
                </UpgradeDescription>
                <PriceTag><CurrencyFormatter value={parseFloat(item.price_domis)} symbol="DOMIs" /></PriceTag>
                <BuyButton 
                  disabled={purchasing !== null} 
                  onClick={() => handlePurchase(item.upgrade_key, item.label, parseFloat(item.price_domis))}
                >
                  {purchasing === item.upgrade_key ? 'Activando...' : 'Adquirir Buff'}
                </BuyButton>
              </UpgradeCard>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              No hay mejoras disponibles para tu cuenta en este momento.
            </div>
          )}
        </StoreGrid>
      </div>

      {showInsufficientBalanceModal && mounted && typeof window !== 'undefined' && createPortal(
        <ModalOverlay onClick={() => setShowInsufficientBalanceModal(false)}>
          <ModalContent $maxWidth="500px" onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Saldo Insuficiente
              </ModalTitle>
              <CloseButton onClick={() => setShowInsufficientBalanceModal(false)}>&times;</CloseButton>
            </ModalHeader>
            
            <div style={{ marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {insufficientBalanceErrorMsg}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowInsufficientBalanceModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Mercado
              </button>
              <button 
                onClick={() => {
                  setShowInsufficientBalanceModal(false);
                  window.location.href = '/commerce/wallet';
                }}
                style={{
                  background: '#10b981',
                  border: 'none',
                  color: '#000',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                  transition: 'background 0.2s, transform 0.1s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#059669')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#10b981')}
              >
                Comprar DOMIs
              </button>
            </div>
          </ModalContent>
        </ModalOverlay>,
        document.body
      )}
    </PageContainer>
  );
}
