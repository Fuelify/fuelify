'use client';

import { useRouter } from 'next/navigation';
import { PREMIUM_FEATURES } from '@fuelify/shared';
import { Icon, LogoMark, PageHeader, type IconName } from '@/components/ui';
import { usePlan } from '@/features/premium/usePlan';

const FEATURE_ICONS: Record<string, IconName> = {
  'auto-weekly-plans': 'calendar',
  'pantry-aware': 'pantry',
  'auto-shopping-list': 'cart',
  'unlimited-ideas': 'sparkles',
};

// Premium plan overview. Billing isn't wired up yet, so upgrading switches the
// household's plan directly (no payment step).
export default function PremiumPage() {
  const router = useRouter();
  const { plan, premium, canChange, setPlan, busy, error } = usePlan();

  return (
    <>
      <PageHeader
        title="Premium"
        left={
          <button className="icon-btn" aria-label="Back" onClick={() => router.back()}>
            <Icon name="chevronLeft" />
          </button>
        }
      />
      <div className="screen-scroll">
        <div className="screen-pad stack-lg" style={{ paddingTop: 4, paddingBottom: 24 }}>
          <section className="promo">
            <div className="stack-sm center" style={{ padding: '24px 18px', position: 'relative', zIndex: 1, alignItems: 'center' }}>
              <span style={{ background: '#fff', borderRadius: 18, padding: 8, display: 'inline-flex' }}><LogoMark size={48} /></span>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>Fuelify Premium</h2>
              <p className="promo-sub">Stop planning meals. Fuelify builds your week for you, so you just shop and cook.</p>
            </div>
          </section>

          <section className="stack-sm" aria-label="What you get">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f.id} className="card row" style={{ alignItems: 'flex-start', gap: 12, borderColor: f.highlight ? 'var(--primary)' : undefined }}>
                <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={FEATURE_ICONS[f.id] ?? 'check'} size={20} />
                </span>
                <div className="grow">
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>{f.title}</span>
                    {f.highlight && <span className="badge badge-premium" style={{ flexShrink: 0 }}>Featured</span>}
                  </div>
                  <p className="small muted" style={{ marginTop: 2 }}>{f.body}</p>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      <div className="screen-footer stack-sm">
        {error && <div className="alert" role="alert">{error}</div>}
        {premium ? (
          <div className="alert alert-info center">Your household is on Premium. Enjoy your auto-planned weeks!</div>
        ) : !canChange ? (
          <p className="hint center">{plan ? 'Only the household owner can upgrade the plan.' : 'Loading your plan…'}</p>
        ) : (
          <>
            <button className="btn btn-primary btn-lg btn-block" disabled={busy || !plan} onClick={() => setPlan('premium')}>
              {busy ? 'Upgrading…' : 'Upgrade to Premium'}
            </button>
            <p className="hint center">Free while we&apos;re in early access. Applies to everyone in your household.</p>
          </>
        )}
      </div>
    </>
  );
}
