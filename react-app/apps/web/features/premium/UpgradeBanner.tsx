'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  HIGHLIGHTED_PREMIUM_FEATURE,
  UPGRADE_PROMO_ID,
  UPGRADE_PROMO_SNOOZE_DAYS,
  isPremium,
  isSnoozed,
} from '@fuelify/shared';
import { usePreferencesStore, useProfileStore } from '@/lib/stores';
import { Icon } from '@/components/ui';

/**
 * Upgrade prompt for Free-plan users, leading with auto-generated weekly
 * meal plans. Hidden for Premium users and for a week after "Not now".
 */
export function UpgradeBanner({ style }: { style?: React.CSSProperties }) {
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const dismissedAt = usePreferencesStore((s) => s.dismissedAt[UPGRADE_PROMO_ID]);
  const dismiss = usePreferencesStore((s) => s.dismiss);

  useEffect(() => {
    if (!profile) fetchProfile();
  }, [profile, fetchProfile]);

  // Wait for the profile so Premium users never see a flash of the banner
  if (!profile || isPremium(profile) || isSnoozed(dismissedAt, UPGRADE_PROMO_SNOOZE_DAYS)) return null;

  return (
    <aside className="promo" aria-label="Upgrade to Premium" style={style}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12, padding: '14px 6px 14px 14px', position: 'relative', zIndex: 1 }}>
        <span
          style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-hidden="true"
        >
          <Icon name="sparkles" size={22} />
        </span>
        <div className="grow stack-sm" style={{ gap: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.25 }}>Let Premium plan your week</div>
          <p className="small promo-sub">{HIGHLIGHTED_PREMIUM_FEATURE.title}, built around your goals, diet and pantry.</p>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <Link href="/premium" className="btn btn-sm btn-promo">
              Upgrade to Premium
            </Link>
            <button className="btn btn-sm btn-ghost" style={{ color: 'rgba(255,255,255,0.88)' }} onClick={() => dismiss(UPGRADE_PROMO_ID)}>
              Not now
            </button>
          </div>
        </div>
        <button className="icon-btn" aria-label="Dismiss" onClick={() => dismiss(UPGRADE_PROMO_ID)} style={{ width: 32, height: 32 }}>
          <Icon name="x" size={18} />
        </button>
      </div>
    </aside>
  );
}
