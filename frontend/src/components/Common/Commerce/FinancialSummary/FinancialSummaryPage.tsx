'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { FinancialSummaryShell } from '@/components/Common/Finance/FinancialSummaryShell';

export default function FinancialSummaryPage() {
  const { user } = useAuth();
  const commerceId = user?.commerceId || 0;

  return (
    <FinancialSummaryShell
      mode={{
        type: 'commerce',
        commerceId
      }}
    />
  );
}
