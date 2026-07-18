'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { FinancialSummaryShell } from '@/components/Common/Finance/FinancialSummaryShell';

export default function StoreFinancialSummaryPage() {
  const params = useParams();
  const storeId = Number(params.storeId);

  return (
    <FinancialSummaryShell
      mode={{
        type: 'store',
        storeId,
        storeName: `Sede #${storeId}`
      }}
    />
  );
}
