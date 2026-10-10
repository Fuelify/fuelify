'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AUTH_DISABLED, useAuthStore, useDataStoresReady, useProfileStore } from '@/lib/stores';
import { Logo, Spinner } from '@/components/ui';

// Splash screen — mirrors lib/screens/splash_screen.dart
// Waits for the auth session, then routes: logged out → login,
// not yet onboarded → onboarding, otherwise → home.
export default function SplashPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const dataStoresReady = useDataStoresReady();

  useEffect(() => {
    if (status === 'loggedOut' && !AUTH_DISABLED) router.replace('/login');
  }, [status, router]);

  return (
    <div className="screen">
      <div className="center-fill">
        <Logo />
        <p className="muted">Fuel your life with better nutrition</p>
        <div style={{ marginTop: 24 }}><Spinner /></div>
        {dataStoresReady && <RouteByProfile />}
      </div>
    </div>
  );
}

function RouteByProfile() {
  const router = useRouter();
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const profile = useProfileStore((s) => s.profile);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    fetchProfile().finally(() => setFetched(true));
  }, [fetchProfile]);

  useEffect(() => {
    if (!fetched) return;
    router.replace(profile && !profile.onboarded ? '/onboarding/welcome' : '/home');
  }, [fetched, profile, router]);

  return null;
}
