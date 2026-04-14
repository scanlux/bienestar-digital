import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
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
          <AuthProvider>
            {children}
          </AuthProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
