import type { Metadata, Viewport } from 'next';
import { StoreProvider } from '@/lib/stores';
import { ThemeController } from '@/lib/theme';
import { THEME_COLORS, THEME_INIT_SCRIPT } from '@/lib/theme-constants';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fuelify',
  description: 'Fuel your life with better nutrition',
  appleWebApp: { capable: true, title: 'Fuelify', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-theme is set by THEME_INIT_SCRIPT before hydration, so React must not complain about it
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <StoreProvider>
          <ThemeController />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
