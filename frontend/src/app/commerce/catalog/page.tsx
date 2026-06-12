'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingState, Spinner } from '@/components/Common/UIElements';

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (user.storeIds && user.storeIds.length === 1) {
      router.replace(`/commerce/stores/${user.storeIds[0]}`);
    } else {
      router.replace('/commerce/store-admins');
    }
  }, [user, router]);

  return (
    <LoadingState>
      <Spinner />
      <p>Redirigiendo al catálogo de la sede...</p>
    </LoadingState>
  );
}
