'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { AUTH_DISABLED, useAuthStore, useDataStoresReady } from '@/lib/stores';
import { Icon, LoadingBlock, type IconName } from '@/components/ui';

// Mirrors: lib/screens/main/dashboard/screen.dart + bottom_navigation_bar.dart
// The tab bar is part of a full-viewport flex column, so it is always on screen;
// only the page content above it scrolls.
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/plan', label: 'Plan', icon: 'calendar' },
  { href: '/discovery', label: 'Discover', icon: 'compass' },
  { href: '/pantry', label: 'Pantry', icon: 'pantry' },
  { href: '/cart', label: 'Cart', icon: 'cart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAuthStore((s) => s.status);
  const dataStoresReady = useDataStoresReady();

  // Dashboard pages need a signed-in user; send logged-out visitors to login
  // unless the login gate is disabled.
  useEffect(() => {
    if (authStatus === 'loggedOut' && !AUTH_DISABLED) router.replace('/login');
  }, [authStatus, router]);

  return (
    <div className="screen">
      <div className="screen-body">
        {/* Data stores only exist once a user is signed in (never during
            static prerendering), so hold page content until then. */}
        {dataStoresReady ? children : <LoadingBlock />}
      </div>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link key={tab.href} href={tab.href} className="tab" aria-current={active ? 'page' : undefined}>
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
