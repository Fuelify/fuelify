import type { Metadata, Viewport } from 'next';
import { StoreProvider } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fuelify',
  description: 'Fuel your life with better nutrition',
  appleWebApp: { capable: true, title: 'Fuelify', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#202020',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
