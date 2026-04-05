'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useNavigationStore } from '../providers';
import { DASHBOARD_ROUTES } from '@fuelify/shared';

// Mirrors: lib/screens/main/dashboard/screen.dart + bottom_navigation_bar.dart
const TAB_LABELS = ['Home', 'Plan', 'Discovery', 'Food', 'Profile'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setDashboardTab = useNavigationStore((s) => s.setDashboardTab);

  const currentTabIndex = DASHBOARD_ROUTES.findIndex((r) => pathname === `/${r}`);

  const handleTabChange = (index: number) => {
    setDashboardTab(index);
    router.push(`/${DASHBOARD_ROUTES[index]}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Main content */}
      <main style={{ flex: 1, padding: 16 }}>
        {children}
      </main>

      {/* Bottom navigation bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 64,
        borderTop: '1px solid #333',
        backgroundColor: '#202020',
      }}>
        {TAB_LABELS.map((label, index) => (
          <button
            key={label}
            onClick={() => handleTabChange(index)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              color: currentTabIndex === index ? '#FFBD73' : '#999',
              cursor: 'pointer',
              padding: 8,
              fontSize: '0.75rem',
              fontWeight: currentTabIndex === index ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
