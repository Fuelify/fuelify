'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HOUSEHOLD_SETUP_STEPS, isOwner, readShopping, selectActiveHousehold, sortMembers, type HouseholdSetupStep, type ShoppingPreferences } from '@fuelify/shared';
import { useAuthStore, useHouseholdStore } from '@/lib/stores';
import { Icon, LoadingBlock } from '@/components/ui';
import { AddMemberForm, HouseholdLocation, HouseholdName, MemberRow } from './HouseholdManager';
import { ShoppingPreferencesForm } from './ShoppingPreferencesForm';

const TITLES: Record<HouseholdSetupStep, { title: string; subtitle: string }> = {
  household: { title: 'Your household', subtitle: 'Everyone in it shares the meal plan, list, cart and pantry.' },
  shopping: { title: 'How your household shops', subtitle: 'Used to pick stores and keep the weekly cart on budget.' },
  members: { title: 'Who else lives with you?', subtitle: 'Add them now or later. They’ll share everything in the household.' },
};

/**
 * Household setup: done once per household, separate from each person's
 * onboarding. Any member can fill it in; finishing marks the household set up.
 */
export function HouseholdSetupScreen({ step }: { step: string }) {
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const household = useHouseholdStore(selectActiveHousehold);
  const members = useHouseholdStore((s) => s.members);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const fetchMembers = useHouseholdStore((s) => s.fetchMembers);
  const updateSettings = useHouseholdStore((s) => s.updateSettings);
  const [ready, setReady] = useState(false);
  const [shopping, setShopping] = useState<ShoppingPreferences>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    ensureHousehold().then(() => fetchMembers()).finally(() => setReady(true));
  }, [ensureHousehold, fetchMembers]);
  useEffect(() => {
    if (household) setShopping(readShopping(household));
    // Seed once per household
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  const sorted = useMemo(() => sortMembers(members), [members]);
  const index = HOUSEHOLD_SETUP_STEPS.indexOf(step as HouseholdSetupStep);
  if (index < 0) return null;
  if (!ready || !household) return <LoadingBlock />;
  if (done) return <Finished />;

  const key = step as HouseholdSetupStep;
  const total = HOUSEHOLD_SETUP_STEPS.length;
  const isLast = index === total - 1;
  const owner = isOwner(members, userId);
  const canContinue = key !== 'shopping' || (!!shopping.tendency && !!shopping.priceSensitivity);

  const next = async () => {
    setError(null);
    if (key === 'shopping') {
      setSaving(true);
      const ok = await updateSettings(household.id, { shopping: { ...household.shopping, ...shopping } });
      setSaving(false);
      if (!ok) return setError('Couldn’t save. Check your connection and try again.');
    }
    if (isLast) {
      setSaving(true);
      const ok = await updateSettings(household.id, { completeSetup: true });
      setSaving(false);
      if (!ok) return setError('Couldn’t save. Check your connection and try again.');
      setDone(true);
      return;
    }
    router.push(`/household-setup/${HOUSEHOLD_SETUP_STEPS[index + 1]}`);
  };

  return (
    <>
      <header className="page-header" style={{ paddingBottom: 6 }}>
        {index > 0 ? (
          <button className="icon-btn" aria-label="Back" onClick={() => router.push(`/household-setup/${HOUSEHOLD_SETUP_STEPS[index - 1]}`)}>
            <Icon name="chevronLeft" />
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
        <div className="grow stack-sm" style={{ gap: 6 }}>
          <div className="row-between tiny faint" style={{ fontWeight: 600 }}>
            <span>Household · step {index + 1} of {total}</span>
            <span>{Math.round(((index + 1) / total) * 100)}%</span>
          </div>
          <div className="progress"><div style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
        </div>
        <Link href="/home" className="btn btn-ghost btn-sm">Later</Link>
      </header>

      <div className="screen-scroll">
        <div className="screen-pad stack-lg" style={{ paddingTop: 8, paddingBottom: 24 }}>
          <div className="stack-sm">
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{TITLES[key].title}</h2>
            <p className="muted">{TITLES[key].subtitle}</p>
          </div>

          {key === 'household' && (
            <div className="stack-lg">
              <HouseholdName householdId={household.id} name={household.name} editable={owner} />
              <HouseholdLocation household={household} />
            </div>
          )}

          {key === 'shopping' && <ShoppingPreferencesForm value={shopping} onChange={(patch) => setShopping((s) => ({ ...s, ...patch }))} />}

          {key === 'members' && (
            <div className="stack-lg">
              <div className="list">
                {sorted.map((m) => <MemberRow key={m.id} member={m} isSelf={m.userId === userId} canRemove={false} />)}
              </div>
              {owner ? <AddMemberForm /> : <p className="hint">Only the household owner can add members.</p>}
            </div>
          )}
        </div>
      </div>

      <div className="screen-footer stack-sm">
        {error && <div className="alert" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" onClick={next} disabled={!canContinue || saving}>
          {saving ? 'Saving…' : isLast ? 'Finish' : 'Continue'}
        </button>
      </div>
    </>
  );
}

function Finished() {
  return (
    <div className="center-fill" style={{ gap: 16, padding: 24, textAlign: 'center' }}>
      <div style={{ animation: 'pop 0.5s ease', color: 'var(--primary)', display: 'flex' }} aria-hidden="true"><Icon name="checkCircle" size={72} /></div>
      <h2 style={{ fontSize: 26, fontWeight: 800 }}>Your household is ready</h2>
      <p className="muted" style={{ maxWidth: 320 }}>You can change any of this from Profile → Household.</p>
      <Link href="/plan" className="btn btn-primary btn-lg" style={{ marginTop: 8, minWidth: 220 }}>Go to my plan</Link>
      <Link href="/home" className="btn btn-ghost">Go to home</Link>
    </div>
  );
}
