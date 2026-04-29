'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './providers';
import { DEBUG, DEBUG_ENTER_ROUTE } from '@fuelify/shared';

// Splash screen — mirrors lib/screens/splash_screen.dart
// Checks Supabase Auth session then redirects to login or dashboard
export default function SplashPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    // Wait for auth initialization to complete
    if (status === 'loading') return;

    const timer = setTimeout(() => {
      if (DEBUG) {
        router.replace(`/${DEBUG_ENTER_ROUTE}`);
        return;
      }

      if (status === 'loggedIn') {
        router.replace('/plan');
      } else {
        router.replace('/login');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, router]);

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
      }}>
        Fuelify
      </h1>
    </div>
  );
}
