'use client';

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/Common/UIElements';
import { fadeIn } from '@/components/Common/PageStyles';

import UpgradeStatusBadge from './upgrades/UpgradeStatusBadge';
import UpgradeActionPanel from './upgrades/UpgradeActionPanel';
import UpgradeDetail from './upgrades/UpgradeDetail';

// Styled Components
const Container = styled.div`
  padding: 30px;
  max-width: 1300px;
  margin: 0 auto;
  animation: ${fadeIn} 0.4s ease-out;
  color: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
`;

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  margin: 6px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>`
  background: ${props => 
    props.$variant === 'primary' ? 'rgba(72, 214, 76, 0.15)' : 
    props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 
    props.$variant === 'ghost' ? 'transparent' : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => 
    props.$variant === 'primary' ? '#48d64c' : 
    props.$variant === 'danger' ? '#ef4444' : '#f1f5f9'};
  border: 1px solid ${props => 
    props.$variant === 'primary' ? 'rgba(72, 214, 76, 0.3)' : 
    props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 
    props.$variant === 'ghost' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 600;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => 
      props.$variant === 'primary' ? 'rgba(72, 214, 76, 0.25)' : 
      props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 
      props.$variant === 'ghost' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)'};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Stats Overview Block
const StatsOverviewBlock = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
`;

const StatItem = styled.div`
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.08);
  }
`;

const StatVal = styled.span`
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
`;

const StatLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Filter Bar
const FilterBar = styled.div`
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 250px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #ffffff;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(72, 214, 76, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }
`;

const SelectFilter = styled.select`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #f1f5f9;
  outline: none;
  cursor: pointer;

  option {
    background: #0d0f12;
    color: #f8fafc;
  }
`;

const ViewModeButton = styled.button`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;

  &:hover {
    color: #48d64c;
    background: rgba(72, 214, 76, 0.05);
    border-color: rgba(72, 214, 76, 0.2);
  }
`;

// Upgrades Grid View
const UpgradesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  margin-top: 10px;
`;

const UpgradeCard = styled.div<{ $isActive: boolean }>`
  background: rgba(255, 255, 255, 0.01);
  backdrop-filter: blur(12px);
  border: 1px solid ${props => props.$isActive ? 'rgba(255, 255, 255, 0.04)' : 'rgba(239, 68, 68, 0.15)'};
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    border-color: ${props => props.$isActive ? 'rgba(72, 214, 76, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardIconWrapper = styled.div<{ $type: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: ${props => 
    props.$type === 'estado_empresarial' ? 'rgba(72, 214, 76, 0.1)' : 
    props.$type === 'estatus_influencer' ? 'rgba(59, 130, 246, 0.1)' : 
    props.$type === 'adicionar_sede' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => 
    props.$type === 'estado_empresarial' ? '#48d64c' : 
    props.$type === 'estatus_influencer' ? '#3b82f6' : 
    props.$type === 'adicionar_sede' ? '#f59e0b' : 'rgba(255, 255, 255, 0.8)'};
`;

const Badge = ({ $variant, children, style }: any) => (
  <UpgradeStatusBadge variant={$variant} style={style}>{children}</UpgradeStatusBadge>
);

const UpgradeTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 750;
  color: #ffffff;
`;

const UpgradeDescription = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);
  min-height: 58px;
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 4px 0;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const InfoField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const InfoLabel = styled.span`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoVal = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
`;

const ActiveCommercesBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #48d64c;
  background: rgba(72, 214, 76, 0.06);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(72, 214, 76, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(72, 214, 76, 0.12);
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
`;

// Modals
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div<{ $width?: string }>`
  background: #0d0f12;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  width: ${props => props.$width || '500px'};
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    transition: background 0.2s ease;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 750;
  color: #ffffff;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  
  &:hover {
    color: #ffffff;
  }
`;

const ModalAlert = styled.div<{ $type?: 'info' | 'warning' }>`
  background: ${props => props.$type === 'warning' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)'};
  border: 1px solid ${props => props.$type === 'warning' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'};
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.5;
  color: ${props => props.$type === 'warning' ? '#fca5a5' : '#93c5fd'};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 12px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FormInput = styled.input`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #ffffff;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(72, 214, 76, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }
`;

const FormTextarea = styled.textarea`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #ffffff;
  min-height: 80px;
  resize: vertical;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(72, 214, 76, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }
`;

// Autocomplete Dropdown
const AutocompleteWrapper = styled.div`
  position: relative;
`;

const SuggestionsDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #0f1319;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin-top: 4px;
  max-height: 150px;
  overflow-y: auto;
  z-index: 10;
`;

const SuggestionItem = styled.div`
  padding: 10px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #e2e8f0;

  &:hover {
    background: rgba(72, 214, 76, 0.1);
    color: #48d64c;
  }
`;

// Switch toggle component
const SwitchWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
`;

const SwitchBox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  width: 36px;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s ease;
  outline: none;

  &:checked {
    background-color: #48d64c;
  }

  &::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: white;
    top: 2px;
    left: 2px;
    transition: transform 0.2s ease;
  }

  &:checked::before {
    transform: translateX(16px);
  }
`;

// Table in viewing modal and view mode list
const TableContainer = styled.div`
  overflow-x: auto;
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.005);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;

  th, td {
    padding: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  th {
    background: rgba(255, 255, 255, 0.02);
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.01);
  }
