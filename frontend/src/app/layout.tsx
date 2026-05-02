import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import StyledComponentsRegistry from '../../libs/registry';
import { GlobalStyles } from '@/components/Layout/GlobalStyles';

export const metadata: Metadata = {
  title: 'TrendyTech Marketplace',
  description: 'Premium Food & Delivery Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <GlobalStyles />
          <ToastProvider>
            <AuthProvider>
              {children}
              <div id="modal-portal-root" />
            </AuthProvider>
          </ToastProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
