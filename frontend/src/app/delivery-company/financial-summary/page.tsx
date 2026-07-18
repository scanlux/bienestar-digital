'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { FinancialSummaryShell } from '@/components/Common/Finance/FinancialSummaryShell';

export default function DeliveryFinancialSummaryPage() {
  const { user } = useAuth();
  const deliveryCompanyId = user?.deliveryCompanyId || 0;

  return (
    <FinancialSummaryShell
      mode={{
        type: 'delivery',
        deliveryCompanyId,
        companyName: 'Mi Empresa de Mensajería'
      }}
    />
  );
}
