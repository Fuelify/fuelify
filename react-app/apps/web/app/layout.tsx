import type { Metadata } from 'next';
import { StoreProvider } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fuelify',
  description: 'Fuel your life with better nutrition',
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
