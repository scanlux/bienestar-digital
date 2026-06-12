// Deploy trigger test - Verification of automated CI/CD pipeline
import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AlertProvider } from '@/context/AlertContext';
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
            <AlertProvider>
              <AuthProvider>
                {children}
                <div id="modal-portal-root" />
              </AuthProvider>
            </AlertProvider>
          </ToastProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
