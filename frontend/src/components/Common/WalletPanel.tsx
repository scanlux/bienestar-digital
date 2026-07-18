'use client';

import React from 'react';
import { UserWalletPanel } from './Wallet/UserWalletPanel';
import { StoreWalletPanel } from './Wallet/StoreWalletPanel';
import { SystemWalletPanel } from './Wallet/SystemWalletPanel';
import { WalletPanelProps } from './Wallet/WalletTypes';
import { useAuth } from '@/context/AuthContext';
import { isCustomerWalletView } from '@/utils/walletDisplayMode';

export function WalletPanel({ ownerType, ownerId, readOnly = false }: WalletPanelProps) {
  const { user } = useAuth();

  if (ownerType === 'system') {
    return <SystemWalletPanel ownerType={ownerType} ownerId={ownerId} readOnly={readOnly} />;
  }

  if (ownerType === 'store' || ownerType === 'commerce' || ownerType === 'delivery_company') {
    return <StoreWalletPanel ownerType={ownerType} ownerId={ownerId} readOnly={readOnly} />;
  }

  const isCustomerView = isCustomerWalletView(user);

  // Fallback / default is the standard user wallet (client or driver)
  return <UserWalletPanel ownerType={ownerType} ownerId={ownerId} readOnly={readOnly} isCustomerView={isCustomerView} />;
}

export default WalletPanel;
