'use client';

import { CommerceCatalogPage } from '@/components/Common/CommerceCatalog/CommerceCatalogPage';

export default function Page({ params }: { params: { commerceId: string } }) {
  return <CommerceCatalogPage commerceId={Number(params.commerceId)} isAdminView={true} />;
}

