'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClientInstance] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000, // 5 segundos para evitar refrescos duplicados
            refetchOnWindowFocus: false, // desactivado para desarrollo local y reducir llamadas
            retry: (failureCount, error: any) => {
              if (failureCount >= 3) return false;
              const status = error.response?.status;
              // No reintentar en errores de validación, autorización, sesión vencida o recurso no encontrado (400, 401, 403, 404, 440)
              if (status === 400 || status === 401 || status === 403 || status === 404 || status === 440) {
                return false;
              }
              return true;
            },
            refetchOnMount: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClientInstance}>
      {children}
    </QueryClientProvider>
  );
}
