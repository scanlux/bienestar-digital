'use client';

import StoreProfilePage from '@/components/Common/Commerce/StoreProfile/StoreProfilePage';

export default function StoreProfileOrchestrator({ params }: { params: { storeId: string } }) {
  return <StoreProfilePage storeId={params.storeId} />;
}
