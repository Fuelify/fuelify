'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatHeight, formatWeight, weeklyWeightLabel, ageFromBirthdate, readGoals, readShopping, toUnitSystem, THEME_LABELS, THEME_PREFERENCES, type ThemePreference, PLAN_LABELS, readGroceryConfig, usZip, type Place } from '@fuelify/shared';
import { AUTH_DISABLED, useAuthStore, useHouseholdStore, useProfileStore, usePreferencesStore } from '@/lib/stores';
import { Icon, Logo, PageHeader, Segmented, Sheet } from '@/components/ui';
import { usePlan } from '@/features/premium/usePlan';
import { MealPlanSettings } from '@/features/meal-plan/MealPlanSettings';
import { GrocerySettings } from '@/features/grocery/GrocerySettings';
import { LocationField } from '@/features/profile/LocationField';
import { ProfilePhoto } from '@/features/profile/ProfilePhoto';

// The Flutter Profile tab was a placeholder; this surfaces the profile and
// onboarding answers, units, household and account actions.
export default function ProfilePage() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const removeAvatar = useProfileStore((s) => s.removeAvatar);
  const setUnits = useProfileStore((s) => s.setUnits);
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const email = useAuthStore((s) => s.email);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const signOut = useAuthStore((s) => s.signOut);
  const households = useHouseholdStore((s) => s.households);
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const members = useHouseholdStore((s) => s.members);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);

  const plan = usePlan();
  const planLabel = plan.plan ? PLAN_LABELS[plan.plan] : '…';

  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
    ensureHousehold();
  }, [fetchProfile, ensureHousehold]);

  const units = toUnitSystem(profile?.units);
  const goals = readGoals(profile);
  const shopping = readShopping(profile);
  const habits = goals.habits ?? {};
  const household = households.find((h) => h.id === activeHouseholdId);
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  const age = profile?.birthdate ? ageFromBirthdate(profile.birthdate) : null;

  const handleSignOut = async () => {
    await signOut();
    router.replace(AUTH_DISABLED ? '/' : '/login');
  };

  return (
    <>
      <PageHeader title="Profile" />
      <div className="screen-scroll">
        <div className="screen-pad stack" style={{ paddingTop: 4, paddingBottom: 32 }}>
          {/* Identity */}
          <div className="card row" style={{ gap: 14 }}>
            <ProfilePhoto />
            <div className="grow">
              <div className="h2 truncate">{fullName || 'Your profile'}</div>
              <div className="small muted truncate">{isAnonymous ? 'Guest account' : email ?? ''}</div>
              {profile?.location && <div className="small faint truncate">{profile.location}</div>}
            </div>
            <button className="icon-btn icon-btn-filled" aria-label="Edit profile" onClick={() => setEditOpen(true)}>
              <Icon name="edit" size={18} />
            </button>
          </div>

          {isAnonymous && (
            <Link href="/registration" className="card row" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary)', gap: 12 }}>
              <span style={{ color: 'var(--primary)' }}><Icon name="user" /></span>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>Create an account</div>
                <div className="small muted">You&apos;re using a guest account. Add an email to keep your data across devices.</div>
              </div>
              <Icon name="chevronRight" />
            </Link>
          )}

          {/* Plan (shared by the household; owner switches it) */}
          <div className="card stack-sm">
            <Link href="/premium" className="row" style={{ gap: 12 }}>
              <span style={{ color: 'var(--primary)' }}><Icon name="sparkles" /></span>
              <div className="grow">
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{planLabel} plan</span>
                  {plan.premium && <span className="badge badge-premium">Premium</span>}
                </div>
                <div className="small muted">{plan.premium ? 'Auto-generated weekly meal plans are on.' : 'Upgrade for auto-generated weekly meal plans.'}</div>
              </div>
              <Icon name="chevronRight" />
            </Link>
            {plan.plan && plan.canChange && (
              <button
                className={`btn btn-block ${plan.premium ? 'btn-secondary' : 'btn-primary'}`}
                disabled={plan.busy}
                onClick={() => plan.setPlan(plan.premium ? 'standard' : 'premium')}
              >
                {plan.busy ? 'Saving…' : plan.premium ? 'Switch to Standard' : 'Upgrade to Premium'}
              </button>
            )}
            {plan.plan && !plan.canChange && <p className="hint">Your household owner manages the plan.</p>}
            {plan.error && <div className="alert" role="alert">{plan.error}</div>}
          </div>

          {/* Settings */}
          <div className="section-title"><span>Preferences</span></div>
          <div className="card stack-sm">
            <span className="label">Appearance</span>
            <Segmented<ThemePreference>
              options={THEME_PREFERENCES.map((t) => ({ value: t, label: THEME_LABELS[t] }))}
              value={theme}
              onChange={setTheme}
            />
            <span className="label" style={{ marginTop: 8 }}>Units</span>
            <Segmented
              options={[{ value: 'Imperial', label: 'Imperial' }, { value: 'Metric', label: 'Metric' }]}
              value={units}
              onChange={(v) => setUnits(v)}
            />
          </div>

          {/* Meal plan generator */}
          <div className="section-title">
            <span>Meal plan</span>
            {!plan.premium && plan.plan && <span className="badge badge-premium" style={{ textTransform: 'none', letterSpacing: 0 }}>Premium</span>}
          </div>
          <MealPlanSettings />

          {/* Grocery store connections */}
          <div className="section-title">
            <span>Grocery stores</span>
            {!plan.premium && plan.plan && <span className="badge badge-premium" style={{ textTransform: 'none', letterSpacing: 0 }}>Premium</span>}
          </div>
          <GrocerySettings />

          {/* Onboarding answers */}
          <div className="section-title">
            <span>Your answers</span>
            <Link href="/onboarding/profile" className="small" style={{ color: 'var(--primary)', textTransform: 'none', letterSpacing: 0 }}>
              {profile?.onboarded ? 'Update' : 'Finish setup'}
            </Link>
          </div>
          <div className="list">
            <Row label="Height" value={profile?.height ? formatHeight(profile.height, units) : null} />
            <Row label="Age" value={age !== null ? `${age}` : null} />
            <Row label="Gender" value={profile?.gender === 'Prefer to self describe' ? profile.genderDesc : profile?.gender} />
            <Row label="Diet" value={profile?.diet} />
            <Row label="Allergens" value={profile?.allergens?.length ? profile.allergens.join(', ') : profile?.onboarded ? 'None' : null} />
            <Row label="Primary goal" value={goals.primary} />
            <Row label="Weight" value={profile?.weight ? formatWeight(profile.weight, units) : null} />
            <Row label="Goal weight" value={goals.targetWeight ? formatWeight(goals.targetWeight, units) : null} />
            <Row label="Weekly goal" value={goals.weekly !== undefined ? weeklyWeightLabel(goals.weekly, units) : null} />
            <Row label="Activity" value={profile?.activeness} />
            <Row label="Calorie-sensitive" value={habits.calorieSensitive ? (habits.calorieSensitive.startsWith('Yes') ? 'Yes' : 'No') : null} />
            <Row label="Choosy eater" value={habits.choosyEater} />
            <Row label="Grocery budget" value={shopping.budget !== undefined ? `$${shopping.budget}/week` : null} />
          </div>

          {/* Household */}
          <div className="section-title">
            <span>Household</span>
            <Link href="/household" className="small" style={{ color: 'var(--primary)', textTransform: 'none', letterSpacing: 0 }}>Manage</Link>
          </div>
          <div className="card row" style={{ gap: 12 }}>
            <span style={{ color: 'var(--primary)' }}><Icon name="users" /></span>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>{household?.name ?? '—'}</div>
              <div className="small muted">{members.length === 1 ? '1 member shares' : `${members.length} members share`} the cart and pantry</div>
            </div>
          </div>

          {/* Account */}
          <div className="section-title"><span>Account</span></div>
          <div className="list">
            {!isAnonymous && (
              <button className="list-row" onClick={handleSignOut} style={{ color: 'var(--danger)' }}>
                <Icon name="logOut" size={20} /> <span className="grow">Sign out</span>
              </button>
            )}
            {isAnonymous && (
              <Link href="/login" className="list-row">
                <Icon name="logOut" size={20} /> <span className="grow">Log in to an existing account</span>
                <Icon name="chevronRight" size={18} />
              </Link>
            )}
          </div>
          <div className="stack-sm" style={{ alignItems: 'center', marginTop: 20, gap: 6 }}>
            <Logo size={26} />
            <p className="tiny faint">{planLabel} plan</p>
          </div>
        </div>
      </div>

      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', location: profile?.location ?? '' }}
        hasPhoto={!!profile?.imageUrl}
        onRemovePhoto={removeAvatar}
        onSave={async (v) => {
          // A picked US city also gives us a ZIP for nearby store prices, if none is set yet
          const grocery = readGroceryConfig(profile);
          const zip = usZip(v.place?.postcode);
          const ok = await updateProfile({
            firstName: v.firstName.trim() || null,
            lastName: v.lastName.trim() || null,
            location: v.location.trim() || null,
            ...(zip && !grocery.zipCode ? { groceryConfig: { ...(profile?.groceryConfig ?? {}), zipCode: zip } } : {}),
          });
          if (ok) setEditOpen(false);
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode | null | undefined }) {
  return (
    <div className="list-row" style={{ minHeight: 46 }}>
      <span className="small muted" style={{ width: 130, flexShrink: 0 }}>{label}</span>
      <span className="grow" style={{ fontWeight: 600, color: value ? undefined : 'var(--text-3)' }}>{value || 'Not set'}</span>
    </div>
  );
}