`;

// SVG Icons
const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#48d64c' }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

export default function UpgradesCatalogPage() {
  const toast = useToast();
  const router = useRouter();
  const { token } = useAuth();

  // Data States
  const [catalog, setCatalog] = useState<any[]>([]);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [commerces, setCommerces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & View Mode
  const [isListView, setIsListView] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals visibility
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<any | null>(null);
  const [viewingCommercesForItem, setViewingCommercesForItem] = useState<any | null>(null);

  // Autocomplete & search in viewing modal
  const [viewingSearch, setViewingSearch] = useState('');

  // Manual Grant Form States
  const [grantCommerceSearch, setGrantCommerceSearch] = useState('');
  const [selectedCommerce, setSelectedCommerce] = useState<any | null>(null);
  const [grantType, setGrantType] = useState('');
  const [grantDuration, setGrantDuration] = useState<number | ''>('');
  const [grantReason, setGrantReason] = useState('');
  const [grantStoreId, setGrantStoreId] = useState<number | ''>('');
  const [grantDeliveryCompanyId, setGrantDeliveryCompanyId] = useState<number | ''>('');
  const [grantUserId, setGrantUserId] = useState<number | ''>('');
  const [showCommerceSuggestions, setShowCommerceSuggestions] = useState(false);
  const [savingGrant, setSavingGrant] = useState(false);

  // Catalog Item Save loading
  const [savingCatalogKey, setSavingCatalogKey] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch catalog
      const catalogRes = await axios.get(`${API_URL}/api/manage/upgrades/catalog`, { headers });
      setCatalog(catalogRes.data);

      // Fetch all upgrades
      const upgradesRes = await axios.get(`${API_URL}/api/manage/upgrades/admin/all?limit=1000`, { headers });
      setUpgrades(upgradesRes.data.rows || []);

      // Fetch commerces for manual grant autocomplete
      const commercesRes = await axios.get(`${API_URL}/api/manage/commerces`, { headers });
      setCommerces(commercesRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('No autorizado para ver la administración de mejoras o error al cargar datos.');
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Catalog save (Create or Edit)
  const handleSaveCatalogEntry = async (item: any) => {
    setSavingCatalogKey(item.upgrade_key || 'NEW_ITEM');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        upgrade_key: item.upgrade_key,
        label: item.label,
        description: item.description,
        icon: item.icon || 'star',
        price_domis: Number(item.price_domis),
        duration_days: Number(item.duration_days),
        is_subscription: item.is_subscription ? 1 : 0,
        max_per_commerce: item.max_per_commerce === null || item.max_per_commerce === '' ? null : Number(item.max_per_commerce),
        max_per_entity: item.max_per_entity === null || item.max_per_entity === '' ? null : Number(item.max_per_entity),
        benefit_scope: item.benefit_scope || 'global',
        target_role: item.target_role,
        is_active: item.is_active ? 1 : 0
      };

      if (item.is_create) {
        // Create catalog entry
        await axios.post(`${API_URL}/api/manage/upgrades/catalog`, payload, { headers });
        toast.success(`Mejora '${item.label}' creada correctamente.`);
      } else {
        // Edit catalog entry
        await axios.patch(`${API_URL}/api/manage/upgrades/catalog/${item.upgrade_key}`, payload, { headers });
        toast.success(`Mejora '${item.label}' actualizada correctamente.`);
      }
      
      setEditingCatalogItem(null);
      
      // Refresh state
      const catalogRes = await axios.get(`${API_URL}/api/manage/upgrades/catalog`, { headers });
      setCatalog(catalogRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al guardar la mejora en el catálogo.');
    } finally {
      setSavingCatalogKey(null);
    }
  };

  // Manual grant handler
  const handleGrantUpgrade = async () => {
    if (!selectedCommerce) {
      toast.error('Debe seleccionar un comercio válido.');
      return;
    }
    if (!grantType) {
      toast.error('Debe seleccionar un tipo de mejora.');
      return;
    }
    if (!grantReason || grantReason.trim().length < 10) {
      toast.error('Debe indicar una razón de otorgamiento (mínimo 10 caracteres).');
      return;
    }

    setSavingGrant(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        commerceId: selectedCommerce.id,
        upgradeKey: grantType,
        durationDays: grantDuration !== '' ? Number(grantDuration) : undefined,
        reason: grantReason,
        storeId: grantStoreId !== '' ? Number(grantStoreId) : undefined,
        deliveryCompanyId: grantDeliveryCompanyId !== '' ? Number(grantDeliveryCompanyId) : undefined,
        userId: grantUserId !== '' ? Number(grantUserId) : undefined
      };

      await axios.post(`${API_URL}/api/manage/upgrades/admin/grant`, payload, { headers });
      toast.success('Mejora otorgada manualmente con éxito.');
      setShowGrantModal(false);
      
      // Reset Form
      setSelectedCommerce(null);
      setGrantCommerceSearch('');
      setGrantType('');
      setGrantDuration('');
      setGrantReason('');
      setGrantStoreId('');
      setGrantDeliveryCompanyId('');
      setGrantUserId('');

      // Refresh list
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al otorgar la mejora.');
    } finally {
      setSavingGrant(false);
    }
  };

  // Helper properties for manual grant
  const filteredCommerces = commerces.filter(c => 
    c.nombre.toLowerCase().includes(grantCommerceSearch.toLowerCase()) ||
    c.nit.toLowerCase().includes(grantCommerceSearch.toLowerCase())
  ).slice(0, 5);

  const activeUpgradesList = upgrades.filter(u => new Date(u.expires_at) > new Date());
  
  // Calculate total income
  const totalPaidIncome = upgrades.filter(u => parseFloat(u.price_domis) > 0).reduce((acc, u) => acc + parseFloat(u.price_domis), 0);
  
  // Unique commerces with active upgrades
  const activeCommercesCount = new Set(activeUpgradesList.map(u => u.commerce_id)).size;

  const getDaysRemaining = (expiryDateStr: string) => {
    const diff = new Date(expiryDateStr).getTime() - new Date().getTime();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Filter Catalog list based on upper filters
  const filteredCatalog = catalog.filter((item: any) => {
    const matchesSearch = 
      item.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.upgrade_key.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.description.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus = 
      statusFilter === '' || 
      (statusFilter === 'active' && item.is_active === 1) || 
      (statusFilter === 'inactive' && item.is_active === 0);

    const matchesSubscription = 
      subFilter === '' || 
      (subFilter === 'sub' && item.is_subscription === 1) || 
      (subFilter === 'single' && item.is_subscription === 0);

    const matchesRole = 
      roleFilter === '' || 
      (item.target_role || '').split(',').map((r: string) => r.trim()).includes(roleFilter);

    return matchesSearch && matchesStatus && matchesSubscription && matchesRole;
  });

  // Get user role readable label (supports multiple comma-separated roles)
  const getRoleReadable = (role: string) => {
    if (!role) return '';
    return role.split(',').map((r: string) => {
      const trimmed = r.trim();
      if (trimmed === 'commerce_manager') return 'Admin de Comercio';
      if (trimmed === 'store_admin') return 'Admin de Sede';
      if (trimmed === 'delivery_company_admin') return 'Admin de Empresa Repartidora';
      if (trimmed === 'customer') return 'Cliente';
      if (trimmed === 'customer_driver') return 'Repartidor';
      return trimmed;
    }).join(', ');
  };

  const toggleRole = (roleCode: string) => {
    if (!editingCatalogItem) return;
    const currentRoles = (editingCatalogItem.target_role || '').split(',').map((r: string) => r.trim()).filter(Boolean);
    let newRoles: string[];
    if (currentRoles.includes(roleCode)) {
      newRoles = currentRoles.filter((r: string) => r !== roleCode);
    } else {
      newRoles = [...currentRoles, roleCode];
    }
    setEditingCatalogItem({
      ...editingCatalogItem,
      target_role: newRoles.join(',')
    });
  };

  if (loading && catalog.length === 0) {
    return (
      <Container>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px' }}>
          <Spinner />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Cargando catálogo de mejoras...</span>
        </div>
      </Container>
    );
  }

  // Active contracts for currently selected viewing catalog item
  const selectedItemActiveContracts = viewingCommercesForItem 
    ? upgrades.filter(u => {
        const isMatch = u.upgrade_type === viewingCommercesForItem.upgrade_key && new Date(u.expires_at) > new Date();
        if (!isMatch) return false;
        if (!viewingSearch) return true;
        
        return (
          u.razon_social.toLowerCase().includes(viewingSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(viewingSearch.toLowerCase())
        );
      })
    : [];

  return (
    <Container>
      <Header>
        <div>
          <TitleContainer>
            <ShieldIcon />
            <Title>Administración de Mejoras (Catálogo)</Title>
          </TitleContainer>
          <Subtitle>
            Gestione las mejoras operativas del ecosistema, configure precios y duraciones, otorgue manuales y visualice comercios afectados.
          </Subtitle>
        </div>
        <UpgradeActionPanel 
          onCreateUpgrade={() => setEditingCatalogItem({
            upgrade_key: '',
            label: '',
            description: '',
            icon: 'star',
            price_domis: '0',
            duration_days: '30',
            is_subscription: 0,
            max_per_commerce: null,
            max_per_entity: null,
            benefit_scope: 'global',
            target_role: 'commerce_manager',
            is_active: 1,
            is_create: true
          })} 
          onGrantUpgrade={() => setShowGrantModal(true)} 
        />
      </Header>

      {/* Stats Summary Block */}
      <StatsOverviewBlock>
        <StatItem>
          <StatVal style={{ color: '#48d64c' }}>{activeUpgradesList.length}</StatVal>
          <StatLabel>Mejoras Activas Globales</StatLabel>
        </StatItem>
        <StatItem>
          <StatVal style={{ color: '#3b82f6' }}>{activeCommercesCount}</StatVal>
          <StatLabel>Comercios con Buffs</StatLabel>
        </StatItem>
        <StatItem>
          <StatVal style={{ color: '#10b981' }}>{totalPaidIncome.toFixed(2)} DOMI</StatVal>
          <StatLabel>Ingresos por Ventas</StatLabel>
        </StatItem>
        <StatItem>
          <StatVal style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            {(upgrades.length - upgrades.filter(u => parseFloat(u.price_domis) > 0).length)}
          </StatVal>
          <StatLabel>Otorgamientos Manuales</StatLabel>
        </StatItem>
      </StatsOverviewBlock>

      {/* Filter Bar */}
      <FilterBar>
        <ViewModeButton 
          type="button" 
          onClick={() => setIsListView(!isListView)} 
          title={isListView ? "Cambiar a vista de grilla" : "Cambiar a vista de lista"}
        >
          {isListView ? <GridIcon /> : <ListIcon />}
        </ViewModeButton>
        
        <SearchInput 
          type="text" 
          placeholder="Buscar por clave, nombre o descripción..." 
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
        />
        
        <SelectFilter value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Estado (Todos)</option>
          <option value="active">Habilitadas</option>
          <option value="inactive">Desactivadas</option>
        </SelectFilter>

        <SelectFilter value={subFilter} onChange={e => setSubFilter(e.target.value)}>
          <option value="">Tipo de Cobro (Todos)</option>
          <option value="sub">Suscripción</option>
          <option value="single">Compra Única</option>
        </SelectFilter>

        <SelectFilter value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Rol Destino (Todos)</option>
          <option value="commerce_manager">Admin de Comercio</option>
          <option value="store_admin">Admin de Sede</option>
          <option value="delivery_company_admin">Admin de Empresa Repartidora</option>
          <option value="customer">Cliente</option>
          <option value="customer_driver">Repartidor</option>
        </SelectFilter>
      </FilterBar>

      {/* Grid or List rendering */}
      {isListView ? (
        <TableContainer>
          <Table>
            <thead>
              <tr>
                <th>Clave / Icono</th>
                <th>Nombre de la Mejora</th>
                <th>Descripción</th>
                <th>Precio</th>
                <th>Duración</th>
                <th>Cobro</th>
                <th>Rol Destino</th>
                <th>Estado</th>
                <th style={{ width: '130px' }}>Comercios</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((item: any) => {
                const activeForThis = upgrades.filter(u => u.upgrade_type === item.upgrade_key && new Date(u.expires_at) > new Date());
                
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>
                          {item.icon === 'building' ? '🏢' : item.icon === 'video' ? '🎥' : item.icon === 'store' ? '🏪' : item.icon === 'gift' ? '🎁' : '⭐'}
                        </span>
                        <code style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.upgrade_key}
                        </code>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{item.label}</td>
                    <td style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
                      {item.description}
                    </td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{parseFloat(item.price_domis).toFixed(2)} DOMI</td>
                    <td>{item.duration_days} días</td>
                    <td>
                      <Badge $variant={item.is_subscription === 1 ? 'info' : 'neutral'}>
                        {item.is_subscription === 1 ? 'Suscripción' : 'Compra Única'}
                      </Badge>
                    </td>
                    <td>
                      <Badge $variant="warning">
                        {getRoleReadable(item.target_role)}
                      </Badge>
                    </td>
                    <td>
                      <Badge $variant={item.is_active === 1 ? 'success' : 'neutral'}>
                        {item.is_active === 1 ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td>
                      <Button $variant="ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => { setViewingCommercesForItem(item); setViewingSearch(''); }}>
                        👥 {activeForThis.length} activos
                      </Button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Button style={{ padding: '6px 10px', fontSize: '11px' }} onClick={() => setEditingCatalogItem(JSON.parse(JSON.stringify(item)))}>
                        ⚙️ Configurar
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredCatalog.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>
                    No se encontraron mejoras en el catálogo bajo los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </TableContainer>
      ) : (
        <UpgradesGrid>
          {filteredCatalog.map((item: any) => {
            const activeForThis = upgrades.filter(u => u.upgrade_type === item.upgrade_key && new Date(u.expires_at) > new Date());
            
            return (
              <UpgradeCard key={item.id} $isActive={item.is_active === 1}>
                <CardHeader>
                  <CardIconWrapper $type={item.upgrade_key}>
                    {item.icon === 'building' ? '🏢' : item.icon === 'video' ? '🎥' : item.icon === 'store' ? '🏪' : item.icon === 'gift' ? '🎁' : '⭐'}
                  </CardIconWrapper>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Badge $variant="warning">
                      {getRoleReadable(item.target_role)}
                    </Badge>
                    <Badge $variant={item.is_active === 1 ? 'success' : 'danger'}>
                      {item.is_active === 1 ? 'Habilitada' : 'Inactiva'}
                    </Badge>
                  </div>
                </CardHeader>

                <div>
                  <UpgradeTitle>{item.label}</UpgradeTitle>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Clave: {item.upgrade_key}</span>
                </div>

                <UpgradeDescription>{item.description}</UpgradeDescription>

                <Divider />

                <InfoGrid>
                  <InfoField>
                    <InfoLabel>Precio</InfoLabel>
                    <InfoVal style={{ color: '#10b981' }}>{parseFloat(item.price_domis).toFixed(2)} DOMI</InfoVal>
                  </InfoField>
                  <InfoField>
                    <InfoLabel>Duración Estándar</InfoLabel>
                    <InfoVal>{item.duration_days} días</InfoVal>
                  </InfoField>
                  <InfoField>
                    <InfoLabel>Cobro</InfoLabel>
                    <InfoVal>
                      <Badge $variant={item.is_subscription === 1 ? 'info' : 'neutral'} style={{ border: 'none', padding: '2px 6px', fontSize: '9.5px' }}>
                        {item.is_subscription === 1 ? 'Suscripción' : 'Compra Única'}
                      </Badge>
                    </InfoVal>
                  </InfoField>
                  <InfoField>
                    <InfoLabel>Límite por Comercio</InfoLabel>
                    <InfoVal>{item.max_per_commerce ? `Max ${item.max_per_commerce}` : 'Sin límite'}</InfoVal>
                  </InfoField>
                  <InfoField style={{ gridColumn: 'span 2' }}>
                    <InfoLabel>Usuario Destino</InfoLabel>
                    <InfoVal style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)' }}>
                      {getRoleReadable(item.target_role)}
                    </InfoVal>
                  </InfoField>
                </InfoGrid>

                <Divider />

                <ActiveCommercesBadge onClick={() => { setViewingCommercesForItem(item); setViewingSearch(''); }}>
                  <span>
                    👥 {activeForThis.length}{' '}
                    {item.benefit_scope === 'global'
                      ? (activeForThis.length === 1 ? 'comercio activo' : 'comercios activos')
                      : ((item.target_role || '').includes('store_admin')
                          ? (activeForThis.length === 1 ? 'sede activa' : 'sedes activas')
                          : (activeForThis.length === 1 ? 'usuario activo' : 'usuarios activos'))
                    }
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Ver lista →</span>
                </ActiveCommercesBadge>

                <CardActions>
                  <Button style={{ flex: 1 }} onClick={() => setEditingCatalogItem(JSON.parse(JSON.stringify(item)))}>
                    ⚙️ Configurar Parámetros
                  </Button>
                </CardActions>
              </UpgradeCard>
            );
          })}
          {filteredCatalog.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '5rem 0' }}>
              No se encontraron mejoras en el catálogo.
            </div>
          )}
        </UpgradesGrid>
      )}

      {/* MODAL 1: Formulario Modular (Crear / Editar) de Mejora */}
      {editingCatalogItem && (
        <ModalOverlay>
          <ModalContent $width="680px">
            <ModalHeader>
              <ModalTitle>{editingCatalogItem.is_create ? 'Crear Nueva Mejora' : `Configurar: ${editingCatalogItem.label}`}</ModalTitle>
              <CloseButton onClick={() => setEditingCatalogItem(null)}>&times;</CloseButton>
            </ModalHeader>
            <ModalAlert>
              {editingCatalogItem.is_create 
                ? 'Complete los parámetros para dar de alta una nueva mejora o buff operativo en el mercado.'
                : 'Los cambios en el precio o duración se aplicarán a compras futuras. Los contratos activos vigentes mantendrán sus condiciones previas.'}
            </ModalAlert>

            <FormGrid>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormLabel style={{ margin: 0 }}>Estado del Buff en el Mercado</FormLabel>
                <SwitchWrapper>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: editingCatalogItem.is_active ? '#48d64c' : '#777' }}>
                    {editingCatalogItem.is_active ? 'HABILITADO' : 'DESACTIVADO'}
                  </span>
                  <SwitchBox 
                    checked={editingCatalogItem.is_active === 1}
                    onChange={(e) => {
                      setEditingCatalogItem({
                        ...editingCatalogItem,
                        is_active: e.target.checked ? 1 : 0
                      });
                    }}
                  />
                </SwitchWrapper>
              </div>

              {editingCatalogItem.is_create ? (
                <>
                  <FormGroup style={{ gridColumn: 'span 2' }}>
                    <FormLabel>Clave Técnica Única (minúsculas y guiones bajos)</FormLabel>
                    <FormInput 
                      type="text"
                      placeholder="ej: estado_empresarial, publicidad_removida"
                      value={editingCatalogItem.upgrade_key}
                      onChange={(e) => setEditingCatalogItem({
                        ...editingCatalogItem,
                        upgrade_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                      })}
                    />
                  </FormGroup>
                  <FormGroup style={{ gridColumn: 'span 2' }}>
                    <FormLabel>Nombre Legible para la UI</FormLabel>
                    <FormInput 
                      type="text"
                      placeholder="ej: Estado Empresarial"
                      value={editingCatalogItem.label}
                      onChange={(e) => setEditingCatalogItem({
                        ...editingCatalogItem,
                        label: e.target.value
                      })}
                    />
                  </FormGroup>
                </>
              ) : (
                <FormGroup style={{ gridColumn: 'span 2' }}>
                  <FormLabel>Clave Técnica (Inmutable)</FormLabel>
                  <code style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px' }}>
                    {editingCatalogItem.upgrade_key}
                  </code>
                </FormGroup>
              )}

              <FormGroup style={{ gridColumn: 'span 2' }}>
                <FormLabel>Icono de Visualización</FormLabel>
                <SelectFilter 
                  value={editingCatalogItem.icon}
                  onChange={(e) => setEditingCatalogItem({
                    ...editingCatalogItem,
                    icon: e.target.value
                  })}
                >
                  <option value="star">⭐ General / Destacado</option>
                  <option value="building">🏢 Empresa / Estructuras</option>
                  <option value="video">🎥 Reels / Video</option>
                  <option value="store">🏪 Sede / Domicilios</option>
                  <option value="gift">🎁 Cortesía / Regalo</option>
                </SelectFilter>
              </FormGroup>

              <FormGroup style={{ gridColumn: 'span 2' }}>
                <FormLabel>Descripción del Beneficio</FormLabel>
                <FormTextarea 
                  value={editingCatalogItem.description}
                  onChange={(e) => setEditingCatalogItem({
                    ...editingCatalogItem,
                    description: e.target.value
                  })}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Precio de Compra (DOMIs)</FormLabel>
                <FormInput 
                  type="number"
                  step="0.0001"
                  min="0.0000"
                  value={editingCatalogItem.price_domis}
                  onChange={(e) => setEditingCatalogItem({
                    ...editingCatalogItem,
                    price_domis: e.target.value
                  })}
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Duración Estándar (Días)</FormLabel>
                <FormInput 
                  type="number"
                  min="1"
                  value={editingCatalogItem.duration_days}
                  onChange={(e) => setEditingCatalogItem({
                    ...editingCatalogItem,
                    duration_days: e.target.value
                  })}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Tipo de Cobro / Suscripción</FormLabel>
                <SelectFilter 
                  value={editingCatalogItem.is_subscription}
                  onChange={(e) => setEditingCatalogItem({
                    ...editingCatalogItem,
                    is_subscription: Number(e.target.value)
                  })}
                >
                  <option value={1}>Suscripción Recurrente</option>
                  <option value={0}>Compra Única</option>
                </SelectFilter>
              </FormGroup>

               <FormGroup style={{ gridColumn: 'span 2' }}>
                <FormLabel>Rol(es) / Usuario Destino (Selección Múltiple)</FormLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '10px' }}>
                  {[
                    { value: 'commerce_manager', label: 'Admin de Comercio (Commerce)' },
                    { value: 'store_admin', label: 'Admin de Sede (Store)' },
                    { value: 'delivery_company_admin', label: 'Admin de Empresa Repartidora' },
                    { value: 'customer', label: 'Cliente (Customer)' },
                    { value: 'customer_driver', label: 'Repartidor' }
                  ].map(role => {
                    const isSelected = (editingCatalogItem.target_role || '')
                      .split(',')
                      .map((r: string) => r.trim())
                      .includes(role.value);
                    return (
                      <label
                        key={role.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          backgroundColor: '#1f2937',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid var(--emerald)' : '1px solid #374151',
                          cursor: 'pointer',
                          color: isSelected ? '#fff' : '#9ca3af',
                          fontSize: '13px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRole(role.value)}
                          style={{
                            width: '18px',
                            height: '18px',
                            accentColor: 'var(--emerald)',
                            cursor: 'pointer'
                          }}
                        />
                        {role.label}
                      </label>
                    );
                  })}
                </div>
              </FormGroup>

              <FormGroup>
                <FormLabel>Alcance del Beneficio (Scope)</FormLabel>
                <SelectFilter 
                  style={{ width: '100%' }}
                  value={editingCatalogItem.benefit_scope || 'global'}
                  onChange={(e) => setEditingCatalogItem({
                    ...editingCatalogItem,
                    benefit_scope: e.target.value
                  })}
                >
                  <option value="global">Global (Aplica a todo el Comercio)</option>
                  <option value="individual">Individual (Aplica a la sub-entidad compradora)</option>
                </SelectFilter>
              </FormGroup>

              <FormGroup>
                <FormLabel>Límite de Instancias por Entidad Específica</FormLabel>
                <FormInput 
                  type="number"
                  min="1"
                  placeholder="Ilimitado (dejar vacío)"
                  value={editingCatalogItem.max_per_entity || ''}
                  onChange={(e) => setEditingCatalogItem({
                    ...editingCatalogItem,
                    max_per_entity: e.target.value === '' ? null : e.target.value
                  })}
                />
              </FormGroup>

              <FormGroup style={{ gridColumn: 'span 2' }}>
                <FormLabel>Límite de Instancias por Comercio</FormLabel>
                <FormInput 
                  type="number"
                  min="1"
                  placeholder="Ilimitado (dejar vacío)"
                  value={editingCatalogItem.max_per_commerce || ''}
                  onChange={(e) => setEditingCatalogItem({
                    ...editingCatalogItem,
                    max_per_commerce: e.target.value === '' ? null : e.target.value
                  })}
                />
              </FormGroup>
            </FormGrid>

            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <Button style={{ flex: 1 }} onClick={() => setEditingCatalogItem(null)}>
                Cancelar
              </Button>
              <Button 
                $variant="primary" 
                style={{ flex: 1 }} 
                disabled={savingCatalogKey !== null}
                onClick={() => handleSaveCatalogEntry(editingCatalogItem)}
              >
                {savingCatalogKey === (editingCatalogItem.upgrade_key || 'NEW_ITEM') ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* MODAL 2: Ver Comercios Afectados */}
      <UpgradeDetail 
        viewingCommercesForItem={viewingCommercesForItem}
        viewingSearch={viewingSearch}
        setViewingSearch={setViewingSearch}
        selectedItemActiveContracts={selectedItemActiveContracts}
        onClose={() => { setViewingCommercesForItem(null); setViewingSearch(''); }}
      />

      {/* MODAL 3: Otorgar Mejora Manual (Otorgar sin Cobro) */}
      {showGrantModal && (
        <ModalOverlay>
          <ModalContent $width="680px">
            <ModalHeader>
              <ModalTitle>Otorgar Mejora sin Cobro</ModalTitle>
              <CloseButton onClick={() => { setShowGrantModal(false); setSelectedCommerce(null); setGrantCommerceSearch(''); }}>&times;</CloseButton>
            </ModalHeader>
            <ModalAlert>
              Esta acción activará de forma gratuita el buff para el comercio seleccionado. No se debitarán tokens DOMIs de su billetera. Esta transacción administrativa se registrará con valor 0.0000 para auditoría.
            </ModalAlert>
            
            <FormGroup>
              <FormLabel>Buscar Comercio (NIT o Nombre)</FormLabel>
              <AutocompleteWrapper>
                <FormInput 
                  type="text" 
                  placeholder="Escriba NIT o Nombre para buscar..." 
                  value={selectedCommerce ? selectedCommerce.nombre : grantCommerceSearch}
                  disabled={selectedCommerce !== null}
                  onChange={(e) => {
                    setGrantCommerceSearch(e.target.value);
                    setShowCommerceSuggestions(true);
                  }}
                  onFocus={() => setShowCommerceSuggestions(true)}
                />
                {selectedCommerce && (
                  <Button 
                    $variant="danger" 
                    style={{ position: 'absolute', right: '6px', top: '6px', padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => {
                      setSelectedCommerce(null);
                      setGrantCommerceSearch('');
                    }}
                  >
                    Quitar
                  </Button>
                )}
                {showCommerceSuggestions && grantCommerceSearch && !selectedCommerce && (
                  <SuggestionsDropdown>
                    {filteredCommerces.map(c => (
                      <SuggestionItem 
                        key={c.id} 
                        onClick={() => {
                          setSelectedCommerce(c);
                          setShowCommerceSuggestions(false);
                        }}
                      >
                        {c.nombre} (NIT: {c.nit})
                      </SuggestionItem>
                    ))}
                    {filteredCommerces.length === 0 && (
                      <div style={{ padding: '10px 14px', fontSize: '12px', color: '#666' }}>No se hallaron comercios</div>
                    )}
                  </SuggestionsDropdown>
                )}
              </AutocompleteWrapper>
            </FormGroup>

            <FormGroup>
              <FormLabel>Mejora a Otorgar</FormLabel>
              <SelectFilter style={{ width: '100%' }} value={grantType} onChange={e => setGrantType(e.target.value)}>
                <option value="">Seleccione una mejora...</option>
                {catalog.filter(c => c.is_active === 1).map(c => (
                  <option key={c.upgrade_key} value={c.upgrade_key}>{c.label}</option>
                ))}
              </SelectFilter>
            </FormGroup>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <FormGroup>
                <FormLabel>ID Sede (Opcional)</FormLabel>
                <FormInput 
                  type="number" 
                  placeholder="Ej: 5"
                  value={grantStoreId}
                  onChange={e => setGrantStoreId(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>ID Empresa (Opcional)</FormLabel>
                <FormInput 
                  type="number" 
                  placeholder="Ej: 2"
                  value={grantDeliveryCompanyId}
                  onChange={e => setGrantDeliveryCompanyId(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>ID Usuario (Opcional)</FormLabel>
                <FormInput 
                  type="number" 
                  placeholder="Ej: 14"
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </FormGroup>
            </div>

            <FormGroup>
              <FormLabel>Duración del Otorgamiento (Días personalizados - Opcional)</FormLabel>
              <FormInput 
                type="number" 
                min="1" 
                placeholder="Usar duración estándar de la mejora"
                value={grantDuration}
                onChange={e => setGrantDuration(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>Motivo / Razón del Otorgamiento (Mínimo 10 caracteres)</FormLabel>
              <FormTextarea 
                placeholder="Indique la justificación para auditar esta acción en la bitácora..."
                value={grantReason}
                onChange={e => setGrantReason(e.target.value)}
              />
            </FormGroup>

            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <Button style={{ flex: 1 }} onClick={() => { setShowGrantModal(false); setSelectedCommerce(null); setGrantCommerceSearch(''); }}>
                Cancelar
              </Button>
              <Button 
                $variant="primary" 
                style={{ flex: 1 }}
                disabled={savingGrant}
                onClick={handleGrantUpgrade}
              >
                {savingGrant ? 'Otorgando...' : 'Confirmar Otorgamiento'}
              </Button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
}
