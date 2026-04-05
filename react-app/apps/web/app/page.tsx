'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './providers';
import { DEBUG, DEBUG_ENTER_ROUTE } from '@fuelify/shared';

// Splash screen — mirrors lib/screens/splash_screen.dart
// Checks auth status then redirects to login or dashboard
export default function SplashPage() {
  const router = useRouter();
  const checkToken = useAuthStore((s) => s.checkToken);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    const init = async () => {
      // Simulate splash delay matching Flutter's 2-second animation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (DEBUG) {
        router.replace(`/${DEBUG_ENTER_ROUTE}`);
        return;
      }

      const isAuthenticated = await checkToken();
      if (isAuthenticated) {
        router.replace('/plan');
      } else {
        router.replace('/login');
      }
    };
    init();
  }, [checkToken, router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#202020',
    }}>
      <h1 style={{
        color: '#FFBD73',
        fontSize: '3rem',
        fontWeight: 700,
        opacity: status === 'loggedOut' ? 1 : 0.5,
        transition: 'opacity 2s ease-in',
      }}>
        Fuelify
      </h1>
    </div>
  );
}