function EditProfileSheet({
  open,
  onClose,
  initial,
  onSave,
  hasPhoto,
  onRemovePhoto,
}: {
  open: boolean;
  onClose: () => void;
  initial: { firstName: string; lastName: string; location: string };
  onSave: (v: { firstName: string; lastName: string; location: string; place: Place | null }) => Promise<void>;
  hasPhoto: boolean;
  onRemovePhoto: () => Promise<boolean>;
}) {
  const [v, setV] = useState<{ firstName: string; lastName: string; location: string; place: Place | null }>({ ...initial, place: null });
  const [busy, setBusy] = useState(false);
  // Reset when the sheet opens
  useEffect(() => {
    if (open) setV({ ...initial, place: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      footer={
        <button className="btn btn-primary btn-block" disabled={busy}
          onClick={async () => { setBusy(true); await onSave(v); setBusy(false); }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="stack">
        <div className="field">
          <label htmlFor="ep-first">First name</label>
          <input id="ep-first" className="input" value={v.firstName} onChange={(e) => setV({ ...v, firstName: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="ep-last">Last name</label>
          <input id="ep-last" className="input" value={v.lastName} onChange={(e) => setV({ ...v, lastName: e.target.value })} />
        </div>
        <LocationField id="ep-loc" value={v.location} onChange={(location, place) => setV({ ...v, location, place })} />
        {hasPhoto && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }}
            onClick={async () => { if (window.confirm('Remove your profile picture?')) await onRemovePhoto(); }}>
            <Icon name="trash" size={16} /> Remove profile picture
          </button>
        )}
      </div>
    </Sheet>
  );
}
